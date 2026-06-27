import { Hash, Info, Package, Power, RefreshCw, Save, Truck, User, Weight, X } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import { searchDatabase } from '../Database';
import { useToast } from '../hooks/useToast';
import { useWebSocketLog } from '../hooks/useWebSocketLog';
import { apiGo, isTokenValid } from '../utils/tokenUtils';

const customSelectStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderColor: state.isFocused ? 'var(--accent-color)' : 'var(--border-color)',
        borderRadius: state.menuIsOpen ? '12px 12px 0 0' : '12px',
        padding: '2px',
        boxShadow: state.isFocused ? '0 0 0 1px var(--accent-color)' : 'none',
        '&:hover': {
            borderColor: 'var(--accent-color)'
        }
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--accent-color)',
        borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        margin: 0,
        overflow: 'hidden',
        zIndex: 9999,
        boxSizing: 'border-box',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--accent-color)'
    }),
    menuPortal: (provided) => ({
        ...provided,
        zIndex: 9999
    }),
    menuList: (provided) => ({
        ...provided,
        padding: 0
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? 'var(--accent-color)'
            : state.isFocused
                ? 'rgba(148, 163, 184, 0.1)'
                : 'transparent',
        color: state.isSelected ? '#0f172a' : 'var(--text-primary)',
        cursor: 'pointer',
        padding: '10px 10px',
        '&:active': {
            backgroundColor: 'var(--accent-color)',
            color: '#0f172a'
        }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: 'var(--text-primary)'
    }),
    input: (provided) => ({
        ...provided,
        color: 'var(--text-primary)'
    }),
    placeholder: (provided) => ({
        ...provided,
        color: 'var(--text-secondary)'
    })
};

const Timbangan = () => {
    const toast = useToast();
    const { addLog } = useWebSocketLog();
    const [weight, setWeight] = useState(0);
    const [rawData, setRawData] = useState('Menunggu data...');
    const [ports, setPorts] = useState([]);
    const [selectedPort, setSelectedPort] = useState('');
    const [baudRate, setBaudRate] = useState(9600);
    const [isConnected, setIsConnected] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const wsRef = useRef(null);
    const lastSentWeight = useRef(null);
    const connectedTokenRef = useRef(null);


    // Modal Fields
    const [currentStage, setCurrentStage] = useState(1);
    const [partyName, setPartyName] = useState('');
    const [productName, setProductName] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [notedWeight, setNotedWeight] = useState('');
    const [trxType, setTrxType] = useState('Pembelian');
    const [refaksi, setRefaksi] = useState(0);
    const [cardId, setCardId] = useState(0);
    const [itemId, setItemId] = useState(0);
    const [pendingRecords, setPendingRecords] = useState([]);
    const [selectedPendingId, setSelectedPendingId] = useState('');
    const [selectedPendingData, setSelectedPendingData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [partyList, setPartyList] = useState([]);
    const [dataCard, setDataCard] = useState([]);
    const [dataCustomer, setDataCustomer] = useState([]);
    const [dataSuplier, setDataSuplier] = useState([]);
    const [dataItem, setDataItem] = useState([]);

    const lastParsedTime = useRef(0);
    const divisorRef = useRef(1);

    useEffect(() => {
        refreshPorts();

        // Load settings and serial divisor
        const loadSettings = async () => {
            try {
                const settings = await window.electronAPI.getSettings();
                if (settings && settings.serial_divisor) {
                    const parsed = parseFloat(settings.serial_divisor);
                    if (!isNaN(parsed) && parsed > 0) {
                        divisorRef.current = parsed;
                    }
                }
            } catch (err) {
                console.error('Failed to load divisor settings:', err);
            }
        };
        loadSettings();

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
            toast.error(`Koneksi Error: ${error}`);
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

    // WebSocket Connection and Event Handling
    useEffect(() => {
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
                    connectedTokenRef.current = null;
                    return;
                }

                // If already connected or connecting with the same token, do nothing
                if (wsRef.current &&
                    (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) &&
                    connectedTokenRef.current === token) {
                    return;
                }

                if (wsRef.current) {
                    wsRef.current.close();
                }

                connectedTokenRef.current = token;
                const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const wsUrl = isDev
                    ? `ws://localhost:3003/ws?token=${encodeURIComponent(token)}`
                    : `wss://ws.naylatools.com/ws?token=${encodeURIComponent(token)}`;

                console.log('Connecting to WebSocket:', wsUrl);
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    if (isMounted) {
                        console.log('WebSocket connected successfully');
                        addLog({ type: 'connect', message: `Terhubung ke ${wsUrl.replace(/token=.*/, 'token=***')}` });
                        // Force resending current weight on connect
                        lastSentWeight.current = null;
                    }
                };

                ws.onclose = () => {
                    if (isMounted) {
                        console.log('WebSocket disconnected. Retrying in 5s...');
                        addLog({ type: 'disconnect', message: 'Koneksi terputus. Reconnect dalam 5 detik...' });
                        reconnectTimeout = setTimeout(connect, 5000);
                    }
                };

                ws.onerror = (err) => {
                    if (isMounted) {
                        console.error('WebSocket error:', err);
                        addLog({ type: 'error', message: 'WebSocket error', data: { type: err.type || 'unknown' } });
                    }
                };
            } catch (err) {
                console.error('WebSocket connection setup failed:', err);
                if (isMounted) reconnectTimeout = setTimeout(connect, 5000);
            }
        };

        connect();

        // Periodically refresh/validate token in case it was updated in Settings
        const intervalId = setInterval(connect, 5000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            connectedTokenRef.current = null;
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
                toast.warning('Silakan pilih port terlebih dahulu!');
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
            let coreValue = sanitized.substring(1, 8);
            let nilai = parseInt(coreValue);
            if (isNaN(nilai)) return;
            let parsedWeight = isNegative ? -nilai : nilai;
            const divisor = divisorRef.current;
            if (divisor && divisor !== 1) {
                parsedWeight = parseFloat((parsedWeight / divisor).toFixed(4));
            }
            setWeight(parsedWeight);

            if (lastSentWeight.current !== parsedWeight) {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const payload = { type: "timbangan_change", nilai: parsedWeight };
                    wsRef.current.send(JSON.stringify(payload));
                    lastSentWeight.current = parsedWeight;
                    addLog({ type: 'send', message: `timbangan_change → ${parsedWeight} kg`, data: payload });
                }
            }
        } catch (e) {
            console.error('Error parsing weight or sending to WebSocket:', e);
        }
    };

    const fetchPartyList = async () => {
        try {
            const query = `SELECT party_name FROM weights WHERE party_name IS NOT NULL AND party_name != '' GROUP BY party_name ORDER BY party_name ASC`;
            const result = await window.electronAPI.executeSql(query);
            if (result.success) {
                setPartyList(result.data.map(r => r.party_name));
            }
        } catch (error) {
            console.error('Failed to fetch party list:', error);
        }
    };

    const openSaveModal = async () => {
        // Reset Modal
        let Customer = await searchDatabase("MasterPelanggan", {});
        let Suplier = await searchDatabase("MasterSuplier", {});
        let Item = await searchDatabase("MasterItem", {});
        setDataCustomer(Customer);
        setDataSuplier(Suplier);
        setDataItem(Item);
        setPartyName('');
        setProductName('');
        setPlateNumber('');
        setNotedWeight('');
        setTrxType('Pembelian');
        setRefaksi(0);
        setCardId(0);
        setItemId(0);
        setCurrentStage(1);
        setSelectedPendingId('');
        setSelectedPendingData(null);

        setIsModalOpen(true);
        fetchPartyList();
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
            setItemId(record.ItemID || 0);
            setCardId(record.CardID || 0);
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
            notes: '',
            CardID: cardId,
            ItemID: itemId
        };

        let startWeight = 0;
        if (currentStage === 1) {
            data.weight_1 = weight;
            data.weight = weight;
            data.diff_weight = weight - data.noted_weight;
            startWeight = weight;
        } else {
            if (!selectedPendingData) {
                toast.warning('Pilih rekaman timbang pertama!');
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
            startWeight = weight1;
        }

        const result = await window.electronAPI.saveWeight(data);
        console.log(result);
        if (result.success) {
            setIsModalOpen(false);
            toast.success('Berhasil disimpan!');

            // Get settings to check token
            const settings = await window.electronAPI.getSettings();

            // Send to server only if token exists and is valid
            if (settings?.naylatools_token && isTokenValid(settings.naylatools_token)) {
                try {
                    const serverData = new URLSearchParams();
                    serverData.append('DocType', trxType == "Pembelian" ? "Masuk" : "Keluar");
                    // Format date as YYYY-mm-dd
                    const docDate = new Date().toISOString().split('T')[0];

                    let responseData = await apiGo("transTimbanganCrud", {
                        'act': currentStage == 1 ? 'input' : 'update',
                        'DocType': trxType == "Pembelian" ? "Masuk" : "Keluar",
                        'DocDate': docDate,
                        'CardID': cardId || 0,
                        'CardName': partyName,
                        'ItemID': itemId || 0,
                        'ItemName': productName,
                        'Qty': data.weight,
                        'QtyUnit': 'kg',
                        'UnitName': 'kg',
                        'Price': data.price,
                        'Total': data.weight * data.price,
                        'NotaWeight': data.noted_weight,
                        'StartWeight': startWeight,
                        'EndWeight': weight,
                        'PlatNomer': plateNumber,
                        'Driver': data.driver_name,
                        'Kendaraan': plateNumber,
                        'DocNumber': result.DocNumber,
                        'Refraksi': refaksi,
                    });

                    console.log(responseData);

                    if (responseData && (responseData.status === 'sukses' || responseData.success)) {
                        toast.success('Data tersinkronisasi ke server!');
                        addLog({ type: 'receive', message: 'Server sync sukses', data: responseData });
                        if (responseData.DocNumber) await window.electronAPI.updateDocNumber({ DocNumberReff: responseData.DocNumber, doc_number: result.DocNumber });
                    } else if (responseData && responseData.pesan) {
                        toast.error(`Server: ${responseData.pesan}`);
                        addLog({ type: 'error', message: `Server: ${responseData.pesan}`, data: responseData });
                    } else {
                        toast.error(`Server error: ${response.status}`);
                        addLog({ type: 'error', message: `Server error: HTTP ${response.status}` });
                    }
                } catch (err) {
                    toast.error(`Gagal sinkronisasi: ${err.message}`);
                    addLog({ type: 'error', message: `Gagal sinkronisasi: ${err.message}` });
                }
            } else if (settings?.naylatools_token && !isTokenValid(settings.naylatools_token)) {
                // Token exists but is invalid/expired
                toast.warning('Token telah kadaluarsa. Silakan login kembali untuk sinkronisasi server.');
                // Optionally clear the invalid token
                await window.electronAPI.saveSettings({ naylatools_token: '' });
            }

            // Auto Print logic
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
            toast.error(`Gagal menyimpan: ${result.error}`);
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
                            <Save size={18} /> Simpan Hasil
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Serial Port</span>
                                <button
                                    className="icon-btn"
                                    title="Refresh Ports"
                                    onClick={refreshPorts}
                                    disabled={isConnected}
                                    style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                            <select value={selectedPort} onChange={(e) => setSelectedPort(e.target.value)} disabled={isConnected}>
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
                            <select value={baudRate} onChange={(e) => setBaudRate(e.target.value)} disabled={isConnected}>
                                <option value="9600">9600</option>
                                <option value="19200">19200</option>
                                <option value="38400">38400</option>
                                <option value="57600">57600</option>
                                <option value="115200">115200</option>
                            </select>
                        </div>

                        <button className={`primary-btn ${isConnected ? 'disconnect' : ''}`} onClick={handleConnect}>
                            <Power size={18} /> {isConnected ? 'Putuskan' : 'Hubungkan'}
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
                                <button className={`stage-btn ${currentStage === 1 ? 'active' : ''}`} onClick={() => handleStageChange(1)}>Timbang Pertama</button>
                                <button className={`stage-btn ${currentStage === 2 ? 'active' : ''}`} onClick={() => handleStageChange(2)}>Timbang Kedua</button>
                            </div>

                            {currentStage === 2 && (
                                <div className="pending-area">
                                    <label>Pilih Data Timbang Pertama</label>
                                    <Select
                                        options={pendingRecords.map((item) => ({
                                            value: item.id,
                                            label: `${item.doc_number} - 🚚 ${item.plate_number} - ${item.product_name} (${Math.round(item.weight_1)} kg)`
                                        }))}
                                        value={selectedPendingId ? {
                                            value: selectedPendingId,
                                            label: pendingRecords.find(r => r.id === parseInt(selectedPendingId))
                                                ? `${pendingRecords.find(r => r.id === parseInt(selectedPendingId)).doc_number} - 🚚 ${pendingRecords.find(r => r.id === parseInt(selectedPendingId)).plate_number} - ${pendingRecords.find(r => r.id === parseInt(selectedPendingId)).product_name} (${Math.round(pendingRecords.find(r => r.id === parseInt(selectedPendingId)).weight_1)} kg)`
                                                : ''
                                        } : null}
                                        onChange={(option) => handlePendingSelect({ target: { value: option ? option.value : '' } })}
                                        placeholder="Cari Plat / Doc / Pelanggan..."
                                        styles={customSelectStyles}
                                        isClearable
                                        isSearchable
                                        menuPortalTarget={document.body}
                                    />
                                </div>
                            )}

                            <div className={`modal-weight-preview-grid ${currentStage === 2 ? 'triple' : ''}`}>
                                <div className="modal-weight-preview">
                                    <span className="label">Berat Sekarang</span>
                                    <div className="value">{Math.round(weight)} kg</div>
                                </div>
                                {currentStage === 2 && (
                                    <Fragment>
                                        <div className="modal-weight-preview secondary">
                                            <span className="label">Berat Pertama</span>
                                            <div className="value">{Math.round(selectedPendingData?.weight_1 || 0)} kg</div>
                                        </div>
                                        <div className="modal-weight-preview accent">
                                            <span className="label">Berat Bersih</span>
                                            <div className="value">{calculateNetPreview()} kg</div>
                                        </div>
                                    </Fragment>
                                )}
                            </div>

                            <div className="input-grid">
                                <div className="input-group">
                                    <label><Info size={14} /> Jenis Transaksi</label>
                                    <select value={trxType} onChange={(e) => setTrxType(e.target.value)} disabled={currentStage === 2}>
                                        <option value="Pembelian">Pembelian</option>
                                        <option value="Penjualan">Penjualan</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label style={{ marginBottom: 0 }}><User size={14} /> {trxType === "Pembelian" ? "Suplier" : "Pelanggan"}</label>
                                    <Select
                                        options={trxType === "Pembelian" ?
                                            dataSuplier.map((item) => ({
                                                value: item.ID,
                                                label: `${item.MemberCode} - ${item.Nama} (${item.Telp})`,
                                                itemData: item
                                            })) : dataCustomer.map((item) => ({
                                                value: item.ID,
                                                label: `${item.MemberCode} - ${item.Nama} (${item.Telp})`,
                                                itemData: item
                                            }))
                                        }
                                        value={cardId ? {
                                            value: cardId,
                                            label: (trxType === "Pembelian" ? dataSuplier : dataCustomer).find(c => c.ID === cardId)
                                                ? `${(trxType === "Pembelian" ? dataSuplier : dataCustomer).find(c => c.ID === cardId).MemberCode} - ${(trxType === "Pembelian" ? dataSuplier : dataCustomer).find(c => c.ID === cardId).Nama} (${(trxType === "Pembelian" ? dataSuplier : dataCustomer).find(c => c.ID === cardId).Telp})`
                                                : partyName
                                        } : null}
                                        onChange={(option) => {
                                            if (option) {
                                                setCardId(option.value);
                                                setPartyName(option.itemData.Nama);
                                            } else {
                                                setCardId(0);
                                                setPartyName('');
                                            }
                                        }}
                                        placeholder="Cari Pelanggan / Suplier..."
                                        styles={customSelectStyles}
                                        isClearable
                                        isSearchable
                                        menuPortalTarget={document.body}
                                    />
                                </div>

                                <div className="input-group">
                                    <label><Package size={14} /> Jenis Barang</label>
                                    <Select
                                        options={dataItem.map((item) => ({
                                            value: item.ID,
                                            label: `${item.Code} - ${item.Nama}`,
                                            itemData: item
                                        }))}
                                        value={itemId ? {
                                            value: itemId,
                                            label: dataItem.find(i => i.ID === itemId)
                                                ? `${dataItem.find(i => i.ID === itemId).Code} - ${dataItem.find(i => i.ID === itemId).Nama}`
                                                : productName
                                        } : null}
                                        onChange={(option) => {
                                            if (option) {
                                                setItemId(option.value);
                                                setProductName(option.itemData.Nama);
                                            } else {
                                                setItemId(0);
                                                setProductName('');
                                            }
                                        }}
                                        placeholder="Cari Barang ..."
                                        styles={customSelectStyles}
                                        isClearable
                                        isSearchable
                                        menuPortalTarget={document.body}
                                    />
                                </div>


                                <div className="input-group">
                                    <label><Truck size={14} /> Nomor Plat Kendaraan</label>
                                    <input type="text" placeholder="Contoh: B 1234 ABC" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} disabled={currentStage === 2} />
                                </div>
                                <div className="input-group">
                                    <label><Hash size={14} /> Berat Surat Jalan (kg)</label>
                                    <input type="number" placeholder="0.00" value={notedWeight} onChange={(e) => setNotedWeight(e.target.value)} />
                                </div>
                                {currentStage === 2 && (
                                    <div className="input-group">
                                        <label><Weight size={14} /> Refaksi (%)</label>
                                        <input type="number" placeholder="0" value={refaksi} onChange={(e) => setRefaksi(e.target.value)} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="primary-btn secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                            <button className="primary-btn" onClick={handleConfirmSave}>Konfirmasi Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Timbangan;
