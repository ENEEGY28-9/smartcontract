import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, Idl } from '@project-serum/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Import the IDL (this will be generated after build)
import idl from '../../target/idl/game_token.json';

export class SolanaService {
  private connection: Connection;
  private program: Program | null = null;
  private provider: AnchorProvider | null = null;

  constructor(wallet: WalletContextState) {
    this.connection = new Connection(
      web3.clusterApiUrl('devnet'),
      'confirmed'
    );

    if (wallet.connected && wallet.wallet) {
      this.provider = new AnchorProvider(
        this.connection,
        wallet.wallet.adapter,
        AnchorProvider.defaultOptions()
      );
    }
  }

  async initializeProgram(): Promise<void> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    this.program = new Program(
      idl as Idl,
      new PublicKey('GAMETOKEN11111111111111111111111111111112'),
      this.provider
    );
  }

  async eatEnergyParticle(particleLocation: [number, number]): Promise<string> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized or wallet not connected');
    }

    try {
      // Derive PDAs
      const [mintingAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority")],
        this.program.programId
      );

      const [gamePools] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_pools")],
        this.program.programId
      );

      const [playerStats] = PublicKey.findProgramAddressSync(
        [Buffer.from("player_stats"), this.provider.wallet.publicKey.toBytes()],
        this.program.programId
      );

      // Get token accounts (this is simplified - in real implementation you'd use proper ATAs)
      const gameTokenMint = new PublicKey('GAMETOKEN11111111111111111111111111111112');

      const tx = await this.program.methods
        .eatEnergyParticle(particleLocation)
        .accounts({
          player: this.provider.wallet.publicKey,
          authority: mintingAuthority,
          gamePools,
          gamePoolsTokenAccount: gameTokenMint, // This needs proper setup
          ownerTokenAccount: gameTokenMint, // This needs proper setup
          gameTokenMint,
          playerStats,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
          systemProgram: SystemProgram.programId,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      // Wait for confirmation
      await this.connection.confirmTransaction(tx);

      console.log('Token minted successfully:', tx);
      return tx;

    } catch (error: any) {
      console.error('Transaction failed:', error);

      // Handle different error types
      if (error.message.includes('insufficient funds')) {
        throw new Error('Insufficient SOL for transaction fees');
      } else if (error.message.includes('rate limit')) {
        throw new Error('Too many transactions, please wait');
      } else if (error.message.includes('User rejected')) {
        throw new Error('Transaction rejected by user');
      } else {
        throw new Error(`Transaction failed: ${error.message}`);
      }
    }
  }

  async getPlayerStats(): Promise<any> {
    if (!this.program || !this.provider) {
      throw new Error('Program not initialized or wallet not connected');
    }

    const [playerStats] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), this.provider.wallet.publicKey.toBytes()],
      this.program.programId
    );

    try {
      const stats = await this.program.account.playerMintStats.fetch(playerStats);
      return stats;
    } catch (error) {
      console.log('Player stats not found, returning defaults');
      return {
        sessionTokens: 0,
        totalEarned: 0,
        mintsThisMinute: 0,
        lastMintMinute: 0
      };
    }
  }

  async getMintingAuthority(): Promise<any> {
    if (!this.program) {
      throw new Error('Program not initialized');
    }

    const [authority] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      this.program.programId
    );

    const authAccount = await this.program.account.mintingAuthority.fetch(authority);
    return authAccount;
  }

  // Utility method to check if wallet is connected
  isWalletConnected(): boolean {
    return this.provider !== null && this.program !== null;
  }

  // Get connection status
  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    if (!this.provider) return 'disconnected';
    if (!this.program) return 'connecting';
    return 'connected';
  }
}



