import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';
import './Toast.css';

const getIcon = (type) => {
    const iconProps = { size: 20 };
    switch (type) {
        case 'success':
            return <CheckCircle {...iconProps} />;
        case 'error':
            return <AlertCircle {...iconProps} />;
        case 'warning':
            return <AlertTriangle {...iconProps} />;
        case 'info':
        default:
            return <Info {...iconProps} />;
    }
};

const Toast = ({ toast }) => {
    const { removeToast } = useContext(ToastContext);

    return (
        <div className={`toast toast-${toast.type} toast-enter`}>
            <div className="toast-content">
                <div className="toast-icon">
                    {getIcon(toast.type)}
                </div>
                <div className="toast-message">
                    {toast.message}
                </div>
                <button
                    className="toast-close"
                    onClick={() => removeToast(toast.id)}
                    aria-label="Close toast"
                >
                    <X size={18} />
                </button>
            </div>
            <div className={`toast-progress`}></div>
        </div>
    );
};

const ToastContainer = () => {
    const { toasts } = useContext(ToastContext);

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} />
            ))}
        </div>
    );
};

export default ToastContainer;
