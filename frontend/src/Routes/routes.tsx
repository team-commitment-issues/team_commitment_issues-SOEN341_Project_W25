import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../Pages/Dashboard';
import SettingsDashboard from '../Pages/SettingsDashboard';
import MainDashboardNormalUser from '../Pages/MainDashboardNormalUser';


// Lazy-loaded components
const Login = lazy(() => import('../Pages/Login'));
const SignUp = lazy(() => import('../Pages/SignUp'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/login" element={React.createElement(Login)} />
        <Route path="/signup" element={React.createElement(SignUp)} />
        <Route path="/Dashboard" element={React.createElement(Dashboard)} />
        <Route path="/SettingsDashboard" element={React.createElement(SettingsDashboard)} />
        <Route path="/MainDashboardNormalUser" element={React.createElement(MainDashboardNormalUser)} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

