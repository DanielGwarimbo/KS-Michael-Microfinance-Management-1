import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Bell, Settings, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROLE_LABELS } from '../../lib/utils';
import type { RoleName } from '../../lib/types';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/clients':      'Clients',
  '/loans':        'Loans',
  '/repayments':   'Repayments',
  '/users':        'User Management',
  '/accounting':   'Accounting',
  '/reports':      'Reports',
  '/documents':    'Documents',
  '/audit':        'Audit Log',
  '/profile':      'My Profile',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Header() {
  const { profile, signOut, roleName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? 'KSMMS';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 z-20" style={{ boxShadow: '0 1px 0 0 #f1f5f9' }}>
      {/* Page title */}
      <div>
        <h2 className="font-display text-[17px] font-bold text-gray-900 leading-tight">{pageTitle}</h2>
        <p className="text-[11px] text-gray-400 font-medium leading-none mt-0.5 font-display">
          KS Michael Finance (Pvt) Ltd
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <button className="relative p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-150">
          <Bell className="h-[18px] w-[18px]" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-100 mx-1" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-all duration-150 group"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold font-display">
                {profile ? getInitials(profile.full_name) : '??'}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[13px] font-semibold text-gray-900 leading-tight font-display">{profile?.full_name}</p>
              <p className="text-[11px] text-gray-400 leading-tight">
                {roleName ? ROLE_LABELS[roleName as RoleName] : ''}
              </p>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl border border-gray-100 shadow-card-md py-1.5 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-900 truncate font-display">{profile?.full_name}</p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{profile?.email}</p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  My Profile
                </button>
                <div className="mx-3 my-1 h-px bg-gray-100" />
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
