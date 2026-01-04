import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarController,
    DoughnutController
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { RefreshCw, TrendingUp, Users, ShoppingCart } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    BarController,
    DoughnutController
);

const Laporan = () => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState('');
    const [stats, setStats] = useState({ totalTransactions: 0, totalWeightNet: 0 });
    const [chartData, setChartData] = useState(null);
    const [supplierData, setSupplierData] = useState(null);
    const [customerData, setCustomerData] = useState(null);
    const [loading, setLoading] = useState(true);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        { value: '', label: 'Semua Bulan' },
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    useEffect(() => {
        loadData();
    }, [year, month]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            console.log('Fetching report data for:', params);

            // 1. Fetch Stats
            const s = await window.electronAPI.getReportStats(params);
            console.log('Stats received:', s);
            setStats(s || { totalTransactions: 0, totalWeightNet: 0 });

            // 2. Fetch Activity Chart Data
            const activity = await window.electronAPI.getReportChartData(params);
            console.log('Activity data received:', activity);
            processActivityData(activity || []);

            // 3. Fetch Party Stats
            const suppliers = await window.electronAPI.getReportPartyStats({ ...params, type: 'Pembelian' });
            console.log('Suppliers data received:', suppliers);
            processPartyData(suppliers || [], setSupplierData);

            const customers = await window.electronAPI.getReportPartyStats({ ...params, type: 'Penjualan' });
            console.log('Customers data received:', customers);
            processPartyData(customers || [], setCustomerData);

        } catch (error) {
            console.error('Failed to load report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processActivityData = (data) => {
        let labels = [];
        if (!month) {
            labels = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        } else {
            const lastDay = new Date(year, parseInt(month, 10), 0).getDate();
            for (let i = 1; i <= lastDay; i++) {
                labels.push(i.toString().padStart(2, '0'));
            }
        }

        const pembelian = labels.map(l => {
            const match = data.find(d => d.label === l && d.trx_type === 'Pembelian');
            return match ? match.totalWeight || 0 : 0;
        });

        const penjualan = labels.map(l => {
            const match = data.find(d => d.label === l && d.trx_type === 'Penjualan');
            return match ? match.totalWeight || 0 : 0;
        });

        setChartData({
            labels: labels.map(l => !month ? months.find(m => m.value === l)?.label || l : l),
            datasets: [
                {
                    label: 'Pembelian (kg)',
                    data: pembelian,
                    backgroundColor: '#4CAF50',
                    borderRadius: 4,
                },
                {
                    label: 'Penjualan (kg)',
                    data: penjualan,
                    backgroundColor: '#E91E63',
                    borderRadius: 4,
                }
            ]
        });
    };

    const processPartyData = (data, setter) => {
        console.log(data);
        if (!Array.isArray(data)) {
            console.warn('ProcessPartyData: Data is not an array', data);
            return;
        }
        setter({
            labels: data.map(d => d.party_name || 'Unknown'),
            datasets: [{
                data: data.map(d => d.totalWeightNet || 0),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                    '#C9CBCF', '#4D5360', '#82ca9d', '#8884d8'
                ],
                borderWidth: 0,
            }]
        });
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8' } },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
        }
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 12, padding: 15 } },
        }
    };

    return (
        <div className="tab-view active">
            <header className="view-header">
                <h2>Laporan & Statistik</h2>
                <div className="filter-bar">
                    <div className="filter-group">
                        <label>Tahun:</label>
                        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Bulan:</label>
                        <select value={month} onChange={(e) => setMonth(e.target.value)}>
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <button className="icon-btn" title="Refresh Laporan" onClick={loadData}>
                        <RefreshCw size={18} color="var(--text-primary)" />
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    <div className="settings-card" style={{ padding: '24px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Transaksi</span>
                            <TrendingUp size={20} color="var(--accent-color)" />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '10px' }}>{stats.totalTransactions}</div>
                    </div>
                    <div className="settings-card" style={{ padding: '24px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Berat (Netto)</span>
                            <Users size={20} color="var(--success-color)" />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '10px', color: 'var(--accent-color)' }}>
                            {(stats.totalWeightNet || 0).toLocaleString('id-ID')} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kg</span>
                        </div>
                    </div>
                </div>

                {/* Activity Chart */}
                <section className="settings-card" style={{ padding: '32px', height: '450px' }}>
                    <h4 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>Grafik Pergerakan Barang</h4>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        {chartData && <Bar data={chartData} options={chartOptions} />}
                    </div>
                </section>

                {/* Party Distribution */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                    <section className="settings-card" style={{ padding: '24px', height: '400px' }}>
                        <h4 style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <ShoppingCart size={16} style={{ marginRight: '8px' }} /> Top 10 Suplier (Pembelian)
                        </h4>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            {supplierData && <Doughnut data={supplierData} options={donutOptions} />}
                        </div>
                    </section>
                    <section className="settings-card" style={{ padding: '24px', height: '400px' }}>
                        <h4 style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <Users size={16} style={{ marginRight: '8px' }} /> Top 10 Pelanggan (Penjualan)
                        </h4>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            {customerData && <Doughnut data={customerData} options={donutOptions} />}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Laporan;
