import { createContext, useCallback, useState } from 'react';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, options = {}) => {
        const {
            type = 'info', // 'success', 'error', 'warning', 'info'
            duration = 4000,
            id = Date.now()
        } = options;

        const toast = { id, message, type, duration };
        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const removeAll = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, removeAll, toasts }}>
            {children}
        </ToastContext.Provider>
    );
};
