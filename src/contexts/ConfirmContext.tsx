import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
};

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    options: { message: '' },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, options: { message: '' }, resolve: null });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, options: { message: '' }, resolve: null });
  }, [state.resolve]);

  const value: ConfirmContextType = {
    confirm,
  };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.isOpen && (
        <ConfirmDialog
          options={state.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

interface ConfirmDialogProps {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ options, onConfirm, onCancel }) => {
  const {
    title = 'Confirm Action',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    type = 'warning',
  } = options;

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${getIconColor()}`}>
              <ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1">
              <h3
                id="confirm-dialog-title"
                className="text-lg font-medium text-gray-900 dark:text-gray-100"
              >
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {message}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonStyle()}`}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
