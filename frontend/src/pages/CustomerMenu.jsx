import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { ShoppingCart, Search, Sparkles } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerMenu = () => {

  const { tableNumber } = useParams();
  const navigate = useNavigate();

  const [menuItems,setMenuItems] = useState([]);
  const [categories,setCategories] = useState([]);
  const [selectedCategory,setSelectedCategory] = useState("All");
  const [cart,setCart] = useState([]);
  const [searchQuery,setSearchQuery] = useState("");
  const [recommendations,setRecommendations] = useState(null);

  const tableNum = tableNumber || 1;

  useEffect(()=>{

    // Ensure session exists
    let session = localStorage.getItem("customerSession");

    if(!session){
      session = crypto.randomUUID();
      localStorage.setItem("customerSession",session);
    }

    // Load cart from session
    const savedCart = localStorage.getItem(`cart_${session}`);

    if(savedCart){
      setCart(JSON.parse(savedCart));
    }

    // Save table number
    localStorage.setItem("tableNumber",tableNum);

    fetchMenu();
    fetchCategories();
    fetchRecommendations();

  },[]);

  const fetchMenu = async ()=>{

    try{

      const response = await axios.get(`${API}/menu`);

      setMenuItems(response.data);

    }catch{

      toast.error("Failed to load menu");

    }

  };

  const fetchCategories = async ()=>{

    try{

      const response = await axios.get(`${API}/menu/categories`);

      setCategories(["All",...response.data.categories]);

    }catch{

      console.error("Failed to load categories");

    }

  };

  const fetchRecommendations = async ()=>{

    try{

      const response = await axios.get(`${API}/ai/recommendations`);

      setRecommendations(response.data);

    }catch{

      console.error("Failed to load recommendations");

    }

  };

  const addToCart = (item)=>{

    const existing = cart.find(c=>c.id===item.id);

    let newCart;

    if(existing){

      newCart = cart.map(c =>
        c.id===item.id ? {...c,quantity:c.quantity+1} : c
      );

    }else{

      newCart = [...cart,{...item,quantity:1}];

    }

    setCart(newCart);

    const session = localStorage.getItem("customerSession");

    localStorage.setItem(`cart_${session}`,JSON.stringify(newCart));

    toast.success(`${item.name} added to cart`);

  };

  const filteredItems = menuItems
    .filter(item =>
      selectedCategory==="All" || item.category===selectedCategory
    )
    .filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const cartCount = cart.reduce((sum,item)=>sum+item.quantity,0);

  const cartTotal = cart.reduce((sum,item)=>sum+item.price*item.quantity,0);

  return(

  <div className="customer-app">

    {/* Hero Section */}

    <div className="relative h-48 bg-gradient-to-r from-orange-500 to-red-500 overflow-hidden">

      <img
      src="https://images.unsplash.com/photo-1767785990437-dfe1fe516fe8"
      alt="restaurant"
      className="w-full h-full object-cover opacity-30"
      />

      <div className="absolute inset-0 flex flex-col justify-center items-center text-white">

        <h1 className="text-4xl font-bold">
        Smart Dining
        </h1>

        <p className="text-lg mt-2">
        Table {tableNum}
        </p>

      </div>

    </div>

    {/* Search */}

    <div className="px-4 py-4 bg-white shadow-md">

      <div className="max-w-4xl mx-auto relative">

        <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        size={20}
        />

        <input
        type="text"
        placeholder="Search dishes..."
        value={searchQuery}
        onChange={(e)=>setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500"
        />

      </div>

    </div>

    {/* Trending */}

    {recommendations && recommendations.most_ordered?.length>0 && (

      <div className="px-4 py-6 bg-orange-50">

        <div className="max-w-4xl mx-auto">

          <div className="flex items-center gap-2 mb-4">

            <Sparkles className="text-orange-500" size={24}/>

            <h2 className="text-2xl font-bold">
            Trending Today
            </h2>

          </div>

          <div className="grid grid-cols-3 gap-3">

            {recommendations.most_ordered.map((item,i)=>(

              <div key={i} className="bg-white p-3 rounded-xl text-center shadow">

                <div className="text-2xl font-bold text-orange-500">
                {item.orders}
                </div>

                <div className="text-sm text-gray-600 truncate">
                {item.name}
                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    )}

    {/* Categories */}

    <div className="px-4 py-4 overflow-x-auto">

      <div className="flex gap-3 max-w-4xl mx-auto">

        {categories.map(category => (

          <button
          key={category}
          onClick={()=>setSelectedCategory(category)}
          className={`px-6 py-2 rounded-full font-medium whitespace-nowrap
          ${selectedCategory===category
          ?"bg-orange-500 text-white"
          :"bg-white text-slate-700 hover:bg-orange-100"}`}
          >

          {category}

          </button>

        ))}

      </div>

    </div>

    {/* Menu */}

    <div className="px-4 py-6 max-w-4xl mx-auto">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {filteredItems.map(item => (

          <div
          key={item.id}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          >

            <div className="aspect-video overflow-hidden">

              <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              />

            </div>

            <div className="p-4">

              <div className="flex justify-between mb-2">

                <h3 className="text-xl font-bold">
                {item.name}
                </h3>

                {item.is_vegetarian &&

                <span className="text-green-500 text-xs font-semibold px-2 py-1 bg-green-50 rounded">
                VEG
                </span>

                }

              </div>

              <p className="text-gray-600 text-sm mb-3">
              {item.description}
              </p>

              <div className="flex items-center justify-between">

                <span className="text-2xl font-bold text-orange-500">
                ₹{item.price}
                </span>

                <button
                onClick={()=>addToCart(item)}
                disabled={!item.is_available}
                className={`px-6 py-2 rounded-full font-medium
                ${item.is_available
                ?"bg-orange-500 text-white hover:bg-orange-600"
                :"bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                >

                {item.is_available ? "Add" : "Unavailable"}

                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>

    {/* Floating Cart */}

    {cartCount>0 && (

      <div
      className="fixed bottom-6 left-4 right-4 bg-orange-500 text-white rounded-full shadow-2xl p-4 flex justify-between max-w-4xl mx-auto cursor-pointer"
      onClick={()=>navigate("/cart")}
      >

        <div className="flex items-center gap-3">

          <ShoppingCart size={24}/>

          <div>

            <div className="text-sm">
            {cartCount} items
            </div>

            <div className="text-xl font-bold">
            ₹{cartTotal.toFixed(2)}
            </div>

          </div>

        </div>

        <button className="bg-white text-orange-500 px-6 py-2 rounded-full font-bold">

        View Cart

        </button>

      </div>

    )}

  </div>

  );

};

export default CustomerMenu;