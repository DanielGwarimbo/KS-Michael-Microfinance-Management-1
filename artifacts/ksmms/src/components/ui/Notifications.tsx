import { useNotification } from '../../contexts/NotificationContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
};

const styles = {
  success: { bar: 'bg-emerald-500', icon: 'text-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  error:   { bar: 'bg-red-500',     icon: 'text-red-500',     text: 'text-red-700',     bg: 'bg-red-50' },
  info:    { bar: 'bg-blue-500',    icon: 'text-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50' },
  warning: { bar: 'bg-amber-400',   icon: 'text-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50' },
};

export default function Notifications() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80">
      {notifications.map(n => {
        const Icon = icons[n.type];
        const s = styles[n.type];
        return (
          <div
            key={n.id}
            className={`relative flex items-start gap-3 p-4 pr-10 rounded-2xl bg-white shadow-card-lg border border-gray-100 overflow-hidden animate-slide-in`}
          >
            {/* Left color bar */}
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar} rounded-l-2xl`} />
            <span className={`h-5 w-5 flex-shrink-0 mt-0.5 ${s.icon}`}>
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-gray-800 leading-snug font-display flex-1">{n.message}</p>
            <button
              onClick={() => removeNotification(n.id)}
              className="absolute top-3 right-3 p-0.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
