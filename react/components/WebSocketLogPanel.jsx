import { Activity, ArrowDown, ArrowUp, ChevronDown, ChevronUp, Circle, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWebSocketLog } from '../hooks/useWebSocketLog';

const TYPE_CONFIG = {
    send: {
        icon: ArrowUp,
        label: 'KIRIM',
        className: 'ws-log-send',
    },
    receive: {
        icon: ArrowDown,
        label: 'TERIMA',
        className: 'ws-log-receive',
    },
    connect: {
        icon: Wifi,
        label: 'TERHUBUNG',
        className: 'ws-log-connect',
    },
    disconnect: {
        icon: WifiOff,
        label: 'TERPUTUS',
        className: 'ws-log-disconnect',
    },
    error: {
        icon: Circle,
        label: 'ERROR',
        className: 'ws-log-error',
    },
    info: {
        icon: Activity,
        label: 'INFO',
        className: 'ws-log-info',
    },
};

const formatTime = (date) => {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
};

const formatData = (data) => {
    if (!data) return '';
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return data;
        }
    }
    return JSON.stringify(data, null, 2);
};

const WebSocketLogPanel = () => {
    const { logs, clearLogs } = useWebSocketLog();
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedEntries, setExpandedEntries] = useState(new Set());
    const [filter, setFilter] = useState('all');
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollRef = useRef(null);
    const prevLogCount = useRef(0);

    // Count by type
    const counts = logs.reduce((acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
    }, {});

    const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

    useEffect(() => {
        if (autoScroll && scrollRef.current && logs.length > prevLogCount.current) {
            scrollRef.current.scrollTop = 0;
        }
        prevLogCount.current = logs.length;
    }, [logs, autoScroll]);

    const toggleEntry = (id) => {
        setExpandedEntries(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const sendCount = counts.send || 0;
    const receiveCount = counts.receive || 0;
    const errorCount = counts.error || 0;

    return (
        <div className={`ws-log-panel ${isExpanded ? 'expanded' : ''}`}>
            {/* Header / Toggle Bar */}
            <button
                className="ws-log-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                id="ws-log-toggle-btn"
            >
                <div className="ws-log-toggle-left">
                    <Activity size={16} className="ws-log-pulse" />
                    <span className="ws-log-title">WebSocket Monitor</span>
                    <div className="ws-log-badges">
                        <span className="ws-log-badge send">
                            <ArrowUp size={10} />
                            {sendCount}
                        </span>
                        <span className="ws-log-badge receive">
                            <ArrowDown size={10} />
                            {receiveCount}
                        </span>
                        {errorCount > 0 && (
                            <span className="ws-log-badge error">
                                {errorCount}
                            </span>
                        )}
                    </div>
                </div>
                {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="ws-log-content">
                    {/* Toolbar */}
                    <div className="ws-log-toolbar">
                        <div className="ws-log-filters">
                            {['all', 'send', 'receive', 'connect', 'disconnect', 'error'].map(f => (
                                <button
                                    key={f}
                                    className={`ws-log-filter-btn ${filter === f ? 'active' : ''}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'all' ? 'Semua' : TYPE_CONFIG[f]?.label || f}
                                    {f !== 'all' && counts[f] ? ` (${counts[f]})` : ''}
                                </button>
                            ))}
                        </div>
                        <div className="ws-log-actions">
                            <label className="ws-log-auto-scroll">
                                <input
                                    type="checkbox"
                                    checked={autoScroll}
                                    onChange={(e) => setAutoScroll(e.target.checked)}
                                />
                                <span>Auto-scroll</span>
                            </label>
                            <button
                                className="ws-log-clear-btn"
                                onClick={clearLogs}
                                title="Hapus semua log"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Log entries */}
                    <div className="ws-log-entries" ref={scrollRef}>
                        {filteredLogs.length === 0 ? (
                            <div className="ws-log-empty">
                                <Activity size={32} />
                                <p>Belum ada log WebSocket</p>
                                <span>Data akan muncul saat ada komunikasi dengan server</span>
                            </div>
                        ) : (
                            filteredLogs.map(entry => {
                                const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.info;
                                const Icon = config.icon;
                                const isOpen = expandedEntries.has(entry.id);
                                const hasData = entry.data != null;

                                return (
                                    <div
                                        key={entry.id}
                                        className={`ws-log-entry ${config.className} ${isOpen ? 'open' : ''}`}
                                        onClick={() => hasData && toggleEntry(entry.id)}
                                        style={{ cursor: hasData ? 'pointer' : 'default' }}
                                    >
                                        <div className="ws-log-entry-header">
                                            <div className="ws-log-entry-left">
                                                <span className="ws-log-entry-icon">
                                                    <Icon size={12} />
                                                </span>
                                                <span className="ws-log-entry-type">{config.label}</span>
                                                <span className="ws-log-entry-msg">{entry.message}</span>
                                            </div>
                                            <div className="ws-log-entry-right">
                                                <span className="ws-log-entry-time">{formatTime(entry.timestamp)}</span>
                                                {hasData && (
                                                    <span className="ws-log-entry-expand">
                                                        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isOpen && hasData && (
                                            <pre className="ws-log-entry-data">{formatData(entry.data)}</pre>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebSocketLogPanel;
