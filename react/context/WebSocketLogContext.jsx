import { createContext, useCallback, useRef, useState } from 'react';

export const WebSocketLogContext = createContext();

const MAX_LOGS = 500;

export const WebSocketLogProvider = ({ children }) => {
    const [logs, setLogs] = useState([]);
    const idCounter = useRef(0);

    const addLog = useCallback((entry) => {
        const id = ++idCounter.current;
        const logEntry = {
            id,
            timestamp: new Date(),
            ...entry,
        };
        setLogs((prev) => {
            const next = [logEntry, ...prev];
            if (next.length > MAX_LOGS) next.length = MAX_LOGS;
            return next;
        });
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return (
        <WebSocketLogContext.Provider value={{ logs, addLog, clearLogs }}>
            {children}
        </WebSocketLogContext.Provider>
    );
};
