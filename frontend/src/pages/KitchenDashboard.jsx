import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import io from 'socket.io-client';
import { toast } from 'sonner';
import { Clock, ChefHat, CheckCircle, Filter } from 'lucide-react';

const WS_URL = "ws://127.0.0.1:8000/api/ws/kitchen";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
  fetchOrders();

  const socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("Kitchen WebSocket connected");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "new_order") {
      setOrders(prev => [data.order, ...prev]);
    }

    if (data.type === "order_status_update") {
      setOrders(prev =>
        prev.map(o => (o.id === data.order.id ? data.order : o))
      );
    }
  };

  socket.onclose = () => {
    console.log("Kitchen WebSocket disconnected");
  };

  return () => socket.close();
}, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, { status: newStatus });
      toast.success('Order status updated');
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'received':
        return 'border-blue-500 bg-blue-50';
      case 'preparing':
        return 'border-yellow-500 bg-yellow-50';
      case 'ready':
        return 'border-green-500 bg-green-50';
      case 'served':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getElapsedTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diff = Math.floor((now - created) / 1000 / 60);
    return diff;
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return order.status !== 'served';
    if (filter === 'pending') return order.status === 'received';
    if (filter === 'preparing') return order.status === 'preparing';
    if (filter === 'ready') return order.status === 'ready';
    if (filter === 'completed') return order.status === 'served';
    return true;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div className="kitchen-dashboard min-h-screen">
      {/* Header */}
      <div className="bg-slate-800 shadow-lg sticky top-0 z-10">
        <div className="px-6 py-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ChefHat size={32} />
            Kitchen Display System
          </h1>
        </div>
        
        {/* Filter Bar */}
        <div className="px-6 pb-4 flex gap-3 overflow-x-auto">
          {['all', 'pending', 'preparing', 'ready', 'completed'].map((f) => (
            <button
              key={f}
              data-testid={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="p-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">No orders to display</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const elapsed = getElapsedTime(order.created_at);
              const isLate = elapsed > 15;
              
              return (
                <div
                  key={order.id}
                  data-testid={`order-card-${order.id}`}
                  className={`rounded-xl border-l-4 ${
                    getStatusColor(order.status)
                  } ${isLate && order.status !== 'served' ? 'animate-pulse' : ''} bg-slate-800 shadow-xl p-4 transition-all hover:scale-105`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Table {order.table_number}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={16} className={isLate ? 'text-red-400' : 'text-gray-400'} />
                        <span className={`text-sm ${isLate ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                          {elapsed} min ago
                        </span>
                      </div>
                    </div>
                    <span className="text-orange-500 font-bold text-lg">₹{order.total_amount}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-white">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-orange-400">x {item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Special Instructions */}
                  {order.special_instructions && (
                    <div className="bg-slate-700 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-400 mb-1">Special Instructions:</p>
                      <p className="text-sm text-white">{order.special_instructions}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {order.status === 'received' && (
                      <button
                        data-testid={`start-preparing-${order.id}`}
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="w-full py-3 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition-colors"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        data-testid={`mark-ready-${order.id}`}
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors"
                      >
                        Mark as Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        data-testid={`mark-served-${order.id}`}
                        onClick={() => updateOrderStatus(order.id, 'served')}
                        className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                      >
                        Mark as Served
                      </button>
                    )}
                    {order.status === 'served' && (
                      <div className="flex items-center justify-center gap-2 text-green-400 font-bold">
                        <CheckCircle size={20} />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;