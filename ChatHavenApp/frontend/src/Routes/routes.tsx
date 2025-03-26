import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy-loaded components
const Login = lazy(() => import('../Pages/Login'));
const SignUp = lazy(() => import('../Pages/SignUp'));
const Dashboard = lazy(() => import('../Pages/AdminDashboard'));
const LandingPage = lazy(() => import('../Pages/LandingPage'));
const CreateTeam = lazy(() => import('../Pages/CreateTeam'));
const Profile = lazy(() => import('../Pages/Profile'));
const Settings = lazy(() => import('../Pages/Settings'));
const CreateChannel = lazy(() => import('../Pages/CreateChannel'));

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-team" element={<CreateTeam />} />
        <Route path="/create-channel" element={<CreateChannel />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
