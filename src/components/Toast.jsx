import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

/**
 * Toast notification component for user feedback
 * Replaces alert() with better UX
 * Supports optional action button (e.g., "Undo")
 */
export default function Toast({ message, type = 'info', onClose, duration = 4000, action = null }) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info
  };

  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const actionStyles = {
    error: 'bg-red-100 hover:bg-red-200 text-red-900',
    success: 'bg-green-100 hover:bg-green-200 text-green-900',
    info: 'bg-blue-100 hover:bg-blue-200 text-blue-900'
  };

  const Icon = icons[type] || Info;

  const handleActionClick = () => {
    if (action && action.onClick) {
      action.onClick();
      onClose();
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-down">
      <div className={`${styles[type]} border-2 rounded-xl p-4 shadow-lg flex items-start gap-3`}>
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {action && action.label && (
            <button
              onClick={handleActionClick}
              className={`${actionStyles[type]} mt-2 px-3 py-1 rounded-lg text-xs font-semibold transition-colors`}
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
