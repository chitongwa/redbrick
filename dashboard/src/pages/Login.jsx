import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_EMAIL    = 'chitongwa@hotmail.com';
const ADMIN_PASSWORD = 'Mergence@1';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter your credentials');
      return;
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('rb_admin_token', 'admin-session-active');
      localStorage.setItem('rb_admin_email', email);
      navigate('/overview');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-600">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-navy-600">Red</span>
              <span className="text-brick-500">Brick</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm">Admin Dashboard</p>
        </div>

        {error && (
          <div className="bg-brick-50 text-brick-700 text-sm px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brick-500 focus:border-transparent outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brick-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-navy-600 hover:bg-navy-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
