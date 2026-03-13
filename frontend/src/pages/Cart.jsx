import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Cart = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [tableNumber, setTableNumber] = useState(1);

  // Load cart using session
  useEffect(() => {
    let session = localStorage.getItem("customerSession");

    if (!session) {
      session = crypto.randomUUID();
      localStorage.setItem("customerSession", session);
    }

    const savedCart = localStorage.getItem(`cart_${session}`);
    const savedTable = localStorage.getItem("tableNumber");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    if (savedTable) {
      setTableNumber(parseInt(savedTable));
    }
  }, []);

  const updateCart = (newCart) => {
    setCart(newCart);

    const session = localStorage.getItem("customerSession");

    localStorage.setItem(`cart_${session}`, JSON.stringify(newCart));
  };

  const updateQuantity = (itemId, delta) => {
    const newCart = cart
      .map((item) => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
        }
        return item;
      })
      .filter(Boolean);

    updateCart(newCart);
  };

  const removeItem = (itemId) => {
    const newCart = cart.filter((item) => item.id !== itemId);
    updateCart(newCart);
    toast.success("Item removed");
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const session = localStorage.getItem("customerSession");

    setLoading(true);

    try {
      const orderData = {
        table_number: tableNumber,
        customer_session: session,   // ✅ REQUIRED BY BACKEND
        items: cart.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          special_instructions: null,
        })),
        special_instructions: specialInstructions || null,
      };

      const response = await axios.post(`${API}/orders`, orderData);

      toast.success("Order placed!");

      localStorage.removeItem(`cart_${session}`);

      navigate(`/order/${response.data.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = total * 0.05;
  const grandTotal = total + tax;

  if (cart.length === 0) {
    return (
      <div className="customer-app min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Your cart is empty
          </h2>

          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-app min-h-screen pb-32">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={24} />
          </button>

          <h1 className="text-2xl font-bold text-slate-800">Your Cart</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Items */}
        <div className="space-y-4 mb-6">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow p-4 flex gap-4"
            >
              <img
                src={item.image_url}
                alt={item.name}
                className="w-24 h-24 object-cover rounded-lg"
              />

              <div className="flex-1">
                <h3 className="text-lg font-bold">{item.name}</h3>

                <p className="text-orange-500 font-bold">₹{item.price}</p>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center"
                  >
                    <Minus size={16} />
                  </button>

                  <span className="font-bold w-8 text-center">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <label className="block text-sm font-medium mb-2">
            Special Instructions
          </label>

          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special requests..."
            className="w-full px-4 py-3 border rounded-xl"
            rows={3}
          />
        </div>

        {/* Bill */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Bill Summary</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>

            <div className="border-t pt-3 flex justify-between font-bold text-xl">
              <span>Total</span>
              <span className="text-orange-500">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={placeOrder}
            disabled={loading}
            className="w-full py-4 bg-orange-500 text-white rounded-full font-bold text-lg hover:bg-orange-600 disabled:bg-gray-300"
          >
            {loading ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;