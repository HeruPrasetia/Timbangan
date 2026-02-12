import React, { useState, useEffect } from 'react';
import History from './pages/History';
import Laporan from './pages/Laporan';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Kasir from './pages/Kasir';
import { History as HistoryIcon, BarChart3, Settings as SettingsIcon, LogOut, Loader2, ShoppingCart } from 'lucide-react';
import LogoPanjang from './assets/LogoPanjang.png';

function App() {
    const [activeTab, setActiveTab] = useState('kasir-view');
    const [isConnected, setIsConnected] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    useEffect(() => {
        // Auth check
        const checkAuth = () => {
            const token = localStorage.getItem('Token');
            if (token) {
                setIsLoggedIn(true);
            }
            setIsLoadingAuth(false);
        };
        checkAuth();

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

    const handleLoginSuccess = (token) => {
        setIsLoggedIn(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('Token');
        setIsLoggedIn(false);
    };

    const renderView = () => {
        switch (activeTab) {
            case 'kasir-view':
                return <Kasir />;
            case 'history-view':
                return <History />;
            case 'reports-view':
                return <Laporan />;
            case 'settings-view':
                return <Settings />;
            default:
                return <Kasir />;
        }
    };

    if (isLoadingAuth) {
        return (
            <div className="auth-loading">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!isLoggedIn) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src={LogoPanjang} alt="Logo" className="logo-img" />
                </div>

                <nav className="nav-menu">

                    <button
                        className={`nav-item ${activeTab === 'kasir-view' ? 'active' : ''}`}
                        onClick={() => setActiveTab('kasir-view')}
                    >
                        <ShoppingCart size={20} />
                        Kasir
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

                    <button
                        className="nav-item logout-btn"
                        onClick={handleLogout}
                        style={{ marginTop: 'auto', color: 'var(--danger-color)' }}
                    >
                        <LogOut size={20} />
                        Keluar
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="status-indicator">
                        <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
                        {isConnected ? 'Port Terhubung' : 'Port Terputus'}
                    </div>
                </div>
            </aside>

            <main className="main-content">
                {renderView()}
            </main>
        </div>
    );
}

export default App;
