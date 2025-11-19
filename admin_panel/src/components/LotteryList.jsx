import React, { useState, useEffect } from 'react';
import { STEM_PAY_LOTTERY_MANAGER_ABI } from '../utils/contract';
import { loadAgents, agentJoinLottery, updateAgentBalances } from '../utils/agents';
import { ethers } from 'ethers';

const LotteryCard = ({ lottery, contract, addStatusMessage, provider, tokenAddress }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedAgents, setSelectedAgents] = useState([]);
    const [agents, setAgents] = useState(loadAgents());

    useEffect(() => {
        const updateTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            const diff = lottery.drawTime - now;

            if (diff <= 0) {
                setTimeLeft('Ready to Draw');
            } else {
                const hours = Math.floor(diff / 3600);
                const minutes = Math.floor((diff % 3600) / 60);
                const seconds = diff % 60;
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [lottery.drawTime]);

    const handleDraw = async () => {
        if (!confirm(`Draw winner for Lottery #${lottery.id}?`)) return;
        setIsProcessing(true);
        try {
            addStatusMessage(`Drawing winner for Lottery #${lottery.id}...`, 'info');
            const tx = await contract.drawWinner(lottery.id);
            addStatusMessage(`Draw tx sent: ${tx.hash}`, 'info');
            await tx.wait();
            addStatusMessage(`Lottery #${lottery.id} drawn successfully!`, 'success');
        } catch (error) {
            addStatusMessage(`Draw failed: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm(`Cancel Lottery #${lottery.id}?`)) return;
        setIsProcessing(true);
        try {
            addStatusMessage(`Cancelling Lottery #${lottery.id}...`, 'info');
            const tx = await contract.cancelLottery(lottery.id);
            addStatusMessage(`Cancel tx sent: ${tx.hash}`, 'info');
            await tx.wait();
            addStatusMessage(`Lottery #${lottery.id} cancelled!`, 'success');
        } catch (error) {
            addStatusMessage(`Cancel failed: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleJoinAgents = async () => {
        if (selectedAgents.length === 0) return;
        setIsProcessing(true);
        addStatusMessage(`Joining ${selectedAgents.length} agents to Lottery #${lottery.id}...`, 'info');

        let successCount = 0;
        for (const agentAddress of selectedAgents) {
            const agent = agents.find(a => a.address === agentAddress);
            if (!agent) continue;

            try {
                await agentJoinLottery(
                    agent,
                    lottery.id,
                    await contract.getAddress(),
                    STEM_PAY_LOTTERY_MANAGER_ABI,
                    tokenAddress,
                    lottery.participationFee,
                    provider
                );
                successCount++;
                addStatusMessage(`Agent ${agent.address.slice(0, 6)}... joined.`, 'success');
            } catch (error) {
                addStatusMessage(`Agent ${agent.address.slice(0, 6)}... failed: ${error.message}`, 'error');
            }
        }

        addStatusMessage(`Finished joining agents. Success: ${successCount}/${selectedAgents.length}`, 'info');
        setIsProcessing(false);
        setSelectedAgents([]);
        // Trigger a balance update in background
        updateAgentBalances(agents, tokenAddress, provider);
    };

    const toggleAgentSelection = (address) => {
        if (selectedAgents.includes(address)) {
            setSelectedAgents(selectedAgents.filter(a => a !== address));
        } else {
            setSelectedAgents([...selectedAgents, address]);
        }
    };

    const selectAllAgents = () => {
        if (selectedAgents.length === agents.length) {
            setSelectedAgents([]);
        } else {
            setSelectedAgents(agents.map(a => a.address));
        }
    };

    const feeInUSDT = ethers.formatUnits(lottery.participationFee, 18); // Assuming 18 decimals for now, ideally fetch from token

    return (
        <div className="lottery-card" style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px',
            backgroundColor: lottery.isDrawn ? '#f8f9fa' : '#fff'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ margin: 0 }}>Lottery #{lottery.id}</h4>
                <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: lottery.isActive ? '#28a745' : '#6c757d',
                    color: 'white',
                    fontSize: '0.8em'
                }}>
                    {lottery.isActive ? 'ACTIVE' : (lottery.isDrawn ? 'DRAWN' : 'CANCELLED')}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em' }}>
                <div><strong>Fee:</strong> {feeInUSDT} USDT</div>
                <div><strong>Participants:</strong> {lottery.participants.length} / {lottery.maxParticipants}</div>
                <div><strong>Prize:</strong> {lottery.prizePercentage}%</div>
                <div><strong>Time Left:</strong> {timeLeft}</div>
            </div>

            {lottery.isDrawn && (
                <div style={{ marginTop: '10px', padding: '5px', backgroundColor: '#e2e3e5', borderRadius: '4px' }}>
                    <strong>Winner:</strong> {lottery.winner}
                </div>
            )}

            {lottery.isActive && !lottery.isCancelled && (
                <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                        <button onClick={handleDraw} disabled={isProcessing} style={{ flex: 1 }}>Draw Winner</button>
                        <button onClick={handleCancel} disabled={isProcessing} style={{ flex: 1, backgroundColor: '#dc3545' }}>Cancel</button>
                    </div>

                    <details>
                        <summary>Join with Agents</summary>
                        <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                            <div style={{ marginBottom: '5px' }}>
                                <button onClick={selectAllAgents} type="button" style={{ fontSize: '0.8em', padding: '2px 5px' }}>
                                    {selectedAgents.length === agents.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <button
                                    onClick={handleJoinAgents}
                                    disabled={selectedAgents.length === 0 || isProcessing}
                                    style={{ marginLeft: '5px', fontSize: '0.8em', padding: '2px 5px', backgroundColor: '#28a745' }}
                                >
                                    Join Selected ({selectedAgents.length})
                                </button>
                            </div>
                            {agents.map(agent => (
                                <div key={agent.address} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85em' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedAgents.includes(agent.address)}
                                        onChange={() => toggleAgentSelection(agent.address)}
                                    />
                                    <span style={{ marginLeft: '5px' }}>
                                        {agent.address.slice(0, 6)}... ({parseFloat(agent.usdtBalance).toFixed(1)} USDT)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
};

const LotteryList = ({ activeLotteries, drawnLotteries, contract, addStatusMessage, provider, tokenAddress }) => {
    return (
        <div className="lottery-list-container" style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
                <h3>Active Lotteries</h3>
                {activeLotteries.length === 0 ? <p>No active lotteries.</p> : (
                    activeLotteries.map(l => (
                        <LotteryCard
                            key={l.id}
                            lottery={l}
                            contract={contract}
                            addStatusMessage={addStatusMessage}
                            provider={provider}
                            tokenAddress={tokenAddress}
                        />
                    ))
                )}
            </div>
            <div style={{ flex: 1 }}>
                <h3>Drawn / Past Lotteries</h3>
                {drawnLotteries.length === 0 ? <p>No past lotteries.</p> : (
                    drawnLotteries.map(l => (
                        <LotteryCard
                            key={l.id}
                            lottery={l}
                            contract={contract}
                            addStatusMessage={addStatusMessage}
                            provider={provider}
                            tokenAddress={tokenAddress}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default LotteryList;
