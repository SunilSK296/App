import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, ArrowLeft, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminTables = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/tables`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTables(response.data);
    } catch (error) {
      toast.error('Failed to load tables');
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/tables?table_number=${tableNumber}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Table created successfully!');
      setTableNumber('');
      fetchTables();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = (table) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${table.qr_code}`;
    link.download = `table_${table.table_number}_qr.png`;
    link.click();
  };

  return (
    <div className="admin-panel min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Table Management</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Create Table Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Create New Table</h2>
          <form onSubmit={handleCreateTable} className="flex gap-4">
            <input
              type="number"
              data-testid="table-number-input"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Enter table number"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <button
              type="submit"
              data-testid="create-table-button"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300"
            >
              <Plus size={20} />
              {loading ? 'Creating...' : 'Create Table'}
            </button>
          </form>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <div key={table.id} data-testid={`table-card-${table.table_number}`} className="bg-white rounded-xl shadow-lg p-6">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-slate-800 mb-4">Table {table.table_number}</h3>
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
                  <img
                    src={`data:image/png;base64,${table.qr_code}`}
                    alt={`QR Code for Table ${table.table_number}`}
                    className="w-full h-auto"
                  />
                </div>
                <button
                  onClick={() => downloadQR(table)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Download size={20} />
                  Download QR Code
                </button>
              </div>
            </div>
          ))}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No tables created yet. Create your first table above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTables;