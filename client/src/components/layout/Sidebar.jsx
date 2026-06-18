// client/src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider.jsx';
import { ROLES } from '../../constants/roles.js';

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'Transactions', path: '/transactions', icon: '📋' },
    { name: 'Members', path: '/members', icon: '👥' },
    { name: 'Rates', path: '/rates', icon: '📈' },
    { name: 'Audit Logs', path: '/logs', icon: '📜' },
  ];

  if (user?.role === ROLES.OWNER) {
    navItems.push({ name: 'Settings', path: '/settings', icon: '⚙' });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-40 md:hidden" 
          onClick={onClose}
        />
      )}
      
      <div className={`w-64 bg-surface border-r border-border flex flex-col h-screen fixed left-0 top-0 z-50 transform transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-2xl text-primary font-display font-bold">Swarna Ledger</h2>
          <button className="md:hidden text-ink-muted hover:text-ink text-xl" onClick={onClose}>✕</button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                isActive 
                  ? 'bg-primary-subtle text-primary border-l-4 border-primary' 
                  : 'text-ink-muted hover:bg-ink/5'
              }`
            }
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-4">
        <div className="px-4 py-2 bg-surface-2 rounded-lg">
          <p className="text-sm font-semibold text-ink truncate">{user?.full_name}</p>
          <p className="text-xs text-ink-muted uppercase tracking-wider">{user?.role}</p>
        </div>
        <button 
          onClick={logout}
          className="btn border border-border w-full hover:bg-danger-subtle hover:text-danger hover:border-danger/30"
        >
          Logout
        </button>
      </div>
      </div>
    </>
  );
}
