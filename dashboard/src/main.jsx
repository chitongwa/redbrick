import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Login from './pages/Login';
import RequireAuth from './components/RequireAuth';
import LoadingScreen from './components/LoadingScreen';
import DashLayout from './components/DashLayout';
import Overview from './pages/Overview';
import Users from './pages/Users';
import Loans from './pages/Loans';
import Scoring from './pages/Scoring';
import Settings from './pages/Settings';

function LoginGate() {
  const token = localStorage.getItem('rb_admin_token');
  return token ? <Navigate to="/overview" replace /> : <Login />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginGate />} />
        <Route
          element={
            <RequireAuth>
              <LoadingScreen>
                <DashLayout />
              </LoadingScreen>
            </RequireAuth>
          }
        >
          <Route path="/overview" element={<Overview />} />
          <Route path="/users" element={<Users />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/scoring" element={<Scoring />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
