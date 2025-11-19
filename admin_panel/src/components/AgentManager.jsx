import React, { useState, useEffect, useRef } from 'react';
import { loadAgents, saveAgents, createAgents, fundAgents, updateAgentBalances, exportAgentsToCSV, parseAgentsFromCSV } from '../utils/agents';

const AgentManager = ({ provider, tokenAddress, adminPrivateKey, addStatusMessage }) => {
    const [agents, setAgents] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [numAgentsToCreate, setNumAgentsToCreate] = useState(3);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loaded = loadAgents();
        setAgents(loaded);
        // Auto-refresh disabled as per user request
    }, []);

    const refreshBalances = async (currentAgents) => {
        if (!provider || !tokenAddress) {
            addStatusMessage("Cannot refresh: Provider or Token Address missing.", "error");
            return;
        }
        setIsRefreshing(true);
        try {
            addStatusMessage(`Refreshing balances for ${currentAgents.length} agents...`, 'info');
            const updated = await updateAgentBalances(currentAgents, tokenAddress, provider);
            setAgents(updated);
            saveAgents(updated);
            addStatusMessage("Agent balances updated.", "success");
        } catch (error) {
            addStatusMessage(`Failed to refresh balances: ${error.message}`, 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCreateAgents = async (e) => {
        e.preventDefault();
        if (!adminPrivateKey) {
            addStatusMessage("Admin Private Key not found in environment variables. Cannot fund agents automatically.", "error");
            return;
        }

        setIsCreating(true);
        addStatusMessage(`Creating and funding ${numAgentsToCreate} agents...`, 'info');

        try {
            // 1. Create Wallets
            const newAgents = createAgents(numAgentsToCreate);

            // 2. Fund Wallets
            const fundingResults = await fundAgents(adminPrivateKey, newAgents, tokenAddress, provider);

            const successCount = fundingResults.filter(r => r.status === 'success').length;
            addStatusMessage(`Funded ${successCount}/${numAgentsToCreate} agents successfully.`, successCount === numAgentsToCreate ? 'success' : 'warning');

            // 3. Save and Update State
            const allAgents = [...agents, ...newAgents];
            setAgents(allAgents);
            saveAgents(allAgents);

            // 4. Refresh Balances to confirm
            await refreshBalances(allAgents);

        } catch (error) {
            addStatusMessage(`Error creating agents: ${error.message}`, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleClearAgents = () => {
        if (confirm("Are you sure you want to delete all local agents? Keys will be lost.")) {
            setAgents([]);
            saveAgents([]);
            addStatusMessage("All agents cleared.", "info");
        }
    };

    const handleExport = () => {
        if (agents.length === 0) {
            addStatusMessage("No agents to export.", "warning");
            return;
        }
        exportAgentsToCSV(agents);
        addStatusMessage("Agents exported to CSV.", "success");
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedAgents = parseAgentsFromCSV(e.target.result);
                if (importedAgents.length > 0) {
                    const mergedAgents = [...agents, ...importedAgents];
                    setAgents(mergedAgents);
                    saveAgents(mergedAgents);
                    addStatusMessage(`Imported ${importedAgents.length} agents successfully.`, "success");
                    refreshBalances(mergedAgents);
                } else {
                    addStatusMessage("No valid agents found in CSV.", "warning");
                }
            } catch (error) {
                addStatusMessage(`Failed to parse CSV: ${error.message}`, "error");
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset input
    };

    return (
        <div className="agent-manager">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Agent Management ({agents.length})</h3>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                    <button onClick={handleImportClick} style={{ marginRight: '10px', backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                        Import CSV
                    </button>
                    <button onClick={handleExport} style={{ marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                        Export CSV
                    </button>
                    <button onClick={() => refreshBalances(agents)} disabled={isRefreshing || !provider} style={{ marginRight: '10px', padding: '8px 16px', cursor: 'pointer' }}>
                        {isRefreshing ? 'Refreshing...' : 'Refresh Balances'}
                    </button>
                    <button onClick={handleClearAgents} style={{ marginLeft: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                        Clear All
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', opacity: agents.length > 0 ? 0.6 : 1 }}>
                <h4>Create New Agents</h4>
                {agents.length > 0 && <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '10px' }}>⚠️ Clear existing agents to create new ones.</p>}
                <form onSubmit={handleCreateAgents} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={numAgentsToCreate}
                        onChange={(e) => setNumAgentsToCreate(parseInt(e.target.value))}
                        style={{ width: '80px', padding: '5px' }}
                        disabled={agents.length > 0 || isCreating}
                    />
                    <button type="submit" disabled={agents.length > 0 || isCreating || !provider} style={{ padding: '8px 16px', cursor: agents.length > 0 ? 'not-allowed' : 'pointer' }}>
                        {isCreating ? 'Creating & Funding...' : 'Create & Fund Agents'}
                    </button>
                </form>
                {!adminPrivateKey && <p style={{ color: 'red', fontSize: '0.9em' }}>Warning: VITE_ADMIN_PRIVATE_KEY missing. Auto-funding disabled.</p>}
            </div>

            <div className="agents-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '10px' }}>#</th>
                            <th style={{ padding: '10px' }}>Address</th>
                            <th style={{ padding: '10px' }}>ETH</th>
                            <th style={{ padding: '10px' }}>USDT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {agents.map((agent, index) => (
                            <tr key={agent.address} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{index + 1}</td>
                                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{agent.address}</td>
                                <td style={{ padding: '10px' }}>{parseFloat(agent.ethBalance).toFixed(4)}</td>
                                <td style={{ padding: '10px' }}>{parseFloat(agent.usdtBalance).toFixed(2)}</td>
                            </tr>
                        ))}
                        {agents.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No agents created yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AgentManager;
