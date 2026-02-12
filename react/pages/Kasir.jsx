import React, { useState, useEffect } from 'react';
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    Weight as WeightIcon,
    Package,
    User,
    CheckCircle2,
    X,
    ChevronRight,
    Search as SearchIcon,
    History,
    FileText,
    Clock,
    PlusCircle
} from 'lucide-react';

const Kasir = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [weight, setWeight] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customerName, setCustomerName] = useState('');
    const [receivedAmount, setReceivedAmount] = useState('');
    const [currentDocNumber, setCurrentDocNumber] = useState('');
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [todaySales, setTodaySales] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState({ ID: 0, Nama: 'Pelanggan' });
    const [customers, setCustomers] = useState([]);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');

    // Database Data
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [availableUnits, setAvailableUnits] = useState([]);

    useEffect(() => {
        // Fetch Products from DB
        fetchProducts();

        // Fetch data
        fetchPendingTransactions();
        fetchTodaySales();

        // Initial Transaction
        initNewTransaction();
        fetchCustomers();

        // Sync connection status
        const checkConnection = async () => {
            if (window.electronAPI && window.electronAPI.getPortStatus) {
                const status = await window.electronAPI.getPortStatus();
                setIsConnected(status.isConnected);
            }
        };
        checkConnection();

        if (window.electronAPI && window.electronAPI.onPortData) {
            const unsubscribeData = window.electronAPI.onPortData((data) => {
                parseWeight(data);
            });

            const unsubscribeConnected = window.electronAPI.onPortConnected(() => {
                setIsConnected(true);
            });

            const unsubscribeDisconnected = window.electronAPI.onPortDisconnected(() => {
                setIsConnected(false);
            });

            return () => {
                if (unsubscribeData) unsubscribeData();
                if (unsubscribeConnected) unsubscribeConnected();
                if (unsubscribeDisconnected) unsubscribeDisconnected();
            };
        }
    }, []);

    const fetchProducts = async (q = "") => {
        try {
            const res = await window.electronAPI.getAllProducts({ q, CT: 100, IsSell: 1 });
            setProducts(res.data || []);
        } catch (err) {
            console.error("Gagal mengambil produk:", err);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(searchTerm);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleBarcodeSearch = async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchTerm.trim();
            setSearchTerm(''); // Kosongkan input segera agar scanner bisa lanjut

            if (!query) return;

            try {
                // Cari produk dengan pencarian yang mencakup barcode atau nama
                const res = await window.electronAPI.getAllProducts({ q: query, CT: 10, IsSell: 1 });

                let productToAdd = null;
                const data = res.data || [];

                if (data.length > 0) {
                    // 1. Cek apakah ada yang EXACT Code (barcode) yang cocok sempurna
                    const exactMatch = data.find(p => p.Code === query);
                    if (exactMatch) {
                        productToAdd = exactMatch;
                    }
                    // 2. Jika tidak ada exact code match, tapi cuma ada 1 hasil pencarian
                    else if (data.length === 1) {
                        productToAdd = data[0];
                    }
                }
                // 3. Fallback: jika di list UI cuma muncul 1 barang (karena debounce), pakai itu saja
                else if (products.length === 1) {
                    productToAdd = products[0];
                }

                if (productToAdd) {
                    await addToCart(productToAdd);
                }
            } catch (err) {
                console.error("Gagal cari barcode:", err);
            }
        }
    };

    const parseWeight = (data) => {
        if (!data) return;
        const sanitized = data.replace(/[^\x20-\x7E]/g, '').trim();
        try {
            if (sanitized.length < 8) return;
            let isNegative = sanitized.startsWith('-');
            let coreValue = sanitized.substring(1, 7);
            let nilai = parseInt(coreValue);
            if (!isNaN(nilai)) {
                setWeight(isNegative ? -nilai : nilai);
            }
        } catch (e) {
            console.error('Error parsing weight:', e);
        }
    };

    const addToCart = async (product) => {
        try {
            // Cek Unit di Database
            const units = await window.electronAPI.getItemUnits(product.ID);

            if (units && units.length > 1) {
                // Jika unit > 1, munculkan modal pilih unit
                setSelectedProduct(product);
                setAvailableUnits(units);
                setIsUnitModalOpen(true);
            } else {
                // Jika cuma 1 atau tidak ada, ambil default atau dari product
                const unitToUse = (units && units.length === 1) ? units[0] : null;
                processAddToCart(product, unitToUse);
            }
        } catch (err) {
            console.error("Error addToCart:", err);
            processAddToCart(product);
        }
    };

    const processAddToCart = (product, unitInfo = null) => {
        const unitName = unitInfo ? unitInfo.UnitName : (product.NamaSatuan || 'item');
        const unitPrice = unitInfo ? unitInfo.Price : (product.HargaJual || 0);
        const unitId = unitInfo ? unitInfo.ID : `default-${product.ID}`;

        // Identifikasi item di cart berdasarkan kombinasi Product ID + Unit ID
        const cartKey = `${product.ID}-${unitId}`;

        const existingItem = cart.find(item => item.cartKey === cartKey);

        if (existingItem) {
            setCart(cart.map(item =>
                item.cartKey === cartKey
                    ? { ...item, quantity: item.quantity + (unitName.toLowerCase() === 'kg' ? 0 : 1) }
                    : item
            ));
        } else {
            setCart([...cart, {
                ...product,
                cartKey,
                unitId: unitId,
                unit: unitName,
                price: unitPrice,
                quantity: unitName.toLowerCase() === 'kg' ? 0 : 1
            }]);
        }
        setIsUnitModalOpen(false);
    };

    const removeFromCart = (cartKey) => {
        setCart(cart.filter(item => item.cartKey !== cartKey));
    };

    const updateQuantity = (cartKey, delta) => {
        setCart(cart.map(item => {
            if (item.cartKey === cartKey) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const applyWeightToItem = (cartKey) => {
        setCart(cart.map(item => {
            if (item.cartKey === cartKey) {
                return { ...item, quantity: weight };
            }
            return item;
        }));
    };

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * 0; // No tax assumed
    const total = subtotal + tax;

    // Filter di frontend untuk respon cepat (walau sudah ada debounce fetch)
    const filteredProducts = products;

    const fetchTodaySales = async () => {
        try {
            const total = await window.electronAPI.getTodaySales();
            setTodaySales(total || 0);
        } catch (err) {
            console.error("Gagal ambil total penjualan:", err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await window.electronAPI.getCustomers();
            setCustomers(res || []);
        } catch (err) {
            console.error("Gagal ambil data pelanggan:", err);
        }
    };

    const fetchPendingTransactions = async () => {
        try {
            const res = await window.electronAPI.getPendingTransactions();
            setPendingTransactions(res || []);
        } catch (err) {
            console.error("Gagal ambil transaksi pending:", err);
        }
    };

    const initNewTransaction = async () => {
        try {
            const docNo = await window.electronAPI.createDocNumber('SSORD');
            setCurrentDocNumber(docNo);
            setCart([]);
            setSelectedCustomer({ ID: 0, Nama: 'Pelanggan' });
        } catch (err) {
            console.error("Gagal membuat DocNumber:", err);
        }
    };

    const handleHold = async () => {
        if (cart.length === 0) return;

        try {
            await saveToDatabase(0); // 0 = Pending/Hold
            window.Pesan2("Transaksi berhasil di-tahan", "Berhasil", "info");
            initNewTransaction();
            fetchPendingTransactions();
        } catch (err) {
            console.error("Gagal menahan transaksi:", err);
            window.Pesan2("Gagal menyimpan penahanan", "Error", "danger");
        }
    };

    const loadTransaction = async (trans) => {
        try {
            const details = await window.electronAPI.getTransactionDetails(trans.DocNumber);

            // Map details to cart format
            const loadedCart = details.map(d => ({
                ID: d.ItemID,
                Nama: d.ItemName,
                cartKey: `${d.ItemID}-${d.UnitID}`,
                unitId: d.UnitID,
                unit: d.UnitName,
                price: d.Price,
                quantity: d.Qty
            }));

            setCart(loadedCart);
            setCurrentDocNumber(trans.DocNumber);
            setSelectedCustomer({
                ID: trans.CardID || 0,
                Nama: trans.CardName || 'Pelanggan'
            });
            setIsPendingModalOpen(false);
        } catch (err) {
            console.error("Gagal memuat transaksi:", err);
            window.Pesan2("Gagal memuat data", "Error", "danger");
        }
    };

    const saveToDatabase = async (processedStatus = 0) => {
        const header = {
            DocType: 'SSORD',
            DocNumber: currentDocNumber,
            DocDate: new Date().toISOString().split('T')[0],
            CardID: selectedCustomer.ID,
            CardName: selectedCustomer.Nama,
            Amount: subtotal,
            TotalAmount: total,
            GrandTotal: total,
            Processed: processedStatus,
            TimeCreated: new Date().toLocaleString(),
            Status: 1
        };

        const details = cart.map(item => ({
            DocType: 'SSORD',
            DocNumber: currentDocNumber,
            DocDate: header.DocDate,
            ItemID: item.ID,
            ItemName: item.Nama,
            Qty: item.quantity,
            UnitID: item.unitId,
            UnitName: item.unit,
            Price: item.price,
            Total: item.price * item.quantity,
            Status: 1
        }));

        return await window.electronAPI.saveTransaction({ header, details });
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsCheckoutModalOpen(true);
    };

    const confirmPayment = async () => {
        try {
            await saveToDatabase(1); // 1 = Selesai
            window.Pesan2("Transaksi Berhasil Disimpan!", "Berhasil", "success");
            setCart([]);
            setIsCheckoutModalOpen(false);
            setReceivedAmount('');
            initNewTransaction();
            fetchPendingTransactions();
            fetchTodaySales();
        } catch (err) {
            console.error("Gagal simpan pembayaran:", err);
            window.Pesan2("Gagal menyimpan transaksi", "Error", "danger");
        }
    };

    return (
        <div className="tab-view active kasir-view">
            <header className="view-header">
                <div>
                    <h2>Menu Kasir</h2>
                    <div className="doc-number-badge">
                        <FileText size={14} />
                        {currentDocNumber || 'Menyiapkan...'}
                    </div>
                </div>
                <div className="header-actions">
                    <button className="action-pill-btn secondary" onClick={initNewTransaction}>
                        <PlusCircle size={16} />
                        Baru
                    </button>
                    <button className="action-pill-btn secondary" onClick={() => { fetchPendingTransactions(); setIsPendingModalOpen(true); }}>
                        <Clock size={16} />
                        Antrian ({pendingTransactions.length})
                    </button>
                    <div className="connection-status-pill">
                        <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
                        {isConnected ? 'Scale Ready' : 'Scale Offline'}
                    </div>
                </div>
            </header>

            <div className="kasir-grid">
                {/* Left: Product Selection */}
                <div className="product-section">
                    <div className="search-bar-kasir">
                        <SearchIcon className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Cari Produk atau Barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleBarcodeSearch}
                        />
                    </div>

                    <div className="product-grid-scroll">
                        <div className="product-grid">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.ID}
                                    className="product-tile"
                                    onClick={() => addToCart(product)}
                                >
                                    <span className="product-icon">{product.Nama?.charAt(0).toUpperCase() || 'P'}</span>
                                    <div className="product-info">
                                        <span className="product-category">{product.Code || 'Produk'}</span>
                                        <span className="product-name">{product.Nama}</span>
                                        <span className="product-price">Rp {product.HargaJual?.toLocaleString('id-ID')} / {product.NamaSatuan || 'pcs'}</span>
                                    </div>
                                    <div className="add-indicator">
                                        <Plus size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Cart Section */}
                <div className="cart-section">
                    <div className="cart-card">
                        <div className="cart-header">
                            <div className="cart-title">
                                <ShoppingCart size={22} />
                                <h3>Keranjang Belanja</h3>
                            </div>
                            <span className="cart-count">{cart.length} Item</span>
                        </div>

                        <div className="cart-items">
                            {cart.length === 0 ? (
                                <div className="empty-cart">
                                    <Package size={48} className="empty-icon" />
                                    <p>Keranjang Kosong</p>
                                    <small>Pilih produk di sebelah kiri</small>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.cartKey} className="cart-item">
                                        <div className="item-info">
                                            <span className="item-name">{item.Nama}</span>
                                            <span className="item-price">Rp {item.price.toLocaleString('id-ID')} ({item.unit})</span>
                                        </div>

                                        <div className="item-controls">
                                            {item.unit.toLowerCase() === 'kg' ? (
                                                <div className="weight-input-group">
                                                    <div className="qty-display">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuantity(item.cartKey, parseFloat(e.target.value) - item.quantity)}
                                                        />
                                                        <span>kg</span>
                                                    </div>
                                                    <button
                                                        className="weight-capture-btn"
                                                        title="Ambil Berat dari Timbangan"
                                                        onClick={() => applyWeightToItem(item.cartKey)}
                                                    >
                                                        <WeightIcon size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="qty-controls">
                                                    <button onClick={() => updateQuantity(item.cartKey, -1)}><Minus size={14} /></button>
                                                    <span className="qty-value">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.cartKey, 1)}><Plus size={14} /></button>
                                                </div>
                                            )}

                                            <div className="item-total">
                                                Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                            </div>

                                            <button
                                                className="remove-item-btn"
                                                onClick={() => removeFromCart(item.cartKey)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="cart-footer">
                            <div className="summary-line">
                                <span>Subtotal</span>
                                <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="summary-line total">
                                <span>Total Tagihan</span>
                                <span>Rp {total.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="cart-action-grid">
                                <button
                                    className="hold-button"
                                    disabled={cart.length === 0}
                                    onClick={handleHold}
                                >
                                    <Clock size={20} />
                                    Tahan
                                </button>
                                <button
                                    className="checkout-button"
                                    disabled={cart.length === 0}
                                    onClick={handleCheckout}
                                >
                                    <Banknote size={20} />
                                    Bayar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Replacement: Sales Summary instead of Live Weight */}
                    <div className="daily-sales-summary">
                        <div className="label">
                            <Banknote size={16} />
                            PENJUALAN HARI INI
                        </div>
                        <div className="value">
                            Rp {todaySales.toLocaleString('id-ID')}
                        </div>
                    </div>

                </div>
            </div>

            {/* Unit Selection Modal */}
            {isUnitModalOpen && selectedProduct && (
                <div className="modal-overlay active">
                    <div className="modal-card mini">
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Pilih Satuan</h3>
                                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{selectedProduct.Nama}</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsUnitModalOpen(false)}><X /></button>
                        </div>
                        <div className="modal-body">
                            <div className="unit-grid">
                                {availableUnits.map(unit => (
                                    <button
                                        key={unit.ID}
                                        className="unit-option-btn"
                                        onClick={() => processAddToCart(selectedProduct, unit)}
                                    >
                                        <div className="unit-name-big">{unit.UnitName}</div>
                                        <div className="unit-price-big">Rp {unit.Price.toLocaleString('id-ID')}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {isCheckoutModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card">
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <ShoppingCart size={24} color="var(--accent-color)" />
                                </div>
                                <h3 style={{ margin: 0 }}>Konfirmasi Pembayaran</h3>
                            </div>
                            <button className="close-btn" onClick={() => setIsCheckoutModalOpen(false)}><X /></button>
                        </div>
                        <div className="modal-body">
                            <div className="checkout-grid">
                                {/* Left Side: Order Summary */}
                                <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '24px' }}>
                                    <div className="checkout-section-title">
                                        <FileText size={16} /> Order Summary
                                    </div>
                                    <div className="checkout-summary" style={{ marginBottom: '20px' }}>
                                        <div className="total-display">
                                            <span className="label">Total Tagihan</span>
                                            <div className="amount" style={{ fontSize: '2.5rem' }}>Rp {total.toLocaleString('id-ID')}</div>
                                        </div>
                                    </div>

                                    <div className="checkout-section-title">
                                        <User size={16} /> Informasi Pelanggan
                                    </div>
                                    <button
                                        className="customer-picker-btn"
                                        onClick={() => setIsCustomerModalOpen(true)}
                                    >
                                        <div className="customer-info-mini">
                                            <span className="label-text">Pelanggan Dipilih</span>
                                            <span className="name-text">{selectedCustomer.Nama}</span>
                                        </div>
                                        <ChevronRight size={20} color="#94a3b8" />
                                    </button>
                                </div>

                                {/* Right Side: Payment Input */}
                                <div style={{ paddingLeft: '8px' }}>
                                    <div className="checkout-section-title">
                                        <Banknote size={16} /> Ringkasan Pembayaran
                                    </div>

                                    <div className="input-grid" style={{ gridTemplateColumns: '1fr' }}>
                                        <div className="input-group">
                                            <label>Nominal Tunai Diterima</label>
                                            <div className="received-input">
                                                <span className="currency">Rp</span>
                                                <input
                                                    type="number"
                                                    placeholder="Contoh: 50.000"
                                                    value={receivedAmount}
                                                    onChange={(e) => setReceivedAmount(e.target.value)}
                                                    style={{ height: '70px', fontSize: '2rem' }}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '24px' }}>
                                        {parseFloat(receivedAmount) > 0 && (
                                            <div className="change-preview" style={{
                                                padding: '20px',
                                                borderRadius: '16px',
                                                background: parseFloat(receivedAmount) >= total ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                                                color: parseFloat(receivedAmount) >= total ? 'var(--success-color)' : 'var(--danger-color)',
                                                marginBottom: '24px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700 }}>{parseFloat(receivedAmount) >= total ? 'Kembalian' : 'Kurang'}</span>
                                                    <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                                                        Rp {Math.abs(parseFloat(receivedAmount) - total).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            className="confirm-checkout-btn"
                                            onClick={confirmPayment}
                                            disabled={!receivedAmount || parseFloat(receivedAmount) < total}
                                            style={{ height: '64px', fontSize: '1.25rem' }}
                                        >
                                            <CheckCircle2 size={24} />
                                            Selesaikan Transaksi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Selection Modal */}
            {isCustomerModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card mini" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Pilih Pelanggan</h3>
                                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Daftar pelanggan dari database</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsCustomerModalOpen(false)}><X /></button>
                        </div>
                        <div className="modal-body">
                            <div className="search-bar-kasir" style={{ marginBottom: '16px' }}>
                                <SearchIcon className="search-icon" size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari Nama Pelanggan..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    style={{ height: '44px' }}
                                />
                            </div>
                            <div className="customer-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <div
                                    className={`customer-item ${selectedCustomer.ID === 0 ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedCustomer({ ID: 0, Nama: 'Pelanggan' });
                                        setIsCustomerModalOpen(false);
                                    }}
                                >
                                    <span>Umum / Pelanggan</span>
                                    {selectedCustomer.ID === 0 && <CheckCircle2 size={16} color="var(--accent-color)" />}
                                </div>
                                {customers
                                    .filter(c => c.Nama.toLowerCase().includes(customerSearch.toLowerCase()))
                                    .map(cust => (
                                        <div
                                            key={cust.ID}
                                            className={`customer-item ${selectedCustomer.ID === cust.ID ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedCustomer(cust);
                                                setIsCustomerModalOpen(false);
                                            }}
                                        >
                                            <span>{cust.Nama}</span>
                                            {selectedCustomer.ID === cust.ID && <CheckCircle2 size={16} color="var(--accent-color)" />}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Transactions Modal */}
            {isPendingModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal-card">
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Antrian Transaksi</h3>
                                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Transaksi yang belum selesai diproses</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsPendingModalOpen(false)}><X /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {pendingTransactions.length === 0 ? (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                                    <History size={48} style={{ color: '#475569', marginBottom: '16px' }} />
                                    <p>Tidak ada transaksi yang ditahan</p>
                                </div>
                            ) : (
                                <div className="pending-list">
                                    {pendingTransactions.map(trans => (
                                        <div key={trans.DocNumber} className="pending-item">
                                            <div className="pending-info">
                                                <div className="pending-doc">{trans.DocNumber}</div>
                                                <div className="pending-meta">
                                                    <span><User size={12} /> {trans.CardName}</span>
                                                    <span><Clock size={12} /> {trans.TimeCreated}</span>
                                                </div>
                                            </div>
                                            <div className="pending-amount">
                                                Rp {trans.TotalAmount.toLocaleString('id-ID')}
                                            </div>
                                            <button className="load-trans-btn" onClick={() => loadTransaction(trans)}>
                                                Lanjutkan <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default Kasir;
