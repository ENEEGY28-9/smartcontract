import React, { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaService } from '../solanaService';

const WalletConnector: React.FC = () => {
  const { connected, publicKey, wallet } = useWallet();
  const [solanaService, setSolanaService] = useState<SolanaService | null>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && wallet) {
      const service = new SolanaService({ connected, publicKey, wallet } as any);
      setSolanaService(service);

      // Initialize program
      service.initializeProgram().catch(console.error);
    } else {
      setSolanaService(null);
    }
  }, [connected, wallet, publicKey]);

  const loadPlayerStats = async () => {
    if (!solanaService) return;

    setLoading(true);
    try {
      const stats = await solanaService.getPlayerStats();
      setPlayerStats(stats);
    } catch (error) {
      console.error('Failed to load player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (solanaService && connected) {
      loadPlayerStats();
    }
  }, [solanaService, connected]);

  const testMintToken = async () => {
    if (!solanaService) return;

    setLoading(true);
    try {
      const txSignature = await solanaService.eatEnergyParticle([10, 15]);
      console.log('Token minted! TX:', txSignature);
      alert(`Token minted successfully! Transaction: ${txSignature}`);

      // Reload stats
      await loadPlayerStats();
    } catch (error: any) {
      console.error('Mint failed:', error);
      alert(`Mint failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Phantom Wallet Integration</h3>

      <div style={{ marginBottom: '20px' }}>
        <WalletMultiButton />
      </div>

      {connected && publicKey && (
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Connected:</strong> {publicKey.toString()}</p>
          <p><strong>Status:</strong> {solanaService?.getConnectionStatus()}</p>
        </div>
      )}

      {playerStats && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <h4>Player Stats</h4>
          <p>Session Tokens: {playerStats.sessionTokens || 0}</p>
          <p>Total Earned: {playerStats.totalEarned || 0}</p>
          <p>Mints This Minute: {playerStats.mintsThisMinute || 0}</p>
        </div>
      )}

      {connected && (
        <div>
          <button
            onClick={testMintToken}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing...' : 'Test Mint Token'}
          </button>

          <button
            onClick={loadPlayerStats}
            disabled={loading}
            style={{
              padding: '10px 20px',
              marginLeft: '10px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Refresh Stats
          </button>
        </div>
      )}

      {!connected && (
        <p>Please connect your Phantom wallet to test token minting.</p>
      )}
    </div>
  );
};

export default WalletConnector;












