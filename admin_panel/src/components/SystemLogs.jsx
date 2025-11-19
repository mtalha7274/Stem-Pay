import React, { useState } from 'react';

const SystemLogs = ({ logs, onClear }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = logs.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDownload = () => {
        const logText = logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_logs_${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div style={{
                padding: '10px',
                borderBottom: '1px solid #eee',
                backgroundColor: '#f8f9fa',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontWeight: 'bold' }}>System Logs</span>
                <div>
                    <button onClick={handleDownload} style={{ marginRight: '5px', fontSize: '0.8em', cursor: 'pointer' }} title="Download Logs">⬇️</button>
                    <button onClick={onClear} style={{ fontSize: '0.8em', cursor: 'pointer', color: 'red' }} title="Clear Logs">🗑️</button>
                </div>
            </div>

            <div style={{ padding: '5px 10px', borderBottom: '1px solid #eee' }}>
                <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '5px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', fontSize: '0.85em', fontFamily: 'monospace' }}>
                {filteredLogs.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', marginTop: '20px' }}>No logs found</div>
                ) : (
                    filteredLogs.map(msg => (
                        <div key={msg.id} style={{
                            marginBottom: '5px',
                            padding: '4px',
                            borderRadius: '4px',
                            backgroundColor: msg.type === 'error' ? '#ffebee' : msg.type === 'success' ? '#e8f5e9' : 'transparent',
                            color: msg.type === 'error' ? '#c62828' : msg.type === 'success' ? '#2e7d32' : '#333',
                            borderLeft: `3px solid ${msg.type === 'error' ? '#c62828' : msg.type === 'success' ? '#2e7d32' : '#ccc'}`
                        }}>
                            {msg.message}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SystemLogs;
