import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Map the non-VITE_ variables to VITE_ variables for the frontend
      'import.meta.env.VITE_ADMIN_PRIVATE_KEY': JSON.stringify(env.ADMIN_PRIVATE_KEY),
      'import.meta.env.VITE_INFURA_API_KEY': JSON.stringify(env.INFURA_API_KEY),
      'import.meta.env.VITE_STEM_PAY_CONTRACT_ADDRESS': JSON.stringify(env.STEM_PAY_CONTRACT_ADDRESS),
      'import.meta.env.VITE_MOCK_USDT_ADDRESS': JSON.stringify(env.MOCK_USDT_ADDRESS),
    }
  }
})
