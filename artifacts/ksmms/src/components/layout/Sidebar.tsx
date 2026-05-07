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
  { label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/dashboard', roles: ['admin', 'manager', 'loan_officer', 'cashier', 'accountant'] },
  { label: 'Clients', icon: <Users className="h-5 w-5" />, path: '/clients', roles: ['admin', 'manager', 'loan_officer'] },
  { label: 'Loans', icon: <HandCoins className="h-5 w-5" />, path: '/loans', roles: ['admin', 'manager', 'loan_officer', 'cashier'] },
  { label: 'Repayments', icon: <Receipt className="h-5 w-5" />, path: '/repayments', roles: ['admin', 'manager', 'cashier', 'accountant'] },
  { label: 'Users', icon: <UserCog className="h-5 w-5" />, path: '/users', roles: ['admin'] },
  { label: 'Accounting', icon: <Calculator className="h-5 w-5" />, path: '/accounting', roles: ['admin', 'manager', 'accountant'] },
  { label: 'Reports', icon: <FileBarChart className="h-5 w-5" />, path: '/reports', roles: ['admin', 'manager', 'accountant'] },
  { label: 'Documents', icon: <FileText className="h-5 w-5" />, path: '/documents', roles: ['admin', 'manager', 'loan_officer'] },
  { label: 'Audit Log', icon: <Shield className="h-5 w-5" />, path: '/audit', roles: ['admin', 'manager'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { roleName } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => roleName && item.roles.includes(roleName));

  return (
    <aside
      className={classNames(
        'h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">KS</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">KSMMS</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={classNames(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-teal-600' : 'text-gray-400'}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && roleName && (
        <div className="p-4 border-t border-gray-200">
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Role</p>
            <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[roleName] || roleName}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
