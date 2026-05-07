import { useNotification } from '../../contexts/NotificationContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
};

export default function Notifications() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {notifications.map((n) => {
        const Icon = icons[n.type];
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${colors[n.type]} animate-slide-in`}
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColors[n.type]}`} />
            <p className="text-sm font-medium flex-1">{n.message}</p>
            <button
              onClick={() => removeNotification(n.id)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-black/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
