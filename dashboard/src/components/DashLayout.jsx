import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000); // update every 30s
    return () => clearInterval(id);
  }, []);
  const date = now.toLocaleDateString('en-ZM', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const time = now.toLocaleTimeString('en-ZM', {
    hour: '2-digit', minute: '2-digit',
  });
  return { date, time };
}

export default function DashLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { date, time } = useLiveClock();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6 text-navy-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-navy-700 lg:text-base">RedBrick Operations</h2>
          </div>

          {/* Right side: user info + clock */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-navy-700 leading-tight">Welcome, Redbrick Admin</p>
              <p className="text-[11px] text-gray-400 leading-tight">{date} &middot; {time}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-xs font-bold text-navy-700 border-2 border-navy-200">
              RA
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
