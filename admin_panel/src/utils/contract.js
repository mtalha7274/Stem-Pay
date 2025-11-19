import { ethers } from 'ethers';

export const STEM_PAY_LOTTERY_MANAGER_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_tokenAddress", "type": "address"},
      {"internalType": "uint256", "name": "_participationFee", "type": "uint256"},
      {"internalType": "uint256", "name": "_maxParticipants", "type": "uint256"},
      {"internalType": "uint256", "name": "_drawTime", "type": "uint256"},
      {"internalType": "uint256", "name": "_prizePercentage", "type": "uint256"},
      {"internalType": "uint256", "name": "_investmentPercentage", "type": "uint256"},
      {"internalType": "uint256", "name": "_profitPercentage", "type": "uint256"}
    ],
    "name": "createLottery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_lotteryId", "type": "uint256"}],
    "name": "drawWinner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_lotteryId", "type": "uint256"}],
    "name": "cancelLottery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_lotteryId", "type": "uint256"}],
    "name": "enterLottery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveLotteries",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDrawnLotteries",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_lotteryId", "type": "uint256"}],
    "name": "getLotteryInfo",
    "outputs": [{
      "components": [
        {"internalType": "address", "name": "tokenAddress", "type": "address"},
        {"internalType": "uint256", "name": "participationFee", "type": "uint256"},
        {"internalType": "uint256", "name": "refundableAmount", "type": "uint256"},
        {"internalType": "uint256", "name": "maxParticipants", "type": "uint256"},
        {"internalType": "uint256", "name": "drawTime", "type": "uint256"},
        {"internalType": "uint256", "name": "prizePercentage", "type": "uint256"},
        {"internalType": "uint256", "name": "investmentPercentage", "type": "uint256"},
        {"internalType": "uint256", "name": "profitPercentage", "type": "uint256"},
        {"internalType": "bool", "name": "isActive", "type": "bool"},
        {"internalType": "bool", "name": "isDrawn", "type": "bool"},
        {"internalType": "bool", "name": "isCancelled", "type": "bool"},
        {"internalType": "address", "name": "winner", "type": "address"},
        {"internalType": "uint256", "name": "voteCount", "type": "uint256"},
        {"internalType": "uint256", "name": "drawTimestamp", "type": "uint256"},
        {"internalType": "address[]", "name": "participants", "type": "address[]"}
      ],
      "internalType": "struct StemPayLotteryManager.LotteryInfo",
      "name": "info",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  }
];

export const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  // Fallback to read-only provider if needed, or throw
  throw new Error("No crypto wallet found. Please install MetaMask.");
};

export const getContract = async (address, abi, signerOrProvider) => {
  return new ethers.Contract(address, abi, signerOrProvider);
};

export const formatLotteryData = (id, info) => {
  return {
    id: Number(id),
    tokenAddress: info.tokenAddress,
    participationFee: info.participationFee,
    refundableAmount: info.refundableAmount,
    maxParticipants: Number(info.maxParticipants),
    drawTime: Number(info.drawTime),
    prizePercentage: Number(info.prizePercentage),
    investmentPercentage: Number(info.investmentPercentage),
    profitPercentage: Number(info.profitPercentage),
    isActive: info.isActive,
    isDrawn: info.isDrawn,
    isCancelled: info.isCancelled,
    winner: info.winner,
    voteCount: Number(info.voteCount),
    drawTimestamp: Number(info.drawTimestamp),
    participants: info.participants
  };
};
