import { BarChart3, History as HistoryIcon, LayoutDashboard, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import LogoPanjang from './assets/LogoPanjang.png';
import ToastContainer from './components/Toast';
import WebSocketLogPanel from './components/WebSocketLogPanel';
import './components/WebSocketLogPanel.css';
import { ToastProvider } from './context/ToastContext';
import { WebSocketLogProvider } from './context/WebSocketLogContext';
import { useWebSocketLog } from './hooks/useWebSocketLog';
import History from './pages/History';
import Laporan from './pages/Laporan';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Timbangan from './pages/Timbangan';
import { isTokenValid } from './utils/tokenUtils';

function AppInner() {
    const { addLog } = useWebSocketLog();
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem('isLoggedIn') === 'true';
    });
    const [activeTab, setActiveTab] = useState('dashboard-view');
    const [isConnected, setIsConnected] = useState(false);
    const [theme, setTheme] = useState('dark');



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

                <main className="main-content" style={{ paddingBottom: '40px' }}>
                    {renderView()}
                </main>

                <WebSocketLogPanel />
                <ToastContainer />
            </div>
        </ToastProvider>
    );
}

function App() {
    return (
        <WebSocketLogProvider>
            <AppInner />
        </WebSocketLogProvider>
    );
}

export default App;
