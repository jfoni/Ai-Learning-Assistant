import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import AppLayout from "../layout/AppLayout"; // আপনার ফোল্ডার পাথ অনুযায়ী এটি চেক করে নেবেন

const ProtectedRoute = () => {
  const isAuthenticated = true;
  const loading = false;

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoute;