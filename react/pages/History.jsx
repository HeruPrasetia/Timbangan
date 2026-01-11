import React, { useState, useEffect } from 'react';
import { Calendar, Download, Printer, Trash2, Edit, ChevronLeft, ChevronRight, Package, Truck, Search, X, Save } from 'lucide-react';

const History = () => {
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

    const handleEdit = (item) => {
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
                                            <label>Nama Supplier / Pelanggan</label>
                                            <input
                                                type="text"
                                                value={editingItem.party_name || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, party_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Jenis Barang</label>
                                            <input
                                                type="text"
                                                value={editingItem.product_name || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, product_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Jenis Transaksi</label>
                                            <select
                                                value={editingItem.trx_type || 'Pembelian'}
                                                onChange={(e) => setEditingItem({ ...editingItem, trx_type: e.target.value })}
                                            >
                                                <option value="Pembelian">Pembelian</option>
                                                <option value="Penjualan">Penjualan</option>
                                            </select>
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
