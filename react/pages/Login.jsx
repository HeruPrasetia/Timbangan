import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import LogoPanjang from '../assets/LogoPanjang.png';

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (username !== 'admin' || password !== 'naylatools') {
            setError('Username atau password salah.');
            setIsLoading(false);
            return;
        }

        try {
            const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiUrl = isDev 
                ? 'http://localhost:3002/checkLoginGoogle' 
                : 'https://apigo.naylatools.com/checkLoginGoogle';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ email: 'heru.praseti@gmail.com' })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'sukses') {
                    const token = data.token;
                    // Simpan token ke settings
                    await window.electronAPI.saveSettings({
                        naylatools_token: token
                    });
                } else {
                    console.warn('Login Google verification status is not sukses:', data.pesan);
                }
            } else {
                console.warn(`Server API responded with status: ${response.status}`);
            }
        } catch (err) {
            console.warn('Failed to fetch token from checkLoginGoogle (possibly offline):', err);
        }

        // Selalu biarkan masuk jika username dan password admin/naylatools benar (offline support)
        onLoginSuccess();
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-header">
                    <img src={LogoPanjang} alt="NaylaTools Logo" className="login-logo" />
                    <h2>Aplikasi Timbangan</h2>
                    <p>Silakan masuk untuk melanjutkan</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error-alert">
                            {error}
                        </div>
                    )}

                    <div className="login-input-group">
                        <label htmlFor="username">Username</label>
                        <div className="login-input-wrapper">
                            <User className="login-input-icon" size={18} />
                            <input
                                id="username"
                                type="text"
                                placeholder="Masukkan username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isLoading}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className="login-input-group">
                        <label htmlFor="password">Password</label>
                        <div className="login-input-wrapper">
                            <Lock className="login-input-icon" size={18} />
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`login-submit-btn ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="login-spinner"></div>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Masuk
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
