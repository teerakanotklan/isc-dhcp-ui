import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Subnets } from './pages/Subnets';
import { StaticLeases } from './pages/StaticLeases';
import { Leases } from './pages/Leases';
import { Clustering } from './pages/Clustering';
import { Deploy } from './pages/Deploy';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="subnets" element={<Subnets />} />
                <Route path="static" element={<StaticLeases />} />
                <Route path="leases" element={<Leases />} />
                <Route path="clustering" element={<Clustering />} />
                <Route path="deploy" element={<Deploy />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
