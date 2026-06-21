import { ChevronLeft, ChevronRight, Download, Edit, Package, Printer, Save, Search, Trash2, Truck, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { searchDatabase } from '../Database';
import { useToast } from '../hooks/useToast';
import { apiGo } from '../utils/tokenUtils';

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

const History = () => {
    const toast = useToast();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);

    const today = new Date().toLocaleDateString('sv-SE');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [summary, setSummary] = useState({ totalWeight: 0, totalDiff: 0, count: 0 });
    const [dataCustomer, setDataCustomer] = useState([]);
    const [dataSuplier, setDataSuplier] = useState([]);
    const [dataItem, setDataItem] = useState([]);

    useEffect(() => {
        loadHistory();
    }, [currentPage]);

    const loadHistory = async () => {
        setLoading(true);
        const params = {
            startDate,
            endDate,
            search: searchQuery,
            page: currentPage,
            pageSize
        };

        try {
            const data = await window.electronAPI.getHistory(params);
            const count = await window.electronAPI.getHistoryCount(params);
            const summ = await window.electronAPI.getHistorySummary(params);
            setHistory(data);
            setTotalPages(Math.ceil(count / pageSize) || 1);
            setSummary(summ);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => {
        setCurrentPage(1);
        loadHistory();
    };

    const handleExport = async () => {
        const params = { startDate, endDate, search: searchQuery };
        const result = await window.electronAPI.exportToExcel(params);
        if (result.success) {
            alert('Data berhasil dieksport ke: ' + result.filePath);
        }
    };

    const handlePrint = async (id) => {
        const settings = await window.electronAPI.getSettings();
        const item = await window.electronAPI.getHistoryById(id);
        const printData = {
            ...item,
            companyName: settings.company_name,
            companyAddress: settings.company_address,
            companyPhone: settings.company_phone
        };
        window.electronAPI.printSuratJalan(printData);
    };

    const handleDelete = async (id) => {
        if (confirm('Hapus rekaman ini?')) {
            await window.electronAPI.deleteHistory(id);
            loadHistory();
        }
    };

    const handleEdit = async (item) => {
        const Customer = await searchDatabase("MasterPelanggan", {});
        const Suplier = await searchDatabase("MasterSuplier", {});
        const Item = await searchDatabase("MasterItem", {});
        setDataCustomer(Customer);
        setDataSuplier(Suplier);
        setDataItem(Item);
        setEditingItem({ ...item });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const w1 = parseFloat(editingItem.weight_1) || 0;
            const w2 = parseFloat(editingItem.weight_2) || 0;
            const refaksiVal = parseFloat(editingItem.refaksi) || 0;
            const notedWeight = parseFloat(editingItem.noted_weight) || 0;

            let newWeight = 0;
            if (w2 > 0) {
                const gross = Math.abs(w1 - w2);
                const deduction = Math.round(gross * (refaksiVal / 100));
                newWeight = gross - deduction;
            } else {
                newWeight = w1;
            }

            const updatedData = {
                ...editingItem,
                weight: newWeight,
                diff_weight: newWeight - notedWeight
            };

            const result = await window.electronAPI.updateHistory(updatedData);
            if (result.success) {
                let responseData = await apiGo("transTimbanganCrud", {
                    'act': 'edit',
                    'DocType': editingItem.trx_type === "Pembelian" ? "Masuk" : "Keluar",
                    'DocDate': new Date(editingItem.timestamp || Date.now()).toISOString().split('T')[0],
                    'CardID': editingItem.CardID || 0,
                    'CardName': editingItem.party_name,
                    'ItemID': editingItem.ItemID || 0,
                    'ItemName': editingItem.product_name,
                    'Qty': updatedData.weight,
                    'QtyUnit': 'kg',
                    'UnitName': 'kg',
                    'Price': editingItem.price || 0,
                    'Total': updatedData.weight * (editingItem.price || 0),
                    'NotaWeight': updatedData.diff_weight + updatedData.weight,
                    'StartWeight': editingItem.weight_1 || 0,
                    'EndWeight': editingItem.weight_2 || 0,
                    'PlatNomer': editingItem.plate_number,
                    'Driver': editingItem.driver_name,
                    'Kendaraan': editingItem.plate_number,
                    'DocNumber': editingItem.doc_number,
                    'Refraksi': editingItem.refaksi || 0,
                });

                if (responseData && (responseData.status === 'sukses' || responseData.success)) {
                    toast.success('Data tersinkronisasi ke server!');
                } else if (responseData && responseData.pesan) {
                    toast.error(`Server: ${responseData.pesan}`);
                } else {
                    toast.error(`Server error: ${response.status}`);
                }

                setIsEditModalOpen(false);
                loadHistory();
            } else {
                alert('Gagal mengupdate: ' + result.error);
            }
        } catch (error) {
            console.error('Update Error:', error);
        }
    };

    const getDiffClass = (diff) => {
        if (diff > 0) return 'diff-positive';
        if (diff < 0) return 'diff-negative';
        return 'diff-zero';
    };

    const handleUpload = async () => {
        let data = await window.electronAPI.getAllPendingData();
        if (data.length == 0) return toast.warning('Tidak ada data pending!');
        let ssql = "";
        for (let dd of data) {
            ssql += `("${dd.doc_number}", "${dd.trxType == "Pembelian" ? "Masuk" : "Keluar"}", "${dd.CardID}", "${dd.ItemID}", "${dd.noted_weight}", "${dd.weight}", "${dd.weight_1}", "${dd.weight_2}", "${dd.diff_weight}", "${dd.refaksi}", "${dd.timestamp_1}", "${dd.timestamp_2}", "${dd.driver_name}", "${dd.plate_number}"),`;
        }
        if (ssql != "") {
            let sql = await apiGo("transTimbanganCrud", { act: "import", Data: ssql.replace(/,$/, "") });
            if (sql.status == "sukses") {
                window.electronAPI.updatePendingData(sql.data);
                toast.success(sql.pesan);
            } else {
                toast.warning(sql.pesan);
            }
        } else {
            toast.warning('Tidak ada data pending!');
        }
    }

    return (
        <div className="tab-view active">
            <header className="view-header">
                <h2>Transaction History</h2>
                <div className="filter-bar">
                    <div className="filter-group">
                        <label>Dari:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Sampai:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="search-box">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Cari Nama / No Plat / No Dokumen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={() => { setSearchQuery(''); setCurrentPage(1); loadHistory(); }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button className="primary-btn" onClick={handleFilter} style={{ width: 'auto', padding: '6px 20px', height: '36px' }}>
                        Filter
                    </button>

                    <button className="icon-btn excel-btn" title="Export ke Excel" onClick={handleExport}>
                        <Download size={18} color="var(--text-primary)" />
                    </button> <button className="icon-btn excel-btn" title="Upload Ke Server" onClick={handleUpload}>
                        <Upload size={18} color="var(--text-primary)" />
                    </button>
                </div>
            </header>

            <div className="history-card">
                <div className="history-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Detail</th>
                                <th>Berat Nota (kg)</th>
                                <th>Berat (kg)</th>
                                <th>Selisih</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
                            ) : !Array.isArray(history) || history.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Tidak ada data.</td></tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {item.doc_number || '-'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {item.timestamp ? new Date(item.timestamp).toLocaleString('id-ID') : '-'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="history-detail">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="history-party">{item.party_name || '-'}</span>
                                                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: '#ccc', border: '1px solid var(--border-color)' }}>
                                                        <Package size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                        {item.product_name || '-'}
                                                    </span>
                                                    <span className={`trx-badge ${item.trx_type === 'Penjualan' ? 'penjualan' : 'pembelian'}`}>
                                                        {item.trx_type || 'Pembelian'}
                                                    </span>
                                                </div>
                                                <span className="history-plate">
                                                    <Truck size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                                    {item.plate_number || 'No Plate'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {Math.round(item.noted_weight || 0)}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                                                {Math.round(item.weight)}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                W1: {Math.round(item.weight_1 || 0)} | W2: {Math.round(item.weight_2 || 0)}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`diff-tag ${getDiffClass(item.diff_weight)}`}>
                                                {item.diff_weight > 0 ? '+' : ''}{Math.round(item.diff_weight || 0)}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="icon-btn" onClick={() => handleEdit(item)} title="Edit">
                                                    <Edit size={16} color="var(--accent-color)" />
                                                </button>
                                                <button className="icon-btn" onClick={() => handlePrint(item.id)} title="Cetak">
                                                    <Printer size={16} color="var(--accent-color)" />
                                                </button>
                                                <button className="icon-btn" onClick={() => handleDelete(item.id)} title="Hapus">
                                                    <Trash2 size={16} color="var(--danger-color)" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                                ))}
                        </tbody>
                    </table>
                </div>

                <div className="pagination-footer">
                    <button
                        className="nav-btn-mini"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="page-info">
                        Halaman {currentPage} dari {totalPages}
                    </div>
                    <button
                        className="nav-btn-mini"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="history-summary-bar">
                    <div className="summary-item">
                        <span className="label">Total Baris</span>
                        <span className="value">{summary.count || 0}</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total W1</span>
                        <span className="value">{(summary.totalW1 || 0).toLocaleString('id-ID')} <small>kg</small></span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total W2</span>
                        <span className="value">{(summary.totalW2 || 0).toLocaleString('id-ID')} <small>kg</small></span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total Berat (Netto)</span>
                        <span className="value accent">{(summary.totalWeight || 0).toLocaleString('id-ID')} <small>kg</small></span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total Berat Nota</span>
                        <span className="value">{(summary.totalNotedWeight || 0).toLocaleString('id-ID')} <small>kg</small></span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total Selisih</span>
                        <span className={`value ${summary.totalDiff > 0 ? 'positive' : summary.totalDiff < 0 ? 'negative' : ''}`}>
                            {summary.totalDiff > 0 ? '+' : ''}{(summary.totalDiff || 0).toLocaleString('id-ID')} <small>kg</small>
                        </span>
                    </div>
                </div>
            </div>
            {
                isEditModalOpen && editingItem && (
                    <div className="modal-overlay active">
                        <div className="modal-card">
                            <div className="modal-header">
                                <h3>Edit History - {editingItem.doc_number}</h3>
                                <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="modal-weight-preview-grid triple" style={{ marginBottom: '24px' }}>
                                        <div className="modal-weight-preview secondary">
                                            <span className="label">Timbang 1</span>
                                            <div className="value">{Math.round(editingItem.weight_1 || 0)} <small>kg</small></div>
                                        </div>
                                        <div className="modal-weight-preview secondary">
                                            <span className="label">Timbang 2</span>
                                            <div className="value">{Math.round(editingItem.weight_2 || 0)} <small>kg</small></div>
                                        </div>
                                        <div className="modal-weight-preview accent">
                                            <span className="label">Berat Bersih</span>
                                            <div className="value">
                                                {editingItem.weight_2 > 0
                                                    ? Math.round(Math.abs(editingItem.weight_1 - editingItem.weight_2) * (1 - (editingItem.refaksi || 0) / 100))
                                                    : Math.round(editingItem.weight_1 || 0)
                                                }
                                                <small> kg</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="input-grid">
                                        <div className="input-group">
                                            <label>Nomor Plat Kendaraan</label>
                                            <input
                                                type="text"
                                                value={editingItem.plate_number || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, plate_number: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Jenis Transaksi</label>
                                            <select value={editingItem.trx_type || 'Pembelian'} onChange={(e) => setEditingItem({ ...editingItem, trx_type: e.target.value })}>
                                                <option value="Pembelian">Pembelian</option>
                                                <option value="Penjualan">Penjualan</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>{editingItem.trx_type === 'Pembelian' ? "Suplier" : "Pelanggan"}</label>
                                            <Select
                                                options={editingItem.trx_type === 'Pembelian' ?
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
                                                value={editingItem.CardID ? {
                                                    value: editingItem.CardID,
                                                    label: (editingItem.trx_type === 'Pembelian' ? dataSuplier : dataCustomer).find(c => c.ID === editingItem.CardID)
                                                        ? `${(editingItem.trx_type === 'Pembelian' ? dataSuplier : dataCustomer).find(c => c.ID === editingItem.CardID).MemberCode} - ${(editingItem.trx_type === 'Pembelian' ? dataSuplier : dataCustomer).find(c => c.ID === editingItem.CardID).Nama} (${(editingItem.trx_type === 'Pembelian' ? dataSuplier : dataCustomer).find(c => c.ID === editingItem.CardID).Telp})`
                                                        : editingItem.party_name
                                                } : null}
                                                onChange={(option) => {
                                                    if (option) {
                                                        setEditingItem({ ...editingItem, CardID: option.value, party_name: option.itemData.Nama });
                                                    } else {
                                                        setEditingItem({ ...editingItem, CardID: 0, party_name: '' });
                                                    }
                                                }}
                                                placeholder="Cari Pelanggan / Suplier..."
                                                styles={customSelectStyles}
                                                isClearable
                                                isSearchable
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Barang</label>
                                            <Select
                                                options={dataItem.map((item) => ({
                                                    value: item.ID,
                                                    label: `${item.Code} - ${item.Nama}`,
                                                    itemData: item
                                                }))}
                                                value={editingItem.ItemID ? {
                                                    value: editingItem.ItemID,
                                                    label: dataItem.find(i => i.ID === editingItem.ItemID)
                                                        ? `${dataItem.find(i => i.ID === editingItem.ItemID).Code} - ${dataItem.find(i => i.ID === editingItem.ItemID).Nama}`
                                                        : editingItem.product_name
                                                } : null}
                                                onChange={(option) => {
                                                    if (option) {
                                                        setEditingItem({ ...editingItem, ItemID: option.value, product_name: option.itemData.Nama });
                                                    } else {
                                                        setEditingItem({ ...editingItem, ItemID: 0, product_name: '' });
                                                    }
                                                }}
                                                placeholder="Cari Barang..."
                                                styles={customSelectStyles}
                                                isClearable
                                                isSearchable
                                            />
                                        </div>

                                        <div className="input-group">
                                            <label>Nama Sopir</label>
                                            <input
                                                type="text"
                                                value={editingItem.driver_name || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, driver_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Harga /kg</label>
                                            <input
                                                type="number"
                                                value={editingItem.price || 0}
                                                onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Refaksi (%)</label>
                                            <input
                                                type="number"
                                                value={editingItem.refaksi || 0}
                                                onChange={(e) => setEditingItem({ ...editingItem, refaksi: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Berat Nota (kg)</label>
                                            <input
                                                type="number"
                                                value={editingItem.noted_weight || 0}
                                                onChange={(e) => setEditingItem({ ...editingItem, noted_weight: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Berat 1 (kg) - Locked</label>
                                            <input
                                                type="number"
                                                value={editingItem.weight_1 || 0}
                                                disabled
                                                style={{ background: 'rgba(255,255,255,0.05)', opacity: 0.6 }}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Berat 2 (kg) - Locked</label>
                                            <input
                                                type="number"
                                                value={editingItem.weight_2 || 0}
                                                disabled
                                                style={{ background: 'rgba(255,255,255,0.05)', opacity: 0.6 }}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group" style={{ marginTop: '24px' }}>
                                        <label>Catatan</label>
                                        <textarea
                                            value={editingItem.notes || ''}
                                            onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                                            rows="3"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="primary-btn secondary" onClick={() => setIsEditModalOpen(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="primary-btn">
                                        <Save size={18} /> Simpan Perubahan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default History;
