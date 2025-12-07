import { useState, useEffect } from 'react'
import './App.css'
import { ethers } from 'ethers'
import { STEM_PAY_LOTTERY_MANAGER_ABI, formatLotteryData } from './utils/contract'
import AgentManager from './components/AgentManager'
import LotteryList from './components/LotteryList'
import SystemLogs from './components/SystemLogs'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [statusMessages, setStatusMessages] = useState([])
  const [activeLotteries, setActiveLotteries] = useState([])
  const [drawnLotteries, setDrawnLotteries] = useState([])
  const [provider, setProvider] = useState(null)
  const [contract, setContract] = useState(null)
  const [signer, setSigner] = useState(null)

  const CONFIG = {
    ADMIN_PRIVATE_KEY: import.meta.env.VITE_ADMIN_PRIVATE_KEY,
    INFURA_API_KEY: import.meta.env.VITE_INFURA_API_KEY,
    STEM_PAY_CONTRACT_ADDRESS: import.meta.env.VITE_STEM_PAY_CONTRACT_ADDRESS
  }

  const addStatusMessage = (message, type = 'info') => {
    const newMessage = {
      id: Date.now(),
      message: `${new Date().toLocaleTimeString()}: ${message}`,
      type
    }
    setStatusMessages(prev => {
      const updated = [newMessage, ...prev];
      if (updated.length > 100) {
        return updated.slice(0, 100);
      }
      return updated;
    })
  }

  // Clear legacy logs if any
  useEffect(() => {
    localStorage.removeItem('logs');
    localStorage.removeItem('system_logs');
  }, []);

  const handleClearLogs = () => {
    setStatusMessages([])
  }

  const initializeContract = async () => {
    try {
      if (CONFIG.ADMIN_PRIVATE_KEY && CONFIG.INFURA_API_KEY) {
        const rpcUrl = `https://sepolia.infura.io/v3/${CONFIG.INFURA_API_KEY}`
        const jsonProvider = new ethers.JsonRpcProvider(rpcUrl)
        const walletSigner = new ethers.Wallet(CONFIG.ADMIN_PRIVATE_KEY, jsonProvider)

        const contractInstance = new ethers.Contract(
          CONFIG.STEM_PAY_CONTRACT_ADDRESS,
          STEM_PAY_LOTTERY_MANAGER_ABI,
          walletSigner
        )

        setProvider(jsonProvider)
        setSigner(walletSigner)
        setContract(contractInstance)
        addStatusMessage('Connected as Admin (via Private Key)', 'success')
        await loadLotteries(contractInstance)
      } else if (typeof window !== 'undefined' && window.ethereum) {
        // Fallback to MetaMask if keys are missing
        const browserProvider = new ethers.BrowserProvider(window.ethereum)
        const signerInstance = await browserProvider.getSigner()

        const contractInstance = new ethers.Contract(
          CONFIG.STEM_PAY_CONTRACT_ADDRESS,
          STEM_PAY_LOTTERY_MANAGER_ABI,
          signerInstance
        )

        setProvider(browserProvider)
        setSigner(signerInstance)
        setContract(contractInstance)
        addStatusMessage('Connected via MetaMask', 'success')
        await loadLotteries(contractInstance)
      } else {
        addStatusMessage('No Admin Key found and MetaMask not installed', 'error')
      }
    } catch (error) {
      console.error("Init error:", error)
      addStatusMessage(`Failed to initialize: ${error.message}`, 'error')
    }
  }

  const loadLotteries = async (contractInstance = contract) => {
    if (!contractInstance) return

    try {
      const activeIds = await contractInstance.getActiveLotteries()
      const drawnIds = await contractInstance.getDrawnLotteries()

      const fetchDetails = async (ids) => {
        return Promise.all(ids.map(async (id) => {
          const info = await contractInstance.getLotteryInfo(id)
          return formatLotteryData(id, info)
        }))
      }

      const activeData = await fetchDetails(activeIds)
      const drawnData = await fetchDetails(drawnIds)

      setActiveLotteries(activeData.reverse())
      setDrawnLotteries(drawnData.reverse())
    } catch (error) {
      console.error(error)
      addStatusMessage(`Error loading lotteries: ${error.message}`, 'error')
    }
  }

  const handleCreateLottery = async (e) => {
    e.preventDefault()
    if (!contract) {
      addStatusMessage('Wallet not connected!', 'error')
      return
    }

    try {
      const formData = new FormData(e.target)

      const tokenAddress = formData.get('tokenAddress')
      const participationFee = ethers.parseUnits(formData.get('participationFee'), 18)
      const maxParticipants = parseInt(formData.get('maxParticipants'))
      const drawDateTime = Math.floor(new Date(formData.get('drawDateTime')).getTime() / 1000)
      const prizePercentage = parseInt(formData.get('prizePercentage'))
      const investmentPercentage = parseInt(formData.get('investmentPercentage'))
      const profitPercentage = parseInt(formData.get('profitPercentage'))

      const total = prizePercentage + investmentPercentage + profitPercentage
      if (total !== 100) {
        if (!confirm(`Percentages sum to ${total}%, not 100%. The contract might reject this. Continue?`)) {
          return;
        }
      }

      addStatusMessage('Creating lottery...', 'info')

      const tx = await contract.createLottery(
        tokenAddress,
        participationFee,
        maxParticipants,
        drawDateTime,
        prizePercentage,
        investmentPercentage,
        profitPercentage
      )

      addStatusMessage(`Transaction sent: ${tx.hash}`, 'info')
      await tx.wait()
      addStatusMessage('Lottery created successfully!', 'success')

      await loadLotteries()
    } catch (error) {
      console.error(error)
      addStatusMessage(`Error creating lottery: ${error.message}`, 'error')
    }
  }

  useEffect(() => {
    initializeContract()
    const interval = setInterval(() => {
      if (contract) loadLotteries(contract)
    }, 10000)
    return () => clearInterval(interval)
  }, [contract])

  return (
    <div id="app" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Stem Pay Lottery Manager</h1>
        <div>
          {signer ? (
            <span style={{ color: 'green', fontWeight: 'bold', padding: '8px 16px', border: '1px solid green', borderRadius: '4px' }}>
              🟢 Connected {CONFIG.ADMIN_PRIVATE_KEY ? '(Admin Key)' : '(MetaMask)'}
            </span>
          ) : (
            <span style={{ color: 'red' }}>🔴 Not Connected</span>
          )}
        </div>
      </header>

      <nav style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        {['dashboard', 'create', 'agents', 'logs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              backgroundColor: activeTab === tab ? '#007cba' : 'transparent',
              color: activeTab === tab ? 'white' : '#007cba',
              marginRight: '10px',
              padding: '10px 20px',
              border: '1px solid #007cba',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          <LotteryList
            activeLotteries={activeLotteries}
            drawnLotteries={drawnLotteries}
            contract={contract}
            addStatusMessage={addStatusMessage}
            provider={provider}
            tokenAddress={import.meta.env.VITE_MOCK_USDT_ADDRESS}
          />
        </div>

        <div style={{ display: activeTab === 'create' ? 'block' : 'none' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>Create New Lottery</h2>
            <form onSubmit={handleCreateLottery} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Token Address</label>
                <input
                  type="text"
                  name="tokenAddress"
                  required
                  defaultValue={import.meta.env.VITE_MOCK_USDT_ADDRESS}
                  placeholder="0x..."
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Fee (USDT)</label>
                  <input type="number" name="participationFee" required step="0.01" defaultValue="1.25" style={{ width: '100%', padding: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Max Participants</label>
                  <input type="number" name="maxParticipants" required defaultValue="10" style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Draw Time</label>
                <input type="datetime-local" name="drawDateTime" required style={{ width: '100%', padding: '8px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Prize %</label>
                  <input type="number" name="prizePercentage" required defaultValue="8" style={{ width: '100%', padding: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Invest %</label>
                  <input type="number" name="investmentPercentage" required defaultValue="4" style={{ width: '100%', padding: '8px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Profit %</label>
                  <input type="number" name="profitPercentage" required defaultValue="8" style={{ width: '100%', padding: '8px' }} />
                </div>
              </div>

              <button type="submit" style={{ padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1em' }}>
                Create Lottery
              </button>
            </form>
          </div>
        </div>

        <div style={{ display: activeTab === 'agents' ? 'block' : 'none' }}>
          <AgentManager
            provider={provider}
            tokenAddress={import.meta.env.VITE_MOCK_USDT_ADDRESS}
            adminPrivateKey={CONFIG.ADMIN_PRIVATE_KEY}
            addStatusMessage={addStatusMessage}
          />
        </div>

        <div style={{ display: activeTab === 'logs' ? 'block' : 'none', height: '100%' }}>
          <SystemLogs logs={statusMessages} onClear={handleClearLogs} />
        </div>
      </main>
    </div>
  )
}

export default App
