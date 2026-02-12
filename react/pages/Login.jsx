import React, { useState, useEffect } from 'react';
import { Lock, User, LogIn, Loader2, Database, CheckCircle2 } from 'lucide-react';
import LogoPanjang from '../assets/LogoPanjang.png';
import { api, __DEV__ } from '../../module';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState(__DEV__ ? 'yazid@tester1.com' : '');
    const [password, setPassword] = useState(__DEV__ ? 'default1234' : '');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSync, setIsLoadingSync] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncStep, setSyncStep] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Listen for sync progress from Main Process
        if (window.electronAPI && window.electronAPI.onSyncProgress) {
            const cleanup = window.electronAPI.onSyncProgress((data) => {
                setSyncProgress(data.progress);
                setSyncStep(data.step);
            });
            return cleanup;
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            // 1. Cek Login ke Server
            let sql = await api("sys/cek_login", { email: username, password: password, OS: "Desktop" }, false);

            if (sql.status === "sukses") {
                // Simpan token
                await window.AsyncStorage.setItem("token", sql.token);
                await window.AsyncStorage.setItem("profile", JSON.stringify(sql.profile || {}));

                window.Pesan2("Login Berhasil", "Berhasil", "success");

                // 2. Mulai Proses Sinkronisasi Database
                if (!window.electronAPI || !window.electronAPI.initDatabase) {
                    throw new Error("Sistem belum siap. Mohon restart aplikasi Electron Anda.");
                }

                setIsLoadingSync(true);
                setSyncProgress(5);
                setSyncStep("Inisialisasi Database...");

                // Inisialisasi DB (Create Tables etc)
                await window.electronAPI.initDatabase();

                setSyncProgress(10);
                setSyncStep("Menghubungkan ke server...");

                // Jalankan Sinkronisasi All
                const syncResult = await window.electronAPI.handleSyncAll(sql.token);

                if (syncResult.success) {
                    setSyncProgress(100);
                    setSyncStep("Sinkronisasi Selesai!");
                    setTimeout(() => {
                        onLoginSuccess(sql);
                    }, 1000);
                } else {
                    window.Pesan2(syncResult.error || "Gagal sinkronisasi data", "Sync Error", "danger");
                    setIsLoadingSync(false);
                    setIsLoading(false);
                }
            } else {
                window.Pesan2(sql.pesan, "Gagal Login", "danger");
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('Terjadi kesalahan sistem: ' + err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Sync Progress Overlay */}
            {isLoadingSync && (
                <div className="sync-overlay">
                    <div className="sync-card">
                        <div className="sync-icon-wrapper">
                            {syncProgress < 100 ? (
                                <Database className="sync-icon animate-pulse" size={48} />
                            ) : (
                                <CheckCircle2 className="sync-icon text-success" size={48} />
                            )}
                        </div>
                        <h3>Sinkronisasi Data</h3>
                        <p>{syncStep}</p>

                        <div className="progress-container">
                            <div
                                className="progress-bar"
                                style={{ width: `${syncProgress}%` }}
                            >
                                <div className="progress-shine"></div>
                            </div>
                        </div>
                        <span className="progress-text">{syncProgress}%</span>
                    </div>
                </div>
            )}

            <div className="login-card">
                <div className="login-header">
                    <img src={LogoPanjang} alt="Gijutsu Logo" className="login-logo" />
                    <p className="login-subtitle">Silakan masuk untuk melanjutkan</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="login-error">{error}</div>}

                    <div className="login-input-group">
                        <label htmlFor="username">Username</label>
                        <div className="login-input-wrapper">
                            <User className="input-icon" size={18} />
                            <input
                                type="text"
                                id="username"
                                placeholder="Masukkan username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="login-input-group">
                        <label htmlFor="password">Password</label>
                        <div className="login-input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                type="password"
                                id="password"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="login-button" disabled={isLoading || isLoadingSync}>
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <LogIn size={20} />
                                Masuk ke Sistem
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    &copy; {new Date().getFullYear()} Gijutsu Software. All rights reserved.
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .sync-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(2, 6, 23, 0.9);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.4s ease;
                }
                .sync-card {
                    background: #1e293b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 28px;
                    width: 100%;
                    max-width: 420px;
                    text-align: center;
                    box-shadow: 0 40px 60px -15px rgba(0, 0, 0, 0.7);
                }
                .sync-card h3 {
                    color: #f8fafc;
                    margin-bottom: 8px;
                    font-size: 22px;
                    font-weight: 700;
                }
                .sync-card p {
                    color: #94a3b8;
                    font-size: 15px;
                }
                .sync-icon-wrapper {
                    margin-bottom: 24px;
                    display: flex;
                    justify-content: center;
                }
                .sync-icon {
                    color: #60a5fa;
                }
                .text-success { color: #34d399; }
                .progress-container {
                    height: 14px;
                    background: #334155;
                    border-radius: 10px;
                    margin: 24px 0 12px;
                    overflow: hidden;
                    position: relative;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
                }
                .progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #60a5fa);
                    border-radius: 10px;
                    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                }
                .progress-shine {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(
                        90deg,
                        rgba(255,255,255,0) 0%,
                        rgba(255,255,255,0.4) 50%,
                        rgba(255,255,255,0) 100%
                    );
                    animation: shine 2s infinite linear;
                }
                .progress-text {
                    font-size: 16px;
                    font-weight: 700;
                    color: #f1f5f9;
                    letter-spacing: 0.5px;
                }
                @keyframes shine {
                    from { transform: translateX(-200%); }
                    to { transform: translateX(200%); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}} />
        </div>
    );
};

export default Login;
