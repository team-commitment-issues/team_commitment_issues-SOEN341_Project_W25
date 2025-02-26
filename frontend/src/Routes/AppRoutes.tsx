import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainDashboardNormalUser from '../Pages/MainDashboardNormalUser';

const AppRoutes: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/dashboard" element={<MainDashboardNormalUser />} />
                {/* Add more routes here as needed */}
                <Route path="/" element={<MainDashboardNormalUser />} />
            </Routes>
        </Router>
    );
};

export default AppRoutes;