import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const token = localStorage.getItem('rb_admin_token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}
