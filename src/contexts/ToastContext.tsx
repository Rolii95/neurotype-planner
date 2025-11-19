import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number, action?: Toast['action']) => string;
  hideToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = 5000,
    action?: Toast['action']
  ): string => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, type, message, duration, action };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  }, [hideToast]);

  const success = useCallback((message: string, duration = 5000) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration = 7000) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration = 6000) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration = 5000) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  const value: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const { id, type, message, action } = toast;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        border rounded-lg shadow-lg p-4 flex items-start gap-3
        animate-in slide-in-from-right duration-300
      `}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {message}
        </p>
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onClose(id);
            }}
            className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
        aria-label="Close notification"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};
