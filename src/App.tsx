import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AgentDashboard from './components/AgentDashboard';
import AdminDashboard from './components/AdminDashboard';
import AgentApply from './components/AgentApply';
import { checkSupabaseConnection } from './lib/supabase';

// Exporting routes for potential use in other parts of the app or for Supabase integration
export const APP_ROUTES = {
  HOME: '/',
  APPLY: '/apply',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
};

export default function App() {
  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path={APP_ROUTES.HOME} element={<LandingPage />} />
        <Route path={APP_ROUTES.APPLY} element={<AgentApply />} />
        <Route path={APP_ROUTES.DASHBOARD} element={<AgentDashboard />} />
        <Route path={APP_ROUTES.ADMIN} element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
