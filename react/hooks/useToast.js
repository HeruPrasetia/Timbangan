import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

export const useToast = () => {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }

    return {
        success: (message, duration) => context.addToast(message, { type: 'success', duration }),
        error: (message, duration) => context.addToast(message, { type: 'error', duration }),
        warning: (message, duration) => context.addToast(message, { type: 'warning', duration }),
        info: (message, duration) => context.addToast(message, { type: 'info', duration }),
        custom: (message, options) => context.addToast(message, options),
        removeToast: context.removeToast,
        removeAll: context.removeAll
    };
};
