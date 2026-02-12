import React, { useState, useEffect } from 'react';
import { Calendar, Download, Printer, Trash2, Edit, ChevronLeft, ChevronRight, Package, Truck, Search, X, Save, Eye, FileText } from 'lucide-react';

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
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });

    useEffect(() => {
        loadHistory();
    }, [currentPage, startDate, endDate]);

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

    const handlePrint = async (item) => {
        // Implement printing for sales receipts if needed
        console.log("Print transaction:", item);
        window.Pesan2("Fitur cetak ulang sedang disiapkan", "Info", "info");
    };

    const handleDelete = async (id) => {
        if (confirm('Hapus transaksi ini? Seluruh detail transaksi juga akan dihapus.')) {
            await window.electronAPI.deleteHistory(id);
            loadHistory();
        }
    };

    const viewDetails = async (id) => {
        try {
            const item = await window.electronAPI.getHistoryById(id);
            setSelectedItem(item);
            setIsDetailModalOpen(true);
        } catch (error) {
            console.error("View Details Error:", error);
        }
    };

    return (
        <div className="tab-view active history-view">
            <header className="view-header">
                <div className="title-area">
                    <h2>Riwayat Penjualan</h2>
                    <p className="subtitle">Pantau semua transaksi yang telah diselesaikan</p>
                </div>
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
                            placeholder="Cari Pelanggan / No Dokument..."
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
                                <th>No Dokument / Waktu</th>
                                <th>Pelanggan</th>
                                <th>Pembayaran</th>
                                <th>Total Transaksi</th>
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
                                    <tr key={item.ID}>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {item.DocNumber || '-'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {item.DocDate} {item.TimeCreated ? item.TimeCreated.split(' ')[1] : ''}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="history-party">{item.CardName || 'Umum'}</span>
                                            {item.Notes && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.Notes}</div>}
                                        </td>
                                        <td>
                                            <span className={`trx-badge ${item.PayType?.toLowerCase() === 'cash' ? 'penjualan' : 'pembelian'}`}>
                                                {item.PayType || 'Cash'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                                                Rp {(item.GrandTotal || 0).toLocaleString('id-ID')}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="icon-btn" onClick={() => viewDetails(item.ID)} title="Detail">
                                                    <Eye size={16} color="var(--accent-color)" />
                                                </button>
                                                <button className="icon-btn" onClick={() => handlePrint(item)} title="Cetak">
                                                    <Printer size={16} color="var(--accent-color)" />
                                                </button>
                                                <button className="icon-btn" onClick={() => handleDelete(item.ID)} title="Hapus">
                                                    <Trash2 size={16} color="var(--danger-color)" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
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
                        <span className="label">Total Transaksi</span>
                        <span className="value">{summary.count || 0}</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Total Nilai Penjualan</span>
                        <span className="value accent">Rp {(summary.totalAmount || 0).toLocaleString('id-ID')}</span>
                    </div>
                </div>
            </div>

            {isDetailModalOpen && selectedItem && (
                <div className="modal-overlay active">
                    <div className="modal-card wide">
                        <div className="modal-header">
                            <div className="title-with-icon">
                                <FileText size={20} />
                                <h3>Detail Transaksi: {selectedItem.DocNumber}</h3>
                            </div>
                            <button className="close-btn" onClick={() => setIsDetailModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="transaction-detail-header">
                                <div className="detail-row">
                                    <span>Pelanggan:</span>
                                    <strong>{selectedItem.CardName || 'Umum'}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Tanggal:</span>
                                    <strong>{selectedItem.DocDate} {selectedItem.TimeCreated ? selectedItem.TimeCreated.split(' ')[1] : ''}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Pembayaran:</span>
                                    <strong>{selectedItem.PayType}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>Status:</span>
                                    <strong style={{ color: 'var(--success-color)' }}>Selesai</strong>
                                </div>
                            </div>

                            <div className="detail-items-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nama Barang</th>
                                            <th style={{ textAlign: 'center' }}>Qty</th>
                                            <th style={{ textAlign: 'right' }}>Harga</th>
                                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItem.details?.map((detail, idx) => (
                                            <tr key={idx}>
                                                <td>{detail.ItemName}</td>
                                                <td style={{ textAlign: 'center' }}>{parseFloat(detail.Qty).toLocaleString('id-ID')} {detail.UnitName}</td>
                                                <td style={{ textAlign: 'right' }}>Rp {parseFloat(detail.Price).toLocaleString('id-ID')}</td>
                                                <td style={{ textAlign: 'right' }}>Rp {(parseFloat(detail.Qty) * parseFloat(detail.Price)).toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Grand Total</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-color)' }}>
                                                Rp {selectedItem.GrandTotal?.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {selectedItem.Notes && (
                                <div className="detail-notes">
                                    <span>Catatan:</span>
                                    <p>{selectedItem.Notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="primary-btn secondary" onClick={() => setIsDetailModalOpen(false)}>Tutup</button>
                            <button className="primary-btn" onClick={() => handlePrint(selectedItem)}>
                                <Printer size={18} /> Cetak Struk
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
