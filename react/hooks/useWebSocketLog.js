import { useContext } from 'react';
import { WebSocketLogContext } from '../context/WebSocketLogContext';

export const useWebSocketLog = () => {
    const context = useContext(WebSocketLogContext);
    if (!context) {
        throw new Error('useWebSocketLog must be used within WebSocketLogProvider');
    }
    return context;
};
