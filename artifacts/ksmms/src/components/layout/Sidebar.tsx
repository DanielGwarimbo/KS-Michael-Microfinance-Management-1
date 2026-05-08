import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Receipt,
  UserCog,
  Calculator,
  FileBarChart,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { classNames, ROLE_LABELS } from '../../lib/utils';
import type { RoleName } from '../../lib/types';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: RoleName[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',   icon: <LayoutDashboard className="h-[18px] w-[18px]" />, path: '/dashboard',  roles: ['admin', 'manager', 'loan_officer', 'cashier', 'accountant'] },
  { label: 'Clients',     icon: <Users           className="h-[18px] w-[18px]" />, path: '/clients',    roles: ['admin', 'manager', 'loan_officer'] },
  { label: 'Loans',       icon: <HandCoins       className="h-[18px] w-[18px]" />, path: '/loans',      roles: ['admin', 'manager', 'loan_officer', 'cashier'] },
  { label: 'Repayments',  icon: <Receipt         className="h-[18px] w-[18px]" />, path: '/repayments', roles: ['admin', 'manager', 'cashier', 'accountant'] },
  { label: 'Users',       icon: <UserCog         className="h-[18px] w-[18px]" />, path: '/users',      roles: ['admin'] },
  { label: 'Accounting',  icon: <Calculator      className="h-[18px] w-[18px]" />, path: '/accounting', roles: ['admin', 'manager', 'accountant'] },
  { label: 'Reports',     icon: <FileBarChart    className="h-[18px] w-[18px]" />, path: '/reports',    roles: ['admin', 'manager', 'accountant'] },
  { label: 'Documents',   icon: <FileText        className="h-[18px] w-[18px]" />, path: '/documents',  roles: ['admin', 'manager', 'loan_officer'] },
  { label: 'Audit Log',   icon: <Shield          className="h-[18px] w-[18px]" />, path: '/audit',      roles: ['admin', 'manager'] },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { roleName, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile is always expanded; desktop can collapse
  const isCollapsed = mobile ? false : collapsed;

  const visibleItems = navItems.filter(item => roleName && item.roles.includes(roleName));

  function handleNav(path: string) {
    navigate(path);
    if (mobile && onClose) onClose();
  }

  return (
    <aside
      className={classNames(
        'h-screen bg-brand-950 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0',
        isCollapsed ? 'w-[68px]' : 'w-72'
      )}
    >
      {/* Logo / Brand */}
      <div className={classNames(
        'flex items-center h-28 border-b border-white/[0.07] flex-shrink-0',
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-24 w-24 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/20 bg-white">
              <img src="/logo.png" alt="KS Michael Finance" className="h-full w-full object-cover scale-125" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-extrabold text-white text-sm leading-tight tracking-tight">KS Michael Finance</p>
              <p className="text-gold-400 text-xs font-bold leading-tight tracking-wide">(Pvt) Ltd</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="h-[72px] w-[72px] rounded-xl overflow-hidden ring-2 ring-white/20 bg-white">
            <img src="/logo.png" alt="KSM" className="h-full w-full object-cover scale-125" />
          </div>
        )}

        {/* Mobile: X close button | Desktop: collapse toggle */}
        {mobile ? (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all duration-150 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={classNames(
              'p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all duration-150 flex-shrink-0',
              isCollapsed && 'absolute left-[68px] top-4 -translate-x-1/2 bg-brand-950 border border-white/10 shadow-lg z-10'
            )}
          >
            {isCollapsed
              ? <ChevronRight className="h-3.5 w-3.5" />
              : <ChevronLeft  className="h-3.5 w-3.5" />
            }
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {!isCollapsed && (
          <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-3 pb-2 pt-1">Navigation</p>
        )}
        {visibleItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              title={isCollapsed ? item.label : undefined}
              className={classNames(
                'w-full flex items-center gap-3 rounded-xl text-sm font-bold transition-all duration-150 group relative',
                isCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5',
                isActive
                  ? 'bg-gold-400/15 text-gold-400'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/[0.07]'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold-400 rounded-r-full" />
              )}
              <span className={classNames(
                'flex-shrink-0 transition-colors',
                isActive ? 'text-gold-400' : 'text-white/40 group-hover:text-white/70'
              )}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="font-display truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Role Footer */}
      {!isCollapsed && profile && (
        <div className="flex-shrink-0 p-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.05]">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold font-display">
                {getInitials(profile.full_name)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">{profile.full_name}</p>
              <p className="text-gold-500 text-xs font-medium leading-tight mt-0.5">
                {roleName ? ROLE_LABELS[roleName] : ''}
              </p>
            </div>
          </div>
        </div>
      )}
      {isCollapsed && profile && (
        <div className="flex-shrink-0 p-2 border-t border-white/[0.07] flex justify-center">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center" title={profile.full_name}>
            <span className="text-white text-xs font-bold font-display">
              {getInitials(profile.full_name)}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
