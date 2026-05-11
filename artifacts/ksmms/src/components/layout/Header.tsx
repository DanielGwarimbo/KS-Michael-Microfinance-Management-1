import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Bell, Settings, ChevronDown, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROLE_LABELS } from '../../lib/utils';
import { getStorageUrl } from '../../lib/supabase';
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

function getAvatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  const path = avatarUrl.replace(/^\/objects\//, '');
  return getStorageUrl('avatars', path);
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
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

  const avatarSrc = getAvatarSrc(profile?.avatar_url);

  return (
    <header
      className="h-14 sm:h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-20"
      style={{ boxShadow: '0 1px 0 0 #f1f5f9' }}
    >
      {/* Left — hamburger (mobile only) + page title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all duration-150 flex-shrink-0"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="font-display text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">
            {pageTitle}
          </h2>
          <p className="text-xs text-gray-400 font-medium leading-none mt-0.5 font-display hidden sm:block">
            KS Michael Finance (Pvt) Ltd
          </p>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Notifications bell */}
        <button className="relative p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-150">
          <Bell className="h-[18px] w-[18px]" />
        </button>

        {/* Divider — hidden on tiny screens */}
        <div className="w-px h-6 bg-gray-100 mx-0.5 sm:mx-1 hidden sm:block" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-all duration-150 group"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
              {avatarSrc ? (
                <img src={avatarSrc} alt={profile?.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
                  <span className="text-white text-xs font-bold font-display">
                    {profile ? getInitials(profile.full_name) : '??'}
                  </span>
                </div>
              )}
            </div>
            {/* Name + role — hidden on small screens */}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight font-display">{profile?.full_name}</p>
              <p className="text-xs text-gray-400 leading-tight">
                {roleName ? ROLE_LABELS[roleName as RoleName] : ''}
              </p>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl border border-gray-100 shadow-card-md py-1.5 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900 truncate font-display">{profile?.full_name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{profile?.email}</p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium"
                >
                  <Settings className="h-4 w-4 text-gray-400" />
                  My Profile
                </button>
                <div className="mx-3 my-1 h-px bg-gray-100" />
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
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
