import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, ShoppingBag, Users, Menu, QrCode, LogOut } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-panel min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="admin-panel min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Today's Revenue</h3>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="text-green-500" size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">₹{analytics?.today_revenue?.toFixed(2) || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Today's Orders</h3>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="text-orange-500" size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{analytics?.today_orders || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Completed Orders</h3>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="text-blue-500" size={24} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{analytics?.completed_orders || 0}</p>
          </div>
        </div>

        {/* Most Ordered Items */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-orange-500" size={24} />
            <h2 className="text-2xl font-bold text-slate-800">Most Ordered Items</h2>
          </div>
          <div className="space-y-4">
            {analytics?.most_ordered_items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-slate-800">{item.name}</span>
                </div>
                <span className="text-orange-500 font-bold">{item.count} orders</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/admin/menu')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                  <Menu className="text-orange-500" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Manage Menu</h3>
                <p className="text-gray-600">Add, edit, or remove menu items</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/tables')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <QrCode className="text-blue-500" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Manage Tables</h3>
                <p className="text-gray-600">Generate QR codes for tables</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;