import { BarChart3, History as HistoryIcon, LayoutDashboard, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import LogoPanjang from './assets/LogoPanjang.png';
import ToastContainer from './components/Toast';
import WebSocketLogPanel from './components/WebSocketLogPanel';
import './components/WebSocketLogPanel.css';
import { ToastProvider } from './context/ToastContext';
import { WebSocketLogProvider } from './context/WebSocketLogContext';
import { createDatabase, deleteDatabase, dropDatabase, insertDatabase, syncDatabase } from './Database';
import History from './pages/History';
import Laporan from './pages/Laporan';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Timbangan from './pages/Timbangan';
import { isTokenValid } from './utils/tokenUtils';

function AppInner() {
    const [isLoggedIn, setIsLoggedIn] = useState(null);
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

            // Baca status login dari electron settings (lebih persisten dari localStorage)
            const loggedIn = settings?.is_logged_in === 'true';
            setIsLoggedIn(loggedIn);

            // Restore token ke localStorage supaya apiGo() di Database.js bisa membacanya
            if (settings?.naylatools_token) {
                localStorage.setItem('TokenNaylaTools', settings.naylatools_token);
            } else {
                localStorage.removeItem('TokenNaylaTools');
            }

            if (loggedIn) await syncDatabase();
            if (!loggedIn) dropDatabase();

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
                    await window.electronAPI.saveSettings({ is_logged_in: 'false' });
                    dropDatabase();
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

    // Global WebSocket listener untuk master data update (aktif di semua halaman)
    useEffect(() => {
        if (!isLoggedIn) return;

        const wsRef = { current: null };
        let reconnectTimeout = null;
        let isMounted = true;

        const connect = async () => {
            try {
                const settings = await window.electronAPI.getSettings();
                const token = settings?.naylatools_token;
                if (!token) return;

                if (wsRef.current &&
                    (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                    return;
                }

                if (wsRef.current) wsRef.current.close();

                const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const wsUrl = isDev
                    ? `ws://localhost:3003/ws?token=${encodeURIComponent(token)}`
                    : `wss://ws.naylatools.com/ws?token=${encodeURIComponent(token)}`;

                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onclose = () => {
                    if (isMounted) {
                        console.log('[App WS] Disconnected. Retry in 5s...');
                        reconnectTimeout = setTimeout(connect, 5000);
                    }
                };

                ws.onerror = (err) => {
                    console.error('[App WS] Error:', err);
                };

                ws.onmessage = async (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'update_master') {
                            const master = data.master;
                            const datamaster = data.data;
                            if (master === 'MasterItemUnit') {
                                for (let dd of datamaster) await deleteDatabase('MasterItemUnit', { ItemID: dd.ItemID });
                            } else if (master == "TransTimbangan") {
                                console.log(datamaster);
                                window.electronAPI.updateReffTrans(datamaster[0].ReffDocNumber);
                                return;
                            }
                            await insertDatabase(master, datamaster);
                            console.log(`[App WS] Master ${master} updated (${datamaster.length} records)`);
                        } else if (data.type === 'delete_master') {
                            const master = data.master;
                            const datamaster = data.data;
                            for (let dd of datamaster) {
                                await deleteDatabase(master, { ID: dd.ID });
                            }
                            console.log(`[App WS] Master ${master} deleted (${datamaster.length} records)`);
                        }
                    } catch (err) {
                        console.error('[App WS] Message parse error:', err);
                    }
                };
            } catch (err) {
                console.error('[App WS] Connection setup failed:', err);
                if (isMounted) reconnectTimeout = setTimeout(connect, 5000);
            }
        };

        connect();
        const intervalId = setInterval(connect, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
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

    const handleLoginSuccess = async () => {
        await window.electronAPI.saveSettings({ is_logged_in: 'true' });
        setIsLoggedIn(true);
        await createDatabase();
        await syncDatabase();
    };

    const handleLogout = async () => {
        await window.electronAPI.saveSettings({ is_logged_in: 'false' });
        dropDatabase();
        setIsLoggedIn(false);
    };

    // Saat masih loading (baca settings), tampilkan layar kosong
    if (isLoggedIn === null) {
        return null;
    }

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
                        <button className={`nav-item ${activeTab === 'dashboard-view' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard-view')}>
                            <LayoutDashboard size={20} /> Timbangan
                        </button>
                        <button className={`nav-item ${activeTab === 'history-view' ? 'active' : ''}`} onClick={() => setActiveTab('history-view')}>
                            <HistoryIcon size={20} /> Riwayat
                        </button>
                        <button className={`nav-item ${activeTab === 'reports-view' ? 'active' : ''}`} onClick={() => setActiveTab('reports-view')}>
                            <BarChart3 size={20} /> Laporan
                        </button>
                        <button className={`nav-item ${activeTab === 'settings-view' ? 'active' : ''}`} onClick={() => setActiveTab('settings-view')}>
                            <SettingsIcon size={20} /> Pengaturan
                        </button>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="status-indicator">
                            <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
                            {isConnected ? 'Port Terhubung' : 'Port Terputus'}
                        </div>

                        <button className="nav-item logout-btn" onClick={handleLogout} style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <LogOut size={20} /> Keluar
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
