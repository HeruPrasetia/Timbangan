import React, { useState, useEffect } from 'react';
import {
    Building2,
    MapPin,
    Phone,
    Save,
    Database,
    Trash2,
    Codepen,
    Moon,
    Sun,
    Download,
    Terminal,
    Plus,
    Edit,
    Power,
    RotateCw,
    X
} from 'lucide-react';

const Settings = () => {
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [googleScriptUrl, setGoogleScriptUrl] = useState('');
    const [gijutsuToken, setGijutsuToken] = useState('');
    const [appTheme, setAppTheme] = useState('dark');

    const [templates, setTemplates] = useState([]);
    const [appVersion, setAppVersion] = useState('...');
    const [updateStatus, setUpdateStatus] = useState('');
    const [updateProgress, setUpdateProgress] = useState(0);
    const [isUpdateReady, setIsUpdateReady] = useState(false);
    const [loading, setLoading] = useState(false);
    // Modals State
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [pendingAction, setPendingAction] = useState(null); // 'reset' or 'sql'

    const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
    const [sqlQuery, setSqlQuery] = useState('');
    const [queryResult, setQueryResult] = useState(null);
    const [queryStatus, setQueryStatus] = useState({ message: '', type: '' });

    useEffect(() => {
        loadSettings();
        loadTemplates();
        window.electronAPI.getAppVersion().then(setAppVersion);

        const unsubscribeUpdateProgress = window.electronAPI.onUpdateProgress((percent) => {
            setUpdateProgress(percent);
        });

        const unsubscribeUpdateDownloaded = window.electronAPI.onUpdateDownloaded(() => {
            setIsUpdateReady(true);
            setUpdateStatus('Update siap diinstal!');
        });

        const unsubscribeTemplateList = window.electronAPI.onTemplateListUpdated(() => {
            loadTemplates();
        });

        return () => {
            unsubscribeUpdateProgress();
            unsubscribeUpdateDownloaded();
            unsubscribeTemplateList();
        };
    }, []);

    const loadSettings = async () => {
        try {
            console.log('Loading settings...');
            const settings = await window.electronAPI.getSettings();
            console.log('Settings received:', settings);
            if (settings) {
                setCompanyName(settings.company_name || '');
                setCompanyAddress(settings.company_address || '');
                setCompanyPhone(settings.company_phone || '');
                setGoogleScriptUrl(settings.google_script_url || '');
                setAppTheme(settings.app_theme || 'dark');
                setGijutsuToken(settings.gijutsu_token || '');
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const loadTemplates = async () => {
        try {
            console.log('Loading templates...');
            const result = await window.electronAPI.getAllTemplates();
            console.log('Templates response received:', result);
            if (result && result.success && Array.isArray(result.templates)) {
                setTemplates(result.templates);
            } else if (Array.isArray(result)) {
                // Fallback if the API returns array directly
                setTemplates(result);
            } else {
                console.warn('getAllTemplates returned unexpected format:', result);
                setTemplates([]);
            }
        } catch (err) {
            console.error('Failed to load templates:', err);
            setTemplates([]);
        }
    };

    const handleSaveKop = async () => {
        setLoading(true);
        const result = await window.electronAPI.saveSettings({
            company_name: companyName,
            company_address: companyAddress,
            company_phone: companyPhone
        });
        if (result.success) {
            alert('Pengaturan Kop Surat berhasil disimpan!');
        }
        setLoading(false);
    };

    const handleSaveGeneral = async () => {
        setLoading(true);
        const result = await window.electronAPI.saveSettings({
            google_script_url: googleScriptUrl,
            app_theme: appTheme,
            gijutsu_token: gijutsuToken
        });
        if (result.success) {
            // Apply theme
            if (appTheme === 'light') {
                document.body.classList.add('light-mode');
            } else {
                document.body.classList.remove('light-mode');
            }
            alert('Pengaturan General berhasil disimpan!');
        }
        setLoading(false);
    };

    const handleBackup = async () => {
        const result = await window.electronAPI.backupDatabase();
        if (result.success) {
            alert('Backup berhasil disimpan di:\n' + result.filePath);
        }
    };

    const handleRestore = async () => {
        if (confirm('PERINGATAN: Restore akan menimpa database saat ini dan me-restart aplikasi.\n\nLanjutkan?')) {
            await window.electronAPI.restoreDatabase();
        }
    };

    const handleReset = () => {
        setPendingAction('reset');
        setPasswordInput('');
        setIsPassModalOpen(true);
    };

    const handleSqlOpen = () => {
        setPendingAction('sql');
        setPasswordInput('');
        setIsPassModalOpen(true);
    };

    const handlePassSubmit = (e) => {
        if (e) e.preventDefault();
        if (passwordInput === 'naylatools') {
            setIsPassModalOpen(false);
            if (pendingAction === 'reset') {
                setTimeout(async () => {
                    if (confirm('APAKAH ANDA YAKIN? Semua data transaksi akan dihapus!')) {
                        const success = await window.electronAPI.resetDatabase();
                        if (success) {
                            alert('Data berhasil dibersihkan.');
                        } else {
                            alert('Gagal membersihkan data.');
                        }
                    }
                }, 100);
            } else if (pendingAction === 'sql') {
                setSqlQuery('');
                setQueryResult(null);
                setQueryStatus({ message: '', type: '' });
                setIsSqlModalOpen(true);
            }
        } else {
            alert('Password salah!');
        }
    };

    const handleExecuteSql = async () => {
        if (!sqlQuery.trim()) return;
        setQueryStatus({ message: 'Executing...', type: 'loading' });
        try {
            const result = await window.electronAPI.executeSql(sqlQuery);
            if (result.success) {
                setQueryStatus({
                    message: `Success! Type: ${result.type}${result.type === 'EXEC' ? `. Changes: ${result.data.changes}` : ''}`,
                    type: 'success'
                });
                if (result.type === 'SELECT') {
                    setQueryResult(result.data);
                } else {
                    setQueryResult(null);
                }
            } else {
                setQueryStatus({ message: `Error: ${result.error}`, type: 'error' });
            }
        } catch (err) {
            setQueryStatus({ message: `Runtime Error: ${err.message}`, type: 'error' });
        }
    };

    const handleCheckUpdate = async () => {
        if (isUpdateReady) {
            const confirmInstall = confirm('Aplikasi akan ditutup untuk melakukan update. Lanjutkan?');
            if (confirmInstall) {
                await window.electronAPI.quitAndInstall();
            }
            return;
        }

        setUpdateStatus('Downloading update...');
        try {
            const success = await window.electronAPI.downloadUpdate();
            if (success) {
                // Fallback in case event is missed
                setUpdateStatus('Update siap diinstal!');
                setIsUpdateReady(true);
            }
        } catch (error) {
            setUpdateStatus('Gagal mengunduh update: ' + error);
        }
    };

    const toggleTemplate = async (template) => {
        if (template.is_active) {
            await window.electronAPI.deactivateTemplate(template.id);
        } else {
            await window.electronAPI.activateTemplate(template.id);
        }
        loadTemplates();
    };

    const handleDeleteTemplate = async (id, name) => {
        if (confirm(`Hapus template "${name}"?`)) {
            await window.electronAPI.deleteTemplate(id);
            loadTemplates();
        }
    };

    const renderSqlResultTable = () => {
        if (!queryResult || queryResult.length === 0) return null;
        const columns = Object.keys(queryResult[0]);
        return (
            <div className="history-table-wrapper" style={{ maxHeight: '300px', marginTop: '20px', overflow: 'auto' }}>
                <table>
                    <thead>
                        <tr>
                            {columns.map(col => <th key={col}>{col}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {queryResult.map((row, i) => (
                            <tr key={i}>
                                {columns.map(col => (
                                    <td key={col} style={{ fontSize: '0.85rem' }}>
                                        {row[col] === null ? 'NULL' : row[col].toString()}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="tab-view active">
            <header className="view-header">
                <h2>Pengaturan Aplikasi</h2>
            </header>

            <div className="settings-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>

                {/* Kop Surat Section */}
                <section className="settings-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Building2 size={20} /> Kop Surat</h3>
                    <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Data ini muncul di print Surat Jalan.</p>

                    <div className="input-group">
                        <label>Nama Perusahaan</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Contoh: UD. MAJU JAYA"
                        />
                    </div>

                    <div className="input-group">
                        <label>Alamat Lengkap</label>
                        <textarea
                            rows="3"
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            placeholder="Contoh: Jl. Raya No. 123..."
                        />
                    </div>

                    <div className="input-group">
                        <label>Nomor Telepon</label>
                        <input
                            type="text"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            placeholder="0812-..."
                        />
                    </div>

                    <button className="primary-btn" onClick={handleSaveKop} style={{ marginTop: '10px' }}>
                        <Save size={18} /> Simpan Kop Surat
                    </button>
                </section>

                {/* General Section */}
                <section className="settings-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><RotateCw size={20} /> General & Tema</h3>

                    <div className="input-group">
                        <label>Tema Aplikasi</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className={`stage-btn ${appTheme === 'dark' ? 'active' : ''}`}
                                onClick={() => setAppTheme('dark')}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Moon size={16} /> Dark
                            </button>
                            <button
                                className={`stage-btn ${appTheme === 'light' ? 'active' : ''}`}
                                onClick={() => setAppTheme('light')}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Sun size={16} /> Light
                            </button>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>URL Google Script (GSheet)</label>
                        <input
                            type="text"
                            value={googleScriptUrl}
                            onChange={(e) => setGoogleScriptUrl(e.target.value)}
                            placeholder="https://script.google.com/..."
                        />
                        <small style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Kosongkan untuk menonaktifkan sync otomatis.</small>
                    </div>

                    <div className="input-group">
                        <label>Sambungkan ke Gijustu Software</label>
                        <input
                            type="text"
                            value={gijutsuToken}
                            onChange={(e) => setGijutsuToken(e.target.value)}
                            placeholder="Token Gijustu"
                        />
                        <small style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Kosongkan untuk menonaktifkan sync otomatis.</small>
                    </div>

                    <button className="primary-btn" onClick={handleSaveGeneral} style={{ marginTop: '10px' }}>
                        <Save size={18} /> Simpan Konfigurasi
                    </button>
                </section>

                {/* Database Management */}
                <section className="settings-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Database size={20} /> Manajemen Data</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button className="primary-btn secondary" onClick={handleBackup}>
                            <Download size={16} /> Backup
                        </button>
                        <button className="primary-btn secondary" onClick={handleRestore}>
                            <RotateCw size={16} /> Restore
                        </button>
                    </div>

                    <button id="open-sql-btn" className="primary-btn" onClick={handleSqlOpen} style={{ background: '#555', color: 'white' }}>
                        <Terminal size={18} /> SQL Console
                    </button>

                    <button id="reset-db-btn" className="primary-btn" onClick={handleReset} style={{ background: 'var(--danger-color)', color: 'black' }}>
                        <Trash2 size={18} /> Hapus Semua Data
                    </button>
                </section>

                {/* Update Section */}
                <section className="settings-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><RotateCw size={20} /> Update Aplikasi</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{updateStatus || `Versi Saat Ini: ${appVersion}`}</p>

                    {updateProgress > 0 && updateProgress < 100 && (
                        <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${updateProgress}%`, height: '100%', background: 'var(--accent-color)' }}></div>
                        </div>
                    )}

                    <button className="primary-btn" onClick={handleCheckUpdate}>
                        <Download size={18} /> {isUpdateReady ? 'Instal Update' : 'Cek Perbaruan'}
                    </button>
                </section>

                {/* Print Templates Section */}
                <section className="settings-card" style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Codepen size={20} /> Desain Surat Jalan</h3>
                        <button className="primary-btn secondary" onClick={() => window.electronAPI.openReportDesigner()}>
                            <Plus size={16} /> Buat Baru
                        </button>
                    </div>

                    <div className="history-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama Template</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map(tpl => (
                                    <tr key={tpl.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{tpl.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tpl.trx_type}</div>
                                        </td>
                                        <td>
                                            <div className="status-indicator">
                                                <span className={`status-dot ${tpl.is_active ? 'connected' : ''}`}></span>
                                                {tpl.is_active ? 'Aktif' : 'Non-aktif'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button className="icon-btn" onClick={() => toggleTemplate(tpl)}>
                                                    <Power size={18} color={tpl.is_active ? 'var(--success-color)' : 'var(--text-secondary)'} />
                                                </button>
                                                <button className="icon-btn" onClick={() => window.electronAPI.openReportDesigner(tpl.id)}>
                                                    <Edit size={18} color="var(--accent-color)" />
                                                </button>
                                                <button className="icon-btn" onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}>
                                                    <Trash2 size={18} color="var(--danger-color)" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>

            {/* Password Modal */}
            {isPassModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card mini" style={{ maxWidth: '350px' }}>
                        <div className="modal-header">
                            <h3>Password Required</h3>
                            <button className="close-btn" onClick={() => setIsPassModalOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handlePassSubmit} className="modal-body">
                            <div className="input-group">
                                <label>Masukkan Password</label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    autoFocus
                                    placeholder="Pasi kunci..."
                                />
                            </div>
                            <div className="modal-footer" style={{ padding: '10px 0 0 0', border: 'none', gap: '8px' }}>
                                <button type="button" className="primary-btn secondary" onClick={() => setIsPassModalOpen(false)} style={{ flex: 1 }}>Batal</button>
                                <button type="submit" className="primary-btn" style={{ flex: 1 }}>Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SQL Console Modal */}
            {isSqlModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card" style={{ maxWidth: '900px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>SQL Console (Advanced)</h3>
                            <button className="close-btn" onClick={() => setIsSqlModalOpen(false)}><X /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                <Terminal size={12} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                Gunakan fitur ini dengan hati-hati. Query yang salah dapat merusak struktur data.
                            </p>
                            <div className="input-group">
                                <textarea
                                    rows="5"
                                    style={{ fontFamily: 'monospace', fontSize: '14px', background: 'rgba(0,0,0,0.2)' }}
                                    value={sqlQuery}
                                    onChange={(e) => setSqlQuery(e.target.value)}
                                    placeholder="Contoh: SELECT * FROM weights LIMIT 10"
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                                <span style={{
                                    color: queryStatus.type === 'error' ? 'var(--danger-color)' :
                                        queryStatus.type === 'success' ? 'var(--success-color)' : 'var(--text-secondary)',
                                    fontSize: '0.85rem'
                                }}>
                                    {queryStatus.message}
                                </span>
                                <button className="primary-btn" onClick={handleExecuteSql}>
                                    <Terminal size={16} /> Run Query
                                </button>
                            </div>
                            {renderSqlResultTable()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
