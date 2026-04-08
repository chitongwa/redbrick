import { NavLink, useNavigate } from 'react-router-dom';

const links = [
  { to: '/overview',  label: 'Overview',  icon: '📊' },
  { to: '/users',     label: 'Users',     icon: '👥' },
  { to: '/loans',     label: 'Loans',     icon: '💳' },
  { to: '/scoring',   label: 'Scoring',   icon: '📈' },
  { to: '/settings',  label: 'Settings',  icon: '⚙️' },
];

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('rb_admin_token');
    localStorage.removeItem('rb_admin_email');
    navigate('/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-navy-600 text-white flex flex-col transition-transform
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b border-navy-500">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="text-lg font-extrabold tracking-tight">
              <span className="text-white">Red</span>
              <span className="text-brick-400">Brick</span>
            </span>
          </div>
          <p className="text-navy-300 text-xs mt-1">Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-navy-500 text-white' : 'text-navy-200 hover:bg-navy-500/50 hover:text-white'}`
              }
            >
              <span className="text-base">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-navy-300 hover:bg-navy-500/50 hover:text-white transition-colors"
          >
            <span className="text-base">🚪</span>
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
