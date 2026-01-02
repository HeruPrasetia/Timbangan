import React, { useState, useEffect } from 'react';
import Timbangan from './pages/Timbangan';
import History from './pages/History';
import Laporan from './pages/Laporan';
import Settings from './pages/Settings';
import { LayoutDashboard, History as HistoryIcon, BarChart3, Settings as SettingsIcon, RotateCw } from 'lucide-react';
import LogoPanjang from './assets/LogoPanjang.png';

function App() {
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

    return (
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
                </div>
            </aside>

            <main className="main-content">
                {renderView()}
            </main>
        </div>
    );
}

export default App;
