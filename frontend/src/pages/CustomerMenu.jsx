import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ShoppingCart, Search, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerMenu = () => {
  const { tableNumber } = useParams();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [tableNum, setTableNum] = useState(tableNumber || 1);

  useEffect(() => {
    fetchMenu();
    fetchCategories();
    fetchRecommendations();
    // Load cart from localStorage
    const session = localStorage.getItem("customerSession");
   const savedCart = localStorage.getItem(`cart_${session}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menu`);
      setMenuItems(response.data);
    } catch (error) {
      toast.error('Failed to load menu');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/menu/categories`);
      setCategories(['All', ...response.data.categories]);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`${API}/ai/recommendations`);
      setRecommendations(response.data);
    } catch (error) {
      console.error('Failed to load recommendations');
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(c => c.id === item.id);
    let newCart;
    if (existingItem) {
      newCart = cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
    } else {
      newCart = [...cart, { ...item, quantity: 1 }];
    }
    setCart(newCart);
    const session = localStorage.getItem("customerSession") || crypto.randomUUID();
    localStorage.setItem("customerSession", session);
    localStorage.setItem(`cart_${session}`, JSON.stringify(newCart));
    localStorage.setItem('tableNumber', tableNum);
    toast.success(`${item.name} added to cart!`);
  };

  const filteredItems = menuItems
    .filter(item => selectedCategory === 'All' || item.category === selectedCategory)
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase()));

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="customer-app page-transition">
      {/* Hero Section */}
      <div className="relative h-48 bg-gradient-to-r from-orange-500 to-red-500 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1767785990437-dfe1fe516fe8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBjaGVmJTIwY29va2luZyUyMGZvb2QlMjBpbiUyMHJlc3RhdXJhbnQlMjBraXRjaGVufGVufDB8fHx8MTc3MjgwMDIwNXww&ixlib=rb-4.1.0&q=85"
          alt="Restaurant"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Smart Dining</h1>
          <p className="text-lg mt-2">Table {tableNum}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-4 bg-white shadow-md">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              data-testid="menu-search-input"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations && recommendations.most_ordered && recommendations.most_ordered.length > 0 && (
        <div className="px-4 py-6 bg-orange-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-orange-500" size={24} />
              <h2 className="text-2xl font-bold text-slate-800">Trending Today</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {recommendations.most_ordered.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl shadow-sm text-center">
                  <div className="text-2xl font-bold text-orange-500">{item.orders}</div>
                  <div className="text-sm text-gray-600 truncate">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="px-4 py-4 overflow-x-auto" data-testid="category-filter">
        <div className="flex gap-3 max-w-4xl mx-auto">
          {categories.map((category) => (
            <button
              key={category}
              data-testid={`category-${category.toLowerCase()}`}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-orange-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              data-testid={`menu-item-${item.id}`}
              className="bg-white rounded-xl shadow-lg shadow-orange-500/10 overflow-hidden hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-slate-800">{item.name}</h3>
                  {item.is_vegetarian && (
                    <span className="text-green-500 text-xs font-semibold px-2 py-1 bg-green-50 rounded">VEG</span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-500">₹{item.price}</span>
                  <button
                    data-testid={`add-to-cart-${item.id}`}
                    onClick={() => addToCart(item)}
                    disabled={!item.is_available}
                    className={`px-6 py-2 rounded-full font-medium transition-all btn-press ${
                      item.is_available
                        ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {item.is_available ? 'Add' : 'Unavailable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div
          data-testid="floating-cart-button"
          className="fixed bottom-6 left-4 right-4 bg-orange-500 text-white rounded-full shadow-2xl shadow-orange-500/30 p-4 flex items-center justify-between max-w-4xl mx-auto cursor-pointer hover:bg-orange-600 transition-all"
          onClick={() => navigate('/cart')}
        >
          <div className="flex items-center gap-3">
            <ShoppingCart size={24} />
            <div>
              <div className="text-sm font-medium">{cartCount} items</div>
              <div className="text-xl font-bold">₹{cartTotal.toFixed(2)}</div>
            </div>
          </div>
          <button className="bg-white text-orange-500 px-6 py-2 rounded-full font-bold hover:bg-orange-50 transition-colors">
            View Cart
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;