import { useState, useEffect } from 'react';

export default function LoadingScreen({ children }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-navy-600">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">⚡</span>
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-white">Red</span>
            <span className="text-brick-400">Brick</span>
          </h1>
        </div>
        <p className="text-navy-300 text-sm mb-8">Electricity Credit — Zambia</p>

        {/* Spinner */}
        <div className="loading-spinner" />

        <p className="text-navy-300 text-xs mt-6 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return children;
}
