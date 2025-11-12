import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

import WalletConnector from './components/WalletConnector';

function App() {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = clusterApiUrl(network);

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
    new TorusWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Eneegy Game Token Demo</h1>
            <p>This demo shows how to integrate Solana token minting with Phantom wallet.</p>

            <WalletConnector />

            <div style={{ marginTop: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
              <h2>How it works:</h2>
              <ol>
                <li>Connect your Phantom wallet</li>
                <li>Click "Test Mint Token" to simulate eating an energy particle</li>
                <li>The smart contract will mint tokens (80% to game pool, 20% to owner)</li>
                <li>Check your player stats to see token balances</li>
              </ol>

              <h3>Features:</h3>
              <ul>
                <li>Rate limiting: Max 10 mints per minute per player</li>
                <li>80/20 token distribution</li>
                <li>Real-time balance tracking</li>
                <li>Transaction signing and confirmation</li>
              </ul>
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;












