import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy-loaded components
const Login = lazy(() => import('../Pages/Login'));
const SignUp = lazy(() => import('../Pages/SignUp'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/login" element={React.createElement(Login)} />
        <Route path="/signup" element={React.createElement(SignUp)} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

