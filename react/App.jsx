import { BarChart3, History as HistoryIcon, LayoutDashboard, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import LogoPanjang from './assets/LogoPanjang.png';
import ToastContainer from './components/Toast';
import { ToastProvider } from './context/ToastContext';
import History from './pages/History';
import Laporan from './pages/Laporan';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Timbangan from './pages/Timbangan';
import { isTokenValid } from './utils/tokenUtils';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem('isLoggedIn') === 'true';
    });
    const [activeTab, setActiveTab] = useState('dashboard-view');
    const [isConnected, setIsConnected] = useState(false);
    const [theme, setTheme] = useState('dark');

    const wsRef = useRef(null);
    const lastSentWeight = useRef(null);

    useEffect(() => {
        // Load initial settings and theme
        const fetchInitialData = async () => {
            const settings = await window.electronAPI.getSettings();
            if (settings && settings.app_theme) {
                setTheme(settings.app_theme);
                if (settings.app_theme === 'light') {
                    document.body.classList.add('light-mode');
                } else {
                    document.body.classList.remove('light-mode');
                }
            }

            // Sync connection status
            const status = await window.electronAPI.getPortStatus();
            setIsConnected(status.isConnected);
        };
        fetchInitialData();

        // Listen for port status
        const unsubscribePortConnected = window.electronAPI.onPortConnected(() => {
            setIsConnected(true);
        });

        const unsubscribePortDisconnected = window.electronAPI.onPortDisconnected(() => {
            setIsConnected(false);
        });

        const unsubscribePortError = window.electronAPI.onPortError(() => {
            setIsConnected(false);
        });

        return () => {
            unsubscribePortConnected();
            unsubscribePortDisconnected();
            unsubscribePortError();
        };
    }, []);

    // Token Validation and Expiration Check (on app load only)
    useEffect(() => {
        if (!isLoggedIn) return;

        const checkTokenValidity = async () => {
            try {
                const settings = await window.electronAPI.getSettings();
                const token = settings?.naylatools_token;

                if (!token) {
                    console.log('No token found');
                    return;
                }

                // Check if token is still valid
                if (!isTokenValid(token)) {
                    console.warn('Token is invalid or expired, logging out...');
                    // Token is invalid or expired, logout
                    localStorage.removeItem('isLoggedIn');
                    setIsLoggedIn(false);
                    // Clear token from settings
                    await window.electronAPI.saveSettings({ naylatools_token: '' });
                } else {
                    console.log('Token is valid');
                }
            } catch (error) {
                console.error('Token validation error:', error);
            }
        };

        // Check token validity only once on app load
        checkTokenValidity();
    }, [isLoggedIn]);

    // WebSocket Connection and Event Handling
    useEffect(() => {
        if (!isLoggedIn) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        let isMounted = true;
        let reconnectTimeout = null;

        const connect = async () => {
            try {
                const settings = await window.electronAPI.getSettings();
                const token = settings?.naylatools_token;

                if (!token) {
                    if (wsRef.current) {
                        wsRef.current.close();
                        wsRef.current = null;
                    }
                    return;
                }

                // If already connected with the same token, do nothing
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && wsRef.current.url.includes(encodeURIComponent(token))) {
                    return;
                }

                if (wsRef.current) {
                    wsRef.current.close();
                }

                const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const wsUrl = isDev 
                    ? `ws://localhost:3003/ws?token=${encodeURIComponent(token)}` 
                    : `wss://ws.naylatools.com/ws?token=${encodeURIComponent(token)}`;

                console.log('Connecting to WebSocket:', wsUrl);
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (isMounted) console.log('WebSocket connected successfully');
                };

                ws.onclose = () => {
                    if (isMounted) {
                        console.log('WebSocket disconnected. Retrying in 5s...');
                        reconnectTimeout = setTimeout(connect, 5000);
                    }
                };

                ws.onerror = (err) => {
                    if (isMounted) console.error('WebSocket error:', err);
                };
            } catch (err) {
                console.error('WebSocket connection setup failed:', err);
                if (isMounted) reconnectTimeout = setTimeout(connect, 5000);
            }
        };

        connect();

        // Listen for weight/port data changes
        const unsubscribeData = window.electronAPI.onPortData((data) => {
            if (!data) return;
            const sanitized = data.replace(/[^\x20-\x7E]/g, '').trim();
            if (!sanitized || sanitized.length < 8) return;
            
            try {
                let isNegative = sanitized.startsWith('-');
                let coreValue = sanitized.substring(1, 7);
                let nilai = parseInt(coreValue);
                if (isNaN(nilai)) return;
                const parsedWeight = isNegative ? -nilai : nilai;

                // Send to websocket if connected and value changed
                if (lastSentWeight.current !== parsedWeight) {
                    lastSentWeight.current = parsedWeight;
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({
                            type: "timbangan_change",
                            nilai: parsedWeight
                        }));
                    }
                }
            } catch (e) {
                console.error('WebSocket send error:', e);
            }
        });

        // Periodically refresh/validate token in case it was updated in Settings
        const intervalId = setInterval(connect, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            unsubscribeData();
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isLoggedIn]);

    const renderView = () => {
        switch (activeTab) {
            case 'dashboard-view':
                return <Timbangan />;
            case 'history-view':
                return <History />;
            case 'reports-view':
                return <Laporan />;
            case 'settings-view':
                return <Settings />;
            default:
                return <Timbangan />;
        }
    };

    const handleLoginSuccess = () => {
        localStorage.setItem('isLoggedIn', 'true');
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        setIsLoggedIn(false);
    };

    if (!isLoggedIn) {
        return (
            <ToastProvider>
                <Login onLoginSuccess={handleLoginSuccess} />
                <ToastContainer />
            </ToastProvider>
        );
    }

    return (
        <ToastProvider>
            <div className="app-container">
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <img src={LogoPanjang} alt="Logo" className="logo-img" />
                    </div>

                    <nav className="nav-menu">
                        <button
                            className={`nav-item ${activeTab === 'dashboard-view' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dashboard-view')}
                        >
                            <LayoutDashboard size={20} />
                            Timbangan
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'history-view' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history-view')}
                        >
                            <HistoryIcon size={20} />
                            Riwayat
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'reports-view' ? 'active' : ''}`}
                            onClick={() => setActiveTab('reports-view')}
                        >
                            <BarChart3 size={20} />
                            Laporan
                        </button>

                        <button
                            className={`nav-item ${activeTab === 'settings-view' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings-view')}
                        >
                            <SettingsIcon size={20} />
                            Pengaturan
                        </button>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="status-indicator">
                            <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
                            {isConnected ? 'Port Terhubung' : 'Port Terputus'}
                        </div>

                        <button
                            className="nav-item logout-btn"
                            style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            onClick={handleLogout}
                        >
                            <LogOut size={20} />
                            Keluar
                        </button>
                    </div>
                </aside>

                <main className="main-content">
                    {renderView()}
                </main>
                
                <ToastContainer />
            </div>
        </ToastProvider>
    );
}

export default App;

