import { Eye, EyeOff, Lock, LogIn, User } from 'lucide-react';
import { useState } from 'react';
import LogoPanjang from '../assets/LogoPanjang.png';
import { useToast } from '../hooks/useToast';
import { decrypt } from '../utils/tokenUtils';

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (username === 'admin') {
            if (password === 'naylatools') {
                // Hapus token lama jika ada agar tidak bentrok
                await window.electronAPI.saveSettings({ naylatools_token: '' });
                localStorage.removeItem("TokenNaylaTools");
                onLoginSuccess();
            } else {
                setError('Username atau password salah.');
                toast.error('Password admin salah.');
                setIsLoading(false);
            }
            return;
        }

        try {
            const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiUrl = isDev
                ? 'http://localhost:3002/checkLogin'
                : 'https://apigo.naylatools.com/checkLogin';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ email: username, password: password })
            });

            const responseText = await response.text();
            let data = null;
            try {
                data = decrypt(responseText, undefined, undefined);
            } catch (decErr) {
                try {
                    data = JSON.parse(responseText);
                } catch (jsonErr) {
                    // Not JSON
                }
            }

            if (data && data.status === 'sukses') {
                const token = data.token;
                // Simpan token ke settings
                await window.electronAPI.saveSettings({
                    naylatools_token: token
                });
                localStorage.setItem("TokenNaylaTools", token);
                toast.success('Login sukses!');
                onLoginSuccess();
            } else if (data && data.pesan) {
                setError(data.pesan);
                toast.error(data.pesan);
            } else {
                setError(`Server API merespons dengan status: ${response.status}`);
                toast.error(`Login gagal. Server merespons dengan status: ${response.status}`);
            }
        } catch (err) {
            console.error('Failed to login:', err);
            setError('Gagal menghubungkan ke server.');
            toast.error('Gagal menghubungkan ke server.');
        } finally {
            setIsLoading(false);
        }
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
