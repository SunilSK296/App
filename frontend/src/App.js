import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import CustomerMenu from "./pages/CustomerMenu";
import Cart from "./pages/Cart";
import OrderStatus from "./pages/OrderStatus";
import KitchenDashboard from "./pages/KitchenDashboard";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMenu from "./pages/AdminMenu";
import AdminTables from "./pages/AdminTables";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomerMenu />} />
        <Route path="/table/:tableNumber" element={<CustomerMenu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/order/:orderId" element={<OrderStatus />} />

        <Route path="/kitchen" element={<KitchenDashboard />} />

        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/menu" element={<AdminMenu />} />
        <Route path="/admin/tables" element={<AdminTables />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;