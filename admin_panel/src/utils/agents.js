import { ethers } from 'ethers';
import { ERC20_ABI } from './contract';

const AGENTS_STORAGE_KEY = 'stem_pay_agents';

export const loadAgents = () => {
    const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const saveAgents = (agents) => {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
};

export const exportAgentsToCSV = (agents) => {
    const headers = "index,address,privateKey,ethBalance,mUSDTBalance\n";
    const rows = agents.map((a, i) =>
        `${i + 1},${a.address},${a.privateKey},${a.ethBalance},${a.usdtBalance}`
    );
    const csvContent = headers + rows.join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "agents.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const parseAgentsFromCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    // Skip header if present
    const startIdx = lines[0].startsWith('index') ? 1 : 0;

    return lines.slice(startIdx).map(line => {
        const parts = line.split(',');
        if (parts.length < 3) return null;
        return {
            address: parts[1],
            privateKey: parts[2],
            ethBalance: parts[3] || '0',
            usdtBalance: parts[4] || '0'
        };
    }).filter(Boolean);
};

export const createAgents = (count) => {
    const newAgents = [];
    for (let i = 0; i < count; i++) {
        const wallet = ethers.Wallet.createRandom();
        newAgents.push({
            address: wallet.address,
            privateKey: wallet.privateKey,
            ethBalance: '0',
            usdtBalance: '0'
        });
    }
    return newAgents;
};

export const fundAgents = async (adminPrivateKey, agents, tokenAddress, provider) => {
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, adminWallet);
    const tokenDecimals = await tokenContract.decimals();

    // Amounts to fund
    const ethAmount = ethers.parseEther("0.001"); // Small amount for gas
    const usdtAmount = ethers.parseUnits("100", tokenDecimals); // 100 Tokens

    const results = [];

    for (const agent of agents) {
        try {
            // Send ETH
            const txEth = await adminWallet.sendTransaction({
                to: agent.address,
                value: ethAmount
            });
            await txEth.wait();

            // Send Tokens
            const txToken = await tokenContract.transfer(agent.address, usdtAmount);
            await txToken.wait();

            results.push({ address: agent.address, status: 'success' });
        } catch (error) {
            console.error(`Failed to fund agent ${agent.address}:`, error);
            // Extract more meaningful error message if possible
            let errorMessage = error.message;
            if (error.code === 'INSUFFICIENT_FUNDS') errorMessage = "Admin wallet has insufficient ETH.";
            if (error.code === 'NETWORK_ERROR') errorMessage = "Network connection failed. Check Infura Key.";

            results.push({ address: agent.address, status: 'failed', error: errorMessage });
        }
    }
    return results;
};

export const updateAgentBalances = async (agents, tokenAddress, provider) => {
    const updatedAgents = [];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const decimals = await tokenContract.decimals();

    for (const agent of agents) {
        try {
            const ethBal = await provider.getBalance(agent.address);
            const tokenBal = await tokenContract.balanceOf(agent.address);

            updatedAgents.push({
                ...agent,
                ethBalance: ethers.formatEther(ethBal),
                usdtBalance: ethers.formatUnits(tokenBal, decimals)
            });
        } catch (error) {
            console.error(`Failed to fetch balance for ${agent.address}`, error);
            updatedAgents.push(agent);
        }
    }
    return updatedAgents;
};

export const agentJoinLottery = async (agent, lotteryId, contractAddress, lotteryAbi, tokenAddress, fee, provider) => {
    const wallet = new ethers.Wallet(agent.privateKey, provider);
    const lotteryContract = new ethers.Contract(contractAddress, lotteryAbi, wallet);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

    // Approve
    const approveTx = await tokenContract.approve(contractAddress, fee);
    await approveTx.wait();

    // Enter
    const enterTx = await lotteryContract.enterLottery(lotteryId);
    await enterTx.wait();

    return enterTx.hash;
};
