import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Power, Save, X, Truck, User, Package, Hash, Weight, Info } from 'lucide-react';

const Timbangan = () => {
    const [weight, setWeight] = useState(0);
    const [rawData, setRawData] = useState('Menunggu data...');
    const [ports, setPorts] = useState([]);
    const [selectedPort, setSelectedPort] = useState('');
    const [baudRate, setBaudRate] = useState(9600);
    const [isConnected, setIsConnected] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal Fields
    const [currentStage, setCurrentStage] = useState(1);
    const [partyName, setPartyName] = useState('');
    const [productName, setProductName] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [notedWeight, setNotedWeight] = useState('');
    const [trxType, setTrxType] = useState('Pembelian');
    const [refaksi, setRefaksi] = useState(0);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [selectedPendingId, setSelectedPendingId] = useState('');
    const [selectedPendingData, setSelectedPendingData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const lastParsedTime = useRef(0);

    useEffect(() => {
        refreshPorts();

        // Restore connection status from backend
        const checkConnection = async () => {
            const status = await window.electronAPI.getPortStatus();
            if (status.isConnected) {
                setIsConnected(true);
                setSelectedPort(status.path);
                if (status.baudRate) setBaudRate(status.baudRate);
            }
        };
        checkConnection();

        const unsubscribeData = window.electronAPI.onPortData((data) => {
            lastParsedTime.current = Date.now();
            updateDisplay(data);
        });

        const unsubscribeRaw = window.electronAPI.onPortDataRaw((data) => {
            if (Date.now() - lastParsedTime.current > 2000) {
                updateDisplay(data);
            }
        });

        const unsubscribeError = window.electronAPI.onPortError((error) => {
            alert(`Error: ${error}`);
            setIsConnected(false);
        });

        const unsubscribeConnected = window.electronAPI.onPortConnected(() => {
            setIsConnected(true);
        });

        // Initial connection status
        // Note: App.jsx already tracks this, but Timbangan.jsx might need it for local UI
        // We can sync with App.jsx or just use the event emitter

        return () => {
            unsubscribeData();
            unsubscribeRaw();
            unsubscribeError();
            unsubscribeConnected();
        };
    }, []);

    const refreshPorts = async () => {
        const list = await window.electronAPI.listPorts();
        setPorts(list);
        if (list.length > 0 && !selectedPort) {
            // Don't auto-select to avoid accidental connection
        }
    };

    const handleConnect = () => {
        if (isConnected) {
            window.electronAPI.disconnectPort();
            setIsConnected(false);
        } else {
            if (!selectedPort) {
                alert('Silakan pilih port terlebih dahulu!');
                return;
            }
            window.electronAPI.connectPort({ path: selectedPort, baudRate: parseInt(baudRate) });
        }
    };

    const updateDisplay = (data) => {
        if (!data) return;
        const sanitized = data.replace(/[^\x20-\x7E]/g, '').trim();
        if (sanitized) {
            setRawData(sanitized);
        }

        try {
            if (sanitized.length < 8) return;
            let isNegative = sanitized.startsWith('-');
            let coreValue = sanitized.substring(1, 7);
            let nilai = parseInt(coreValue);
            if (isNaN(nilai)) return;
            setWeight(isNegative ? -nilai : nilai);
        } catch (e) {
            console.error('Error parsing weight:', e);
        }
    };

    const openSaveModal = () => {
        // Reset Modal
        setPartyName('');
        setProductName('');
        setPlateNumber('');
        setNotedWeight('');
        setTrxType('Pembelian');
        setRefaksi(0);
        setCurrentStage(1);
        setSelectedPendingId('');
        setSelectedPendingData(null);

        setIsModalOpen(true);
    };

    const handleStageChange = async (stage) => {
        setCurrentStage(stage);
        setSearchTerm('');
        if (stage === 2) {
            const pending = await window.electronAPI.getPendingWeights();
            setPendingRecords(pending);
        }
    };

    const handlePendingSelect = (e) => {
        const id = e.target.value;
        setSelectedPendingId(id);
        const record = pendingRecords.find(r => r.id === parseInt(id));
        if (record) {
            setSelectedPendingData(record);
            setPartyName(record.party_name);
            setProductName(record.product_name || '');
            setPlateNumber(record.plate_number);
            setTrxType(record.trx_type);
            setNotedWeight(record.noted_weight || '');
        } else {
            setSelectedPendingData(null);
        }
    };

    const handleConfirmSave = async () => {
        const data = {
            unit: 'kg',
            party_name: partyName,
            product_name: productName,
            driver_name: '-',
            plate_number: plateNumber,
            noted_weight: parseFloat(notedWeight) || 0,
            price: 0,
            trx_type: trxType,
            refaksi: refaksi,
            notes: ''
        };

        if (currentStage === 1) {
            data.weight_1 = weight;
            data.weight = weight;
            data.diff_weight = weight - data.noted_weight;
        } else {
            if (!selectedPendingData) {
                alert('Pilih rekaman timbang pertama!');
                return;
            }
            data.id = selectedPendingData.id;
            data.weight_2 = weight;

            const weight1 = selectedPendingData.weight_1;
            let grossWeight = Math.abs(trxType === 'Pembelian' ? weight1 - weight : weight - weight1);

            const refaksiPercent = parseFloat(refaksi) || 0;
            const deduction = Math.round(grossWeight * (refaksiPercent / 100));

            data.weight = grossWeight - deduction;
            data.diff_weight = data.weight - data.noted_weight;
        }

        const result = await window.electronAPI.saveWeight(data);
        if (result.success) {
            setIsModalOpen(false);
            // alert('Berhasil disimpan!');

            // Auto Print logic
            const settings = await window.electronAPI.getSettings();
            const history = await window.electronAPI.getHistoryById(result.id);
            const printData = {
                ...history,
                timestamp: new Date().toLocaleString('id-ID'),
                companyName: settings.company_name,
                companyAddress: settings.company_address,
                companyPhone: settings.company_phone
            };
            window.electronAPI.printSuratJalan(printData);
        } else {
            alert('Gagal menyimpan: ' + result.error);
        }
    };

    const calculateNetPreview = () => {
        if (!selectedPendingData) return 0;
        const weight1 = selectedPendingData.weight_1;
        let net = Math.abs(trxType === 'Pembelian' ? weight1 - weight : weight - weight1);
        if (refaksi > 0) {
            net = net - Math.round(net * (refaksi / 100));
        }
        return Math.round(net);
    };

    return (
        <div className="tab-view active">
            <header className="view-header">
                <h2>Live Dashboard</h2>
                <div className="header-actions">
                    <button className="icon-btn" title="Refresh Ports" onClick={refreshPorts}>
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="stats-column">
                    <section className="weight-card">
                        <div className="weight-main">
                            <span id="weight-value">{weight.toString().padStart(1, '0')}</span>
                            <span className="weight-unit">kg</span>
                        </div>
                        <button className="primary-btn secondary" onClick={openSaveModal}>
                            <Save size={18} />
                            Simpan Hasil
                        </button>
                    </section>

                    <section className="raw-data-section">
                        <label>Raw Data Stream</label>
                        <div id="raw-data" className="raw-data-box">{rawData}</div>
                    </section>
                </div>

                <aside className="settings-panel">
                    <div className="settings-card">
                        <label>Configuration</label>

                        <div className="input-group">
                            <span>Serial Port</span>
                            <select
                                value={selectedPort}
                                onChange={(e) => setSelectedPort(e.target.value)}
                                disabled={isConnected}
                            >
                                <option value="" disabled>Pilih Port...</option>
                                {ports.map((port) => (
                                    <option key={port.path} value={port.path}>
                                        {port.path} ({port.friendlyName || 'Unknown'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="input-group">
                            <span>Baud Rate</span>
                            <select
                                value={baudRate}
                                onChange={(e) => setBaudRate(e.target.value)}
                                disabled={isConnected}
                            >
                                <option value="9600">9600</option>
                                <option value="19200">19200</option>
                                <option value="38400">38400</option>
                                <option value="57600">57600</option>
                                <option value="115200">115200</option>
                            </select>
                        </div>

                        <button
                            className={`primary-btn ${isConnected ? 'disconnect' : ''}`}
                            onClick={handleConnect}
                        >
                            <Power size={18} />
                            {isConnected ? 'Putuskan' : 'Hubungkan'}
                        </button>
                    </div>
                </aside>
            </div>

            {/* Save Modal */}
            {isModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Simpan Rekaman Timbangan</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-tabs-mini">
                                <button
                                    className={`stage-btn ${currentStage === 1 ? 'active' : ''}`}
                                    onClick={() => handleStageChange(1)}
                                >
                                    Timbang Pertama
                                </button>
                                <button
                                    className={`stage-btn ${currentStage === 2 ? 'active' : ''}`}
                                    onClick={() => handleStageChange(2)}
                                >
                                    Timbang Kedua
                                </button>
                            </div>

                            {currentStage === 2 && (
                                <div className="pending-area">
                                    <label>Pilih Data Timbang Pertama</label>
                                    <div className="searchable-group">
                                        <input
                                            type="text"
                                            className="modal-search-input"
                                            placeholder="Cari Plat / Doc / Pelanggan..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <select
                                            className="modal-select"
                                            value={selectedPendingId}
                                            onChange={handlePendingSelect}
                                        >
                                            <option value="">-- {pendingRecords.filter(r =>
                                                r.doc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                r.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                r.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                (r.product_name && r.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            ).length} Rekaman Ditemukan --</option>
                                            {pendingRecords
                                                .filter(r =>
                                                    r.doc_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    r.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    r.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    (r.product_name && r.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                )
                                                .map(r => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.doc_number} - 🚚 {r.plate_number} - {r.product_name} ({Math.round(r.weight_1)} kg)
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className={`modal-weight-preview-grid ${currentStage === 2 ? 'triple' : ''}`}>
                                <div className="modal-weight-preview">
                                    <span className="label">Berat Sekarang</span>
                                    <div className="value">{Math.round(weight)} kg</div>
                                </div>
                                {currentStage === 2 && (
                                    <>
                                        <div className="modal-weight-preview secondary">
                                            <span className="label">Berat Pertama</span>
                                            <div className="value">{Math.round(selectedPendingData?.weight_1 || 0)} kg</div>
                                        </div>
                                        <div className="modal-weight-preview accent">
                                            <span className="label">Berat Bersih</span>
                                            <div className="value">{calculateNetPreview()} kg</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="input-grid">
                                <div className="input-group">
                                    <label><User size={14} /> Nama Supplier / Pelanggan</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Budi Santoso"
                                        value={partyName}
                                        onChange={(e) => setPartyName(e.target.value)}
                                        disabled={currentStage === 2}
                                    />
                                </div>
                                <div className="input-group">
                                    <label><Package size={14} /> Jenis Barang</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Jagung Basah"
                                        value={productName}
                                        onChange={(e) => setProductName(e.target.value)}
                                        disabled={currentStage === 2}
                                    />
                                </div>
                                <div className="input-group">
                                    <label><Info size={14} /> Jenis Transaksi</label>
                                    <select
                                        value={trxType}
                                        onChange={(e) => setTrxType(e.target.value)}
                                        disabled={currentStage === 2}
                                    >
                                        <option value="Pembelian">Pembelian</option>
                                        <option value="Penjualan">Penjualan</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label><Truck size={14} /> Nomor Plat Kendaraan</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: B 1234 ABC"
                                        value={plateNumber}
                                        onChange={(e) => setPlateNumber(e.target.value)}
                                        disabled={currentStage === 2}
                                    />
                                </div>
                                <div className="input-group">
                                    <label><Hash size={14} /> Berat Surat Jalan (kg)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={notedWeight}
                                        onChange={(e) => setNotedWeight(e.target.value)}
                                    />
                                </div>
                                {currentStage === 2 && (
                                    <div className="input-group">
                                        <label><Weight size={14} /> Refaksi (%)</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={refaksi}
                                            onChange={(e) => setRefaksi(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="primary-btn secondary"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Batal
                            </button>
                            <button
                                className="primary-btn"
                                onClick={handleConfirmSave}
                            >
                                Konfirmasi Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timbangan;
