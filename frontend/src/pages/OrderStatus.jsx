import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { Clock, CheckCircle, ChefHat, Home } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderStatus = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();

    // Connect to WebSocket for real-time updates
    const socket = io(BACKEND_URL);
    socket.emit('join', 'customer');

    socket.on('order_status_update', (data) => {
      if (data.order && data.order.id === orderId) {
        setOrder(prev => ({ ...prev, ...data.order }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status) => {
    const steps = ['received', 'preparing', 'ready', 'served'];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="customer-app min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="customer-app min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Order not found</h2>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-orange-500 text-white rounded-full font-medium hover:bg-orange-600 transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const currentStep = getStatusStep(order.status);

  return (
    <div className="customer-app min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Order Status</h1>
          <p className="text-lg">Table {order.table_number}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Timeline */}
        <div className="bg-white rounded-xl shadow-lg shadow-orange-500/10 p-6 mb-6">
          <div className="space-y-6">
            {/* Received */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStep >= 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                <CheckCircle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">Order Received</h3>
                <p className="text-sm text-gray-600">Your order has been received by the kitchen</p>
              </div>
            </div>

            {currentStep >= 0 && currentStep < 4 && <div className="h-12 w-0.5 bg-orange-200 ml-6"></div>}

            {/* Preparing */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-green-500 text-white' : currentStep === 0 ? 'bg-yellow-500 text-white animate-pulse' : 'bg-gray-200 text-gray-400'
              }`}>
                <ChefHat size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">Preparing</h3>
                <p className="text-sm text-gray-600">Our chef is preparing your delicious meal</p>
              </div>
            </div>

            {currentStep >= 1 && currentStep < 4 && <div className="h-12 w-0.5 bg-orange-200 ml-6"></div>}

            {/* Ready */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-green-500 text-white' : currentStep === 1 ? 'bg-yellow-500 text-white animate-pulse' : 'bg-gray-200 text-gray-400'
              }`}>
                <Clock size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">Ready</h3>
                <p className="text-sm text-gray-600">Your order is ready to be served</p>
              </div>
            </div>

            {currentStep >= 2 && currentStep < 4 && <div className="h-12 w-0.5 bg-orange-200 ml-6"></div>}

            {/* Served */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStep >= 3 ? 'bg-green-500 text-white' : currentStep === 2 ? 'bg-yellow-500 text-white animate-pulse' : 'bg-gray-200 text-gray-400'
              }`}>
                <CheckCircle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">Served</h3>
                <p className="text-sm text-gray-600">Enjoy your meal!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-xl shadow-lg shadow-orange-500/10 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Order Details</h2>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-gray-500 ml-2">x {item.quantity}</span>
                </div>
                <span className="font-bold text-orange-500">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 flex justify-between text-xl font-bold">
              <span className="text-slate-800">Total</span>
              <span className="text-orange-500">₹{order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {order.special_instructions && (
          <div className="bg-orange-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-slate-700 mb-1">Special Instructions:</p>
            <p className="text-gray-600">{order.special_instructions}</p>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 bg-orange-500 text-white rounded-full font-bold text-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Home size={20} />
          Back to Menu
        </button>
      </div>
    </div>
  );
};

export default OrderStatus;