import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth-context';
import { DashboardRoute } from './routes/dashboard';
import { LoginRoute } from './routes/login';

export function App() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginRoute />} />
      <Route path="/" element={token ? <DashboardRoute /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
