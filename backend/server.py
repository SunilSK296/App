from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import qrcode
from io import BytesIO
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "kitchen": set(),
            "admin": set(),
            "customer": set()
        }

    async def connect(self, websocket: WebSocket, client_type: str):
        await websocket.accept()
        self.active_connections[client_type].add(websocket)

    def disconnect(self, websocket: WebSocket, client_type: str):
        self.active_connections[client_type].discard(websocket)

    async def broadcast(self, message: dict, client_type: str):
        for connection in self.active_connections[client_type]:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key')

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    role: str  # admin, chef
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    username: str
    password: str

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: str
    is_available: bool = True
    is_vegetarian: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: str
    is_available: bool = True
    is_vegetarian: bool = False

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_number: int
    qr_code: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderItem(BaseModel):
    menu_item_id: str
    quantity: int
    special_instructions: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    table_number: int
    customer_session: str
    items: List[Dict]
    total_amount: float
    status: str = "received"
    special_instructions: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    table_number: int
    customer_session: str
    items: List[OrderItem]
    special_instructions: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

# Helper functions
def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def generate_qr_code(table_number: int) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)


    # Link to frontend menu page
    frontend_url = os.environ.get(
        "FRONTEND_URL",
        "https://app-seven-eta-34.vercel.app"
    )

    data = f"{frontend_url}/table/{table_number}"

    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffered = BytesIO()
    img.save(buffered, format="PNG")

    return base64.b64encode(buffered.getvalue()).decode()

# WebSocket endpoint
@app.websocket("/api/ws/{client_type}")
async def websocket_endpoint(websocket: WebSocket, client_type: str):
    await manager.connect(websocket, client_type)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type)

# Auth endpoints
@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or user["password"] != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    return {"token": token, "role": user["role"], "username": user["username"]}

@app.post("/api/auth/register")
async def register(user: User):
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    return {"message": "User created successfully"}

# Menu endpoints
@app.get("/api/menu", response_model=List[MenuItem])
async def get_menu():
    items = await db.menu_items.find({}, {"_id": 0}).to_list(1000)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@app.get("/api/menu/categories")
async def get_categories():
    items = await db.menu_items.find({}, {"_id": 0, "category": 1}).to_list(1000)
    categories = list(set([item["category"] for item in items if "category" in item]))
    return {"categories": categories}

@app.post("/api/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItemCreate, user=Depends(verify_token)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create menu items")
    
    menu_item = MenuItem(**item.model_dump())
    item_dict = menu_item.model_dump()
    item_dict['created_at'] = item_dict['created_at'].isoformat()
    await db.menu_items.insert_one(item_dict)
    return menu_item

@app.put("/api/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, item: MenuItemCreate, user=Depends(verify_token)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update menu items")
    
    result = await db.menu_items.update_one(
        {"id": item_id},
        {"$set": item.model_dump()}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    updated_item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(updated_item.get('created_at'), str):
        updated_item['created_at'] = datetime.fromisoformat(updated_item['created_at'])
    return MenuItem(**updated_item)

@app.delete("/api/menu/{item_id}")
async def delete_menu_item(item_id: str, user=Depends(verify_token)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete menu items")
    
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# Table endpoints
@app.post("/api/tables", response_model=Table)
async def create_table(table_number: int, user=Depends(verify_token)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create tables")
    
    existing = await db.tables.find_one({"table_number": table_number})
    if existing:
        raise HTTPException(status_code=400, detail="Table already exists")
    
    qr_code = generate_qr_code(table_number)
    table = Table(table_number=table_number, qr_code=qr_code)
    table_dict = table.model_dump()
    table_dict['created_at'] = table_dict['created_at'].isoformat()
    await db.tables.insert_one(table_dict)
    return table

@app.get("/api/tables", response_model=List[Table])
async def get_tables(user=Depends(verify_token)):
    tables = await db.tables.find({}, {"_id": 0}).to_list(1000)
    for table in tables:
        if isinstance(table.get('created_at'), str):
            table['created_at'] = datetime.fromisoformat(table['created_at'])
    return tables

# Order endpoints
@app.post("/api/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    # Get menu items to calculate total
    item_ids = [item.menu_item_id for item in order_data.items]
    menu_items = await db.menu_items.find({"id": {"$in": item_ids}}, {"_id": 0}).to_list(1000)
    
    menu_dict = {item["id"]: item for item in menu_items}
    
    total_amount = 0
    order_items = []
    for item in order_data.items:
        if item.menu_item_id not in menu_dict:
            raise HTTPException(status_code=404, detail=f"Menu item {item.menu_item_id} not found")
        
        menu_item = menu_dict[item.menu_item_id]
        total_amount += menu_item["price"] * item.quantity
        order_items.append({
            "menu_item_id": item.menu_item_id,
            "name": menu_item["name"],
            "price": menu_item["price"],
            "quantity": item.quantity,
            "special_instructions": item.special_instructions
        })
    
    order = Order(
        table_number=order_data.table_number,
        customer_session=order_data.customer_session,
        items=order_items,
        total_amount=total_amount,
        special_instructions=order_data.special_instructions
    )
    
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    await db.orders.insert_one(order_dict)
    
    # Broadcast to kitchen
    await manager.broadcast({"type": "new_order", "order": order_dict}, "kitchen")
    
    return order

@app.get("/api/orders", response_model=List[Order])
async def get_orders(status_filter: Optional[str] = None):
    query = {}
    if status_filter:
        query["status"] = status_filter
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", 1).to_list(1000)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return orders

@app.get("/api/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if isinstance(order.get('updated_at'), str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    return Order(**order)

@app.put("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status_update.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})

    if isinstance(order.get("created_at"), str):
        order["created_at"] = datetime.fromisoformat(order["created_at"])
        
    if isinstance(order.get("updated_at"), str):
        order["updated_at"] = datetime.fromisoformat(order["updated_at"])
    
    # Broadcast to all clients
    await manager.broadcast({"type": "order_status_update", "order": order}, "kitchen")
    await manager.broadcast({"type": "order_status_update", "order": order}, "customer")
    await manager.broadcast({"type": "order_status_update", "order": order}, "admin")
    
    return {"message": "Order status updated", "order": order}

# Analytics endpoints
@app.get("/api/analytics/dashboard")
async def get_dashboard_analytics(user=Depends(verify_token)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view analytics")
    
    # Get today's orders
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today.isoformat()
    
    orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    
    today_orders = [o for o in orders if isinstance(o.get('created_at'), str) and o['created_at'] >= today_str]
    
    total_revenue = sum([o["total_amount"] for o in today_orders])
    total_orders = len(today_orders)
    completed_orders = len([o for o in today_orders if o["status"] == "served"])
    
    # Most ordered items
    item_count = {}
    for order in orders:
        for item in order["items"]:
            item_name = item["name"]
            item_count[item_name] = item_count.get(item_name, 0) + item["quantity"]
    
    most_ordered = sorted(item_count.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "today_revenue": total_revenue,
        "today_orders": total_orders,
        "completed_orders": completed_orders,
        "most_ordered_items": [{"name": name, "count": count} for name, count in most_ordered]
    }

# AI Recommendations
@app.get("/api/ai/recommendations")
async def get_ai_recommendations():
    # Simple fallback recommendations
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)

    item_count = {}
    for order in orders:
        for item in order.get("items", []):
            name = item["name"]
            item_count[name] = item_count.get(name, 0) + item["quantity"]

    most_ordered = sorted(item_count.items(), key=lambda x: x[1], reverse=True)[:3]

    return {
        "recommendations": "Chef recommends our most popular dishes!",
        "most_ordered": [{"name": name, "orders": count} for name, count in most_ordered]
    }

@app.delete("/api/tables/{table_number}")
async def delete_table(table_number: int, user=Depends(verify_token)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete tables")

    result = await db.tables.delete_one({"table_number": table_number})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")

    return {"message": f"Table {table_number} deleted successfully"}

# Initialize default admin user
@app.on_event("startup")
async def startup_event():
    admin = await db.users.find_one({"username": "admin"})
    if not admin:
        default_admin = User(
            username="admin",
            password=os.environ.get('ADMIN_DEFAULT_PASSWORD', 'admin123'),
            role="admin"
        )
        admin_dict = default_admin.model_dump()
        admin_dict['created_at'] = admin_dict['created_at'].isoformat()
        await db.users.insert_one(admin_dict)
        logging.info("Default admin user created")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
