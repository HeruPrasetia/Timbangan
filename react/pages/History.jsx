import React, { useState, useEffect } from 'react';
import { Calendar, Download, Printer, Trash2, ChevronLeft, ChevronRight, Package, Truck, Search } from 'lucide-react';

const History = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize] = useState(10);

    const today = new Date().toLocaleDateString('sv-SE');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    useEffect(() => {
        loadHistory();
    }, [currentPage]);

    const loadHistory = async () => {
        setLoading(true);
        const params = {
            startDate,
            endDate,
            page: currentPage,
            pageSize
        };

        try {
            const data = await window.electronAPI.getHistory(params);
            const count = await window.electronAPI.getHistoryCount(params);
            setHistory(data);
            setTotalPages(Math.ceil(count / pageSize) || 1);
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
        const params = { startDate, endDate };
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
                    <button className="icon-btn" title="Filter History" onClick={handleFilter}>
                        <Search size={18} color="var(--text-primary)" />
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
            </div>
        </div>
    );
};

export default History;
