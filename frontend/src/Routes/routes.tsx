import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy-loaded components
const Login = lazy(() => import('../Pages/Login'));
const SignUp = lazy(() => import('../Pages/SignUp'));
const Dashboard = lazy(() => import('../Pages/AdminDashboard'));
const LandingPage = lazy(() => import('../Pages/LandingPage'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/login" element={React.createElement(Login)} />
        <Route path="/signup" element={React.createElement(SignUp)} />
        <Route path="/dashboard" element={React.createElement(Dashboard)} />
        <Route path="/" element={React.createElement(LandingPage)} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

