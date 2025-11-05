# 🚀 Roadmap Chuyển Đổi Ví Wallet Sang Ví Thật

## 📋 Tổng Quan

**Dự án:** GameV1 Multiplayer Gaming Platform  
**Mục tiêu:** Chuyển đổi từ hệ thống ví demo/test sang ví blockchain thật  
**Thời gian dự kiến:** 4-6 tháng  
**Ngân sách ước tính:** $50,000 - $100,000  

---

## 🎯 Hiện Trạng Hệ Thống

### ✅ Đã Hoạt Động
- [x] Giao diện UI/UX hoàn chỉnh
- [x] 3 mạng: Ethereum, Solana, Bitcoin
- [x] Tính năng Transfer/Swap UI
- [x] Authentication với PocketBase
- [x] Database schema cho wallets

### ❌ Vấn Đề Hiện Tại
- [ ] Balance là mock data
- [ ] Không kết nối blockchain
- [ ] Không thể nhận/send coin thật
- [ ] Không có wallet connections
- [ ] Không có smart contracts

---

## 🏗️ Kiến Trúc Mục Tiêu

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (Svelte)      │◄──►│   (Node.js)     │◄──►│   Networks      │
│                 │    │                 │    │                 │
│ • Wallet UI     │    │ • Web3 Services │    │ • ETH Network   │
│ • Connect       │    │ • Transaction   │    │ • SOL Network   │
│ • Transfer      │    │ • Balance Sync  │    │ • BTC Network   │
│ • Swap          │    │ • Gas Estimation│    │ • Smart Contracts│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📋 Phase 1: Infrastructure Setup (Tuần 1-2)

### 1.1 Web3 Libraries Integration

#### Ethereum
```bash
npm install ethers@^6.0.0 @ethersproject/providers
npm install @metamask/detect-provider
```

#### Solana
```bash
npm install @solana/web3.js@^1.87.0 @solana/wallet-adapter-base
npm install @solana/wallet-adapter-phantom
```

#### Bitcoin
```bash
npm install bitcoinjs-lib@^6.1.0
npm install bip39@^3.1.0
```

### 1.2 Smart Contract Development

#### ERC-20 Token Contract (Ethereum)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GameV1Token {
    string public name = "GameV1 Token";
    string public symbol = "GV1";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * 10 ** decimals;
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value);
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value);
        require(allowance[_from][msg.sender] >= _value);
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}
```

#### Solana Program (Anchor)
```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("YourProgramIDHere");

#[program]
pub mod gamev1_wallet {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let wallet_account = &mut ctx.accounts.wallet_account;
        wallet_account.authority = ctx.accounts.authority.key();
        wallet_account.bump = ctx.bumps.wallet_account;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let transfer_ix = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.wallet_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                transfer_ix,
            ),
            amount,
        )?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let wallet_account = &ctx.accounts.wallet_account;
        let authority = wallet_account.authority;
        let bump = wallet_account.bump;

        let seeds = &[
            b"wallet",
            authority.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ix = Transfer {
            from: ctx.accounts.wallet_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.wallet_pda.to_account_info(),
        };

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_ix,
                signer,
            ),
            amount,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 1,
        seeds = [b"wallet", authority.key().as_ref()],
        bump
    )]
    pub wallet_account: Account<'info, WalletAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"wallet", authority.key().as_ref()],
        bump = wallet_account.bump
    )]
    pub wallet_account: Account<'info, WalletAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub wallet_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"wallet", authority.key().as_ref()],
        bump = wallet_account.bump
    )]
    pub wallet_account: Account<'info, WalletAccount>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub wallet_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"wallet", authority.key().as_ref()],
        bump = wallet_account.bump
    )]
    pub wallet_pda: SystemAccount<'info>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct WalletAccount {
    pub authority: Pubkey,
    pub bump: u8,
}
```

### 1.3 Backend Services Setup

#### Node.js Backend Structure
```
server/
├── config/
│   ├── web3/
│   │   ├── ethereum.js
│   │   ├── solana.js
│   │   └── bitcoin.js
│   └── database.js
├── services/
│   ├── wallet/
│   │   ├── ethereum.service.js
│   │   ├── solana.service.js
│   │   └── bitcoin.service.js
│   ├── transaction/
│   │   ├── transfer.service.js
│   │   └── swap.service.js
│   └── balance/
│       └── sync.service.js
├── routes/
│   ├── wallet.routes.js
│   └── transaction.routes.js
└── middleware/
    ├── auth.middleware.js
    └── web3.middleware.js
```

#### Ethereum Service
```javascript
const ethers = require('ethers');
const { Wallet, Transaction } = require('../models');

class EthereumService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        this.contractAddress = process.env.GV1_CONTRACT_ADDRESS;
        // Load contract ABI
        this.contract = new ethers.Contract(this.contractAddress, GV1_ABI, this.provider);
    }

    async getBalance(address) {
        try {
            const balance = await this.provider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting ETH balance:', error);
            throw error;
        }
    }

    async getTokenBalance(address) {
        try {
            const balance = await this.contract.balanceOf(address);
            return ethers.formatUnits(balance, 18);
        } catch (error) {
            console.error('Error getting token balance:', error);
            throw error;
        }
    }

    async sendTransaction(from, to, amount, privateKey) {
        try {
            const wallet = new ethers.Wallet(privateKey, this.provider);
            const tx = {
                to,
                value: ethers.parseEther(amount.toString()),
                gasLimit: 21000,
            };

            const transaction = await wallet.sendTransaction(tx);
            return await transaction.wait();
        } catch (error) {
            console.error('Error sending transaction:', error);
            throw error;
        }
    }

    async estimateGas(from, to, amount) {
        try {
            const gasEstimate = await this.provider.estimateGas({
                to,
                value: ethers.parseEther(amount.toString()),
            });
            const gasPrice = await this.provider.getFeeData();
            return {
                gasLimit: gasEstimate,
                gasPrice: gasPrice.gasPrice,
                totalCost: gasEstimate * gasPrice.gasPrice,
            };
        } catch (error) {
            console.error('Error estimating gas:', error);
            throw error;
        }
    }
}

module.exports = new EthereumService();
```

#### Solana Service
```javascript
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } = require('@solana/spl-token');
const bs58 = require('bs58');

class SolanaService {
    constructor() {
        this.connection = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
        this.tokenMint = new PublicKey(process.env.GV1_TOKEN_MINT);
    }

    async getBalance(publicKey) {
        try {
            const balance = await this.connection.getBalance(new PublicKey(publicKey));
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Error getting SOL balance:', error);
            throw error;
        }
    }

    async getTokenBalance(ownerPublicKey) {
        try {
            const owner = new PublicKey(ownerPublicKey);
            const associatedTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                owner
            );

            const accountInfo = await this.connection.getAccountInfo(associatedTokenAccount);
            if (!accountInfo) return '0';

            const tokenAccountInfo = await this.connection.getTokenAccountBalance(associatedTokenAccount);
            return tokenAccountInfo.value.uiAmountString;
        } catch (error) {
            console.error('Error getting token balance:', error);
            throw error;
        }
    }

    async sendTransaction(fromPrivateKey, toPublicKey, amount) {
        try {
            const fromKeypair = Keypair.fromSecretKey(bs58.decode(fromPrivateKey));
            const toPublicKeyObj = new PublicKey(toPublicKey);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: toPublicKeyObj,
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            const signature = await this.connection.sendTransaction(transaction, [fromKeypair]);
            await this.connection.confirmTransaction(signature);
            return signature;
        } catch (error) {
            console.error('Error sending SOL transaction:', error);
            throw error;
        }
    }

    async transferToken(fromPrivateKey, toPublicKey, amount) {
        try {
            const fromKeypair = Keypair.fromSecretKey(bs58.decode(fromPrivateKey));
            const toPublicKeyObj = new PublicKey(toPublicKey);

            const fromTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                fromKeypair.publicKey
            );

            const toTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                toPublicKeyObj
            );

            const transaction = new Transaction().add(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    fromKeypair.publicKey,
                    amount * Math.pow(10, 9), // Assuming 9 decimals
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            const signature = await this.connection.sendTransaction(transaction, [fromKeypair]);
            await this.connection.confirmTransaction(signature);
            return signature;
        } catch (error) {
            console.error('Error transferring token:', error);
            throw error;
        }
    }
}

module.exports = new SolanaService();
```

---

## 📋 Phase 2: Wallet Connection Integration (Tuần 3-4)

### 2.1 Frontend Wallet Adapters

#### MetaMask Integration
```typescript
// src/lib/wallet/ethereum.ts
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

export class EthereumWallet {
    private provider: any;
    private signer: ethers.Signer | null = null;

    async connect(): Promise<string> {
        try {
            this.provider = await detectEthereumProvider();

            if (!this.provider) {
                throw new Error('MetaMask not installed');
            }

            // Request account access
            await this.provider.request({ method: 'eth_requestAccounts' });

            const ethersProvider = new ethers.BrowserProvider(this.provider);
            this.signer = await ethersProvider.getSigner();

            const address = await this.signer.getAddress();
            return address;
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        this.signer = null;
        this.provider = null;
    }

    async getBalance(): Promise<string> {
        if (!this.signer) throw new Error('Wallet not connected');

        const address = await this.signer.getAddress();
        const balance = await this.provider.getBalance(address);
        return ethers.formatEther(balance);
    }

    async sendTransaction(to: string, amount: string): Promise<string> {
        if (!this.signer) throw new Error('Wallet not connected');

        const tx = await this.signer.sendTransaction({
            to,
            value: ethers.parseEther(amount),
        });

        return tx.hash;
    }

    async signMessage(message: string): Promise<string> {
        if (!this.signer) throw new Error('Wallet not connected');

        return await this.signer.signMessage(message);
    }
}
```

#### Phantom Integration
```typescript
// src/lib/wallet/solana.ts
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

declare global {
    interface Window {
        solana?: any;
    }
}

export class SolanaWallet {
    private connection: Connection;
    private publicKey: PublicKey | null = null;

    constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    async connect(): Promise<string> {
        try {
            if (!window.solana) {
                throw new Error('Phantom wallet not found');
            }

            const response = await window.solana.connect();
            this.publicKey = new PublicKey(response.publicKey.toString());

            return this.publicKey.toString();
        } catch (error) {
            console.error('Error connecting to Phantom:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (window.solana) {
            await window.solana.disconnect();
        }
        this.publicKey = null;
    }

    async getBalance(): Promise<string> {
        if (!this.publicKey) throw new Error('Wallet not connected');

        const balance = await this.connection.getBalance(this.publicKey);
        return (balance / 1000000000).toString(); // Convert lamports to SOL
    }

    async sendTransaction(to: string, amount: string): Promise<string> {
        if (!this.publicKey || !window.solana) throw new Error('Wallet not connected');

        const toPublicKey = new PublicKey(to);
        const lamports = parseFloat(amount) * 1000000000; // Convert SOL to lamports

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: this.publicKey,
                toPubkey: toPublicKey,
                lamports,
            })
        );

        const { blockhash } = await this.connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.publicKey;

        const signed = await window.solana.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize());

        return signature;
    }

    async signMessage(message: string): Promise<string> {
        if (!window.solana) throw new Error('Wallet not connected');

        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await window.solana.signMessage(encodedMessage);

        return signedMessage.signature.toString();
    }
}
```

### 2.2 Wallet Store Update

#### Enhanced Wallet Store
```typescript
// src/lib/stores/wallet.ts
import { writable } from 'svelte/store';
import { EthereumWallet } from '$lib/wallet/ethereum';
import { SolanaWallet } from '$lib/wallet/solana';
import { BitcoinWallet } from '$lib/wallet/bitcoin';

export type WalletType = 'ethereum' | 'solana' | 'bitcoin';

export interface WalletState {
    connected: boolean;
    connecting: boolean;
    address: string | null;
    balance: string;
    network: WalletType;
    error: string | null;
    supportedNetworks: WalletType[];
}

function createWalletStore() {
    const initialState: WalletState = {
        connected: false,
        connecting: false,
        address: null,
        balance: '0.00',
        network: 'ethereum',
        error: null,
        supportedNetworks: ['ethereum', 'solana', 'bitcoin'],
    };

    const { subscribe, set, update } = writable<WalletState>(initialState);

    return {
        subscribe,
        connect: async (network: WalletType) => {
            update(state => ({ ...state, connecting: true, error: null }));

            try {
                let wallet;
                let address: string;

                switch (network) {
                    case 'ethereum':
                        wallet = new EthereumWallet();
                        address = await wallet.connect();
                        break;
                    case 'solana':
                        wallet = new SolanaWallet();
                        address = await wallet.connect();
                        break;
                    case 'bitcoin':
                        wallet = new BitcoinWallet();
                        address = await wallet.connect();
                        break;
                    default:
                        throw new Error(`Unsupported network: ${network}`);
                }

                const balance = await wallet.getBalance();

                update(state => ({
                    ...state,
                    connected: true,
                    connecting: false,
                    address,
                    balance,
                    network,
                    error: null,
                }));

                // Save to database
                await saveWalletToDatabase(network, address);

                return { success: true, address };

            } catch (error) {
                update(state => ({
                    ...state,
                    connecting: false,
                    error: error.message,
                }));
                return { success: false, error: error.message };
            }
        },

        disconnect: async () => {
            update(state => ({
                ...state,
                connected: false,
                connecting: false,
                address: null,
                balance: '0.00',
                error: null,
            }));
        },

        refreshBalance: async () => {
            const state = get(walletStore);
            if (!state.connected || !state.address) return;

            try {
                let balance: string;

                switch (state.network) {
                    case 'ethereum':
                        const ethWallet = new EthereumWallet();
                        balance = await ethWallet.getBalance();
                        break;
                    case 'solana':
                        const solWallet = new SolanaWallet();
                        balance = await solWallet.getBalance();
                        break;
                    case 'bitcoin':
                        const btcWallet = new BitcoinWallet();
                        balance = await btcWallet.getBalance();
                        break;
                    default:
                        return;
                }

                update(state => ({ ...state, balance }));
            } catch (error) {
                console.error('Error refreshing balance:', error);
            }
        },

        setNetwork: (network: WalletType) => {
            update(state => ({ ...state, network }));
        },
    };
}

export const walletStore = createWalletStore();
```

---

## 📋 Phase 3: Transaction System (Tuần 5-8)

### 3.1 Transfer Implementation

#### Transfer Service
```typescript
// src/lib/services/transfer.service.ts
import { walletStore } from '$lib/stores/wallet';
import { pocketbaseService } from './pocketbaseService';

export interface TransferData {
    recipientAddress: string;
    amount: string;
    networkFee: 'low' | 'medium' | 'high';
    estimatedGas: string;
    totalCost: string;
}

export class TransferService {
    static async estimateGas(fromAddress: string, toAddress: string, amount: string, network: string): Promise<TransferData> {
        try {
            const response = await fetch('/api/wallet/estimate-gas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fromAddress,
                    toAddress,
                    amount,
                    network,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to estimate gas');
            }

            return await response.json();
        } catch (error) {
            console.error('Error estimating gas:', error);
            throw error;
        }
    }

    static async sendTransfer(transferData: TransferData, network: string): Promise<{ txHash: string }> {
        try {
            const response = await fetch('/api/wallet/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pocketbaseService.getCurrentUser()?.token}`,
                },
                body: JSON.stringify({
                    ...transferData,
                    network,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transfer failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending transfer:', error);
            throw error;
        }
    }

    static async getTransactionHistory(address: string, network: string): Promise<any[]> {
        try {
            const response = await fetch(`/api/wallet/transactions?address=${address}&network=${network}`, {
                headers: {
                    'Authorization': `Bearer ${pocketbaseService.getCurrentUser()?.token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    }
}
```

### 3.2 Swap Implementation

#### DEX Integration
```typescript
// src/lib/services/swap.service.ts
import { ethers } from 'ethers';

export interface SwapData {
    fromToken: string;
    toToken: string;
    amount: string;
    slippage: string;
    estimatedReceive: string;
    exchangeRate: string;
    networkFee: string;
    minimumReceived: string;
}

export class SwapService {
    private static readonly UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    private static readonly UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

    static async getQuote(fromToken: string, toToken: string, amount: string, network: string): Promise<SwapData> {
        try {
            // For demo purposes, using mock data
            // In production, integrate with 1inch, Paraswap, or DEX aggregators

            const mockRate = this.getMockExchangeRate(fromToken, toToken);
            const estimatedReceive = (parseFloat(amount) * mockRate).toString();
            const slippagePercent = 0.005; // 0.5%
            const minimumReceived = (parseFloat(estimatedReceive) * (1 - slippagePercent)).toString();

            return {
                fromToken,
                toToken,
                amount,
                slippage: '0.5',
                estimatedReceive,
                exchangeRate: mockRate.toString(),
                networkFee: '0.000021',
                minimumReceived,
            };
        } catch (error) {
            console.error('Error getting swap quote:', error);
            throw error;
        }
    }

    static async executeSwap(swapData: SwapData, network: string): Promise<{ txHash: string }> {
        try {
            const response = await fetch('/api/wallet/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pocketbaseService.getCurrentUser()?.token}`,
                },
                body: JSON.stringify({
                    ...swapData,
                    network,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Swap failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error executing swap:', error);
            throw error;
        }
    }

    private static getMockExchangeRate(fromToken: string, toToken: string): number {
        // Mock exchange rates - in production, fetch from APIs
        const rates: { [key: string]: { [key: string]: number } } = {
            'ETH': { 'USDT': 3000, 'USDC': 3000, 'WBTC': 0.066 },
            'SOL': { 'USDT': 100, 'USDC': 100, 'ETH': 0.33 },
            'BTC': { 'ETH': 15, 'USDT': 45000, 'USDC': 45000 },
        };

        return rates[fromToken]?.[toToken] || 1;
    }
}
```

---

## 📋 Phase 4: Security & Testing (Tuần 9-12)

### 4.1 Security Measures

#### Input Validation
```typescript
// src/lib/utils/validation.ts
export class WalletValidation {
    static isValidAddress(address: string, network: string): boolean {
        switch (network) {
            case 'ethereum':
                return ethers.isAddress(address);
            case 'solana':
                try {
                    new PublicKey(address);
                    return true;
                } catch {
                    return false;
                }
            case 'bitcoin':
                // Basic BTC address validation
                return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
            default:
                return false;
        }
    }

    static isValidAmount(amount: string): boolean {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M for safety
    }

    static sanitizeInput(input: string): string {
        return input.trim().replace(/[<>\"']/g, '');
    }

    static validateTransactionLimits(amount: string, network: string): { valid: boolean; reason?: string } {
        const num = parseFloat(amount);
        const limits = {
            ethereum: { min: 0.001, max: 100 }, // ETH
            solana: { min: 0.01, max: 1000 },   // SOL
            bitcoin: { min: 0.0001, max: 10 },   // BTC
        };

        const limit = limits[network];
        if (!limit) return { valid: false, reason: 'Unsupported network' };

        if (num < limit.min) return { valid: false, reason: `Minimum amount: ${limit.min}` };
        if (num > limit.max) return { valid: false, reason: `Maximum amount: ${limit.max}` };

        return { valid: true };
    }
}
```

#### Rate Limiting
```typescript
// src/lib/middleware/rateLimit.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class RateLimiter {
    static async checkLimit(userId: string, action: string): Promise<boolean> {
        const key = `ratelimit:${userId}:${action}`;
        const limit = this.getLimit(action);

        const current = await redis.incr(key);

        if (current === 1) {
            await redis.expire(key, 3600); // 1 hour window
        }

        return current <= limit;
    }

    static async getRemainingTime(userId: string, action: string): Promise<number> {
        const key = `ratelimit:${userId}:${action}`;
        const ttl = await redis.ttl(key);
        return ttl;
    }

    private static getLimit(action: string): number {
        const limits = {
            'wallet_connect': 10,      // 10 connections per hour
            'transaction_send': 50,    // 50 transactions per hour
            'balance_check': 100,      // 100 balance checks per hour
            'swap_execute': 20,        // 20 swaps per hour
        };

        return limits[action] || 10;
    }
}
```

#### Audit Trail
```typescript
// src/lib/services/audit.service.ts
import { pocketbaseService } from './pocketbaseService';

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    details: any;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    status: 'success' | 'failed';
}

export class AuditService {
    static async logActivity(
        userId: string,
        action: string,
        details: any,
        status: 'success' | 'failed' = 'success'
    ): Promise<void> {
        try {
            const auditData: Omit<AuditLog, 'id' | 'timestamp'> = {
                userId,
                action,
                details,
                ipAddress: this.getClientIP(),
                userAgent: navigator.userAgent,
                status,
            };

            await pocketbaseService.createRecord('audit_logs', auditData);
        } catch (error) {
            console.error('Failed to log audit activity:', error);
            // Don't throw - audit logging shouldn't break main functionality
        }
    }

    static async getUserActivity(userId: string, limit: number = 50): Promise<AuditLog[]> {
        try {
            return await pocketbaseService.getRecords('audit_logs', {
                filter: `userId = "${userId}"`,
                sort: '-timestamp',
                limit,
            });
        } catch (error) {
            console.error('Failed to get user activity:', error);
            return [];
        }
    }

    private static getClientIP(): string {
        // In production, get from request headers or use a service
        return 'unknown';
    }
}
```

### 4.2 Testing Strategy

#### Unit Tests
```typescript
// src/tests/wallet/ethereum.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EthereumWallet } from '$lib/wallet/ethereum';

describe('EthereumWallet', () => {
    let wallet: EthereumWallet;

    beforeEach(() => {
        wallet = new EthereumWallet();
    });

    describe('connect', () => {
        it('should connect to MetaMask successfully', async () => {
            // Mock MetaMask
            global.window.ethereum = {
                request: vi.fn().mockResolvedValue(['0x123...']),
                on: vi.fn(),
                removeListener: vi.fn(),
            };

            const address = await wallet.connect();
            expect(address).toBeDefined();
            expect(typeof address).toBe('string');
        });

        it('should throw error when MetaMask not available', async () => {
            delete global.window.ethereum;

            await expect(wallet.connect()).rejects.toThrow('MetaMask not installed');
        });
    });

    describe('getBalance', () => {
        it('should return balance as string', async () => {
            const mockBalance = '1.5';
            vi.mocked(wallet.provider.getBalance).mockResolvedValue(ethers.parseEther(mockBalance));

            const balance = await wallet.getBalance();
            expect(balance).toBe(mockBalance);
        });
    });
});
```

#### Integration Tests
```typescript
// src/tests/integration/wallet.integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestEnvironment } from '../utils/test-setup';
import { walletStore } from '$lib/stores/wallet';

describe('Wallet Integration', () => {
    beforeAll(async () => {
        await setupTestEnvironment();
    });

    describe('Full wallet flow', () => {
        it('should connect, get balance, and disconnect', async () => {
            // Connect
            const connectResult = await walletStore.connect('ethereum');
            expect(connectResult.success).toBe(true);
            expect(connectResult.address).toBeDefined();

            // Check balance
            await walletStore.refreshBalance();
            const state = get(walletStore);
            expect(state.balance).toBeDefined();
            expect(parseFloat(state.balance)).toBeGreaterThanOrEqual(0);

            // Disconnect
            await walletStore.disconnect();
            const disconnectedState = get(walletStore);
            expect(disconnectedState.connected).toBe(false);
        });

        it('should handle transfer transaction', async () => {
            const transferData = {
                recipientAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                amount: '0.01',
                networkFee: 'medium' as const,
            };

            const result = await TransferService.sendTransfer(transferData, 'ethereum');
            expect(result.txHash).toBeDefined();
            expect(result.txHash.length).toBeGreaterThan(0);
        });
    });
});
```

#### E2E Tests
```typescript
// src/tests/e2e/wallet.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Wallet E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/wallet-test');
        // Login process...
    });

    test('complete wallet connection flow', async ({ page }) => {
        // Test MetaMask connection
        await page.click('text=Connect Wallet');

        // Handle MetaMask popup
        const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            page.click('text=Connect Wallet')
        ]);

        await popup.click('text=Connect');
        await popup.waitForEvent('close');

        // Verify connection
        await expect(page.locator('text=Connected')).toBeVisible();

        // Test balance display
        await expect(page.locator('.balance-amount')).toBeVisible();

        // Test transfer
        await page.click('text=Transfer');
        await page.fill('input[placeholder*="recipient"]', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
        await page.fill('input[type="number"]', '0.01');
        await page.click('text=Send ETH');

        // Verify transaction success
        await expect(page.locator('text=Transaction successful')).toBeVisible();
    });
});
```

---

## 📋 Phase 5: Deployment & Monitoring (Tuần 13-16)

### 5.1 Production Deployment

#### Environment Configuration
```bash
# .env.production
NODE_ENV=production
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
BITCOIN_RPC_URL=https://blockstream.info/api
REDIS_URL=redis://production-redis:6379
POCKETBASE_URL=https://your-pocketbase-instance.com

# Contract addresses
GV1_CONTRACT_ADDRESS=0x...
GV1_TOKEN_MINT=...

# Security
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=your-256-bit-encryption-key
```

#### Docker Production Setup
```dockerfile
# Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
```

#### Docker Compose Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - pocketbase

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  pocketbase:
    image: pocketbase/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - pocketbase_data:/pb_data
      - ./pb_migrations:/pb_migrations

volumes:
  redis_data:
  pocketbase_data:
```

### 5.2 Monitoring & Analytics

#### Application Monitoring
```typescript
// src/lib/services/monitoring.service.ts
import * as Sentry from '@sentry/svelte';
import { browser } from '$app/environment';

export class MonitoringService {
    static init() {
        if (browser) {
            Sentry.init({
                dsn: 'your-sentry-dsn',
                environment: 'production',
                tracesSampleRate: 1.0,
                integrations: [
                    new Sentry.BrowserTracing(),
                    new Sentry.Replay(),
                ],
            });
        }
    }

    static captureException(error: Error, context?: any) {
        Sentry.captureException(error, {
            contexts: {
                custom: context,
            },
        });
    }

    static captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
        Sentry.captureMessage(message, level);
    }

    static setUser(user: { id: string; email?: string }) {
        Sentry.setUser(user);
    }

    static addBreadcrumb(breadcrumb: {
        message: string;
        category?: string;
        level?: Sentry.SeverityLevel;
    }) {
        Sentry.addBreadcrumb(breadcrumb);
    }
}
```

#### Blockchain Monitoring
```typescript
// src/lib/services/blockchain-monitor.service.ts
import Web3 from 'web3';
import { Connection } from '@solana/web3.js';

export class BlockchainMonitor {
    private ethProvider: Web3;
    private solanaConnection: Connection;
    private listeners: Map<string, any> = new Map();

    constructor() {
        this.ethProvider = new Web3(process.env.ETHEREUM_RPC_URL);
        this.solanaConnection = new Connection(process.env.SOLANA_RPC_URL);
    }

    async monitorTransaction(txHash: string, network: string): Promise<void> {
        switch (network) {
            case 'ethereum':
                await this.monitorEthereumTx(txHash);
                break;
            case 'solana':
                await this.monitorSolanaTx(txHash);
                break;
        }
    }

    private async monitorEthereumTx(txHash: string): Promise<void> {
        const receipt = await this.ethProvider.eth.getTransactionReceipt(txHash);

        if (receipt) {
            const status = receipt.status ? 'confirmed' : 'failed';
            await this.notifyTransactionStatus(txHash, status, receipt);
        } else {
            // Transaction still pending
            setTimeout(() => this.monitorEthereumTx(txHash), 5000);
        }
    }

    private async monitorSolanaTx(txHash: string): Promise<void> {
        const status = await this.solanaConnection.getSignatureStatus(txHash);

        if (status) {
            const txStatus = status.err ? 'failed' : 'confirmed';
            await this.notifyTransactionStatus(txHash, txStatus, status);
        } else {
            // Transaction still pending
            setTimeout(() => this.monitorSolanaTx(txHash), 5000);
        }
    }

    private async notifyTransactionStatus(txHash: string, status: string, details: any): Promise<void> {
        // Send notification to user via WebSocket or email
        // Update database with transaction status
        console.log(`Transaction ${txHash} status: ${status}`, details);
    }
}
```

#### Performance Monitoring
```typescript
// src/lib/services/performance.service.ts
import { browser } from '$app/environment';

export class PerformanceMonitor {
    static trackPageLoad(): void {
        if (!browser) return;

        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

            this.sendMetrics({
                type: 'page_load',
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                totalTime: navigation.loadEventEnd - navigation.fetchStart,
            });
        });
    }

    static trackWalletAction(action: string, duration: number, success: boolean): void {
        this.sendMetrics({
            type: 'wallet_action',
            action,
            duration,
            success,
            timestamp: Date.now(),
        });
    }

    static trackTransaction(txHash: string, network: string, amount: string, type: 'send' | 'receive' | 'swap'): void {
        this.sendMetrics({
            type: 'transaction',
            txHash,
            network,
            amount,
            transactionType: type,
            timestamp: Date.now(),
        });
    }

    private static sendMetrics(metrics: any): void {
        // Send to analytics service (Google Analytics, Mixpanel, etc.)
        console.log('Performance metrics:', metrics);

        // In production, send to your analytics endpoint
        fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metrics),
        }).catch(console.error);
    }
}
```

---

## 📋 Risk Assessment & Mitigation

### 🔴 High Risk Issues

#### 1. Private Key Management
**Risk:** Loss of user funds due to compromised private keys
**Mitigation:**
- Never store private keys on server
- Use hardware security modules (HSM)
- Implement multi-signature wallets
- Require biometric authentication for transactions

#### 2. Smart Contract Vulnerabilities
**Risk:** Exploitable smart contract bugs
**Mitigation:**
- Multiple security audits by reputable firms
- Bug bounty program ($100K+)
- Gradual contract deployment with circuit breakers
- Comprehensive test coverage (>95%)

#### 3. Exchange Rate Manipulation
**Risk:** Users lose funds due to manipulated DEX prices
**Mitigation:**
- Use multiple DEX aggregators (1inch, Paraswap)
- Implement slippage protection
- Real-time price monitoring
- Emergency pause functionality

### 🟡 Medium Risk Issues

#### 1. Network Congestion
**Risk:** High gas fees during network congestion
**Mitigation:**
- Dynamic gas price estimation
- Multi-network support (Layer 2 solutions)
- Gas-free alternatives (meta-transactions)

#### 2. Wallet Connection Issues
**Risk:** Users unable to connect wallets
**Mitigation:**
- Support multiple wallet types
- Clear error messages and troubleshooting guides
- Fallback connection methods

### 🟢 Low Risk Issues

#### 1. UI/UX Issues
**Risk:** Poor user experience leading to abandonment
**Mitigation:**
- Extensive user testing and feedback
- A/B testing for UI improvements
- Mobile-first responsive design

---

## 📋 Success Metrics & KPIs

### User Adoption
- [ ] 1,000+ active wallet connections
- [ ] 10,000+ transactions processed
- [ ] 50,000+ user registrations

### Technical Performance
- [ ] <2 second transaction confirmation time
- [ ] >99.9% uptime
- [ ] <100ms API response time
- [ ] <1% transaction failure rate

### Security
- [ ] Zero security incidents
- [ ] All smart contracts audited
- [ ] >95% test coverage
- [ ] SOC 2 Type II compliance

### Financial
- [ ] $100K+ monthly transaction volume
- [ ] <0.5% transaction fees
- [ ] Positive ROI within 6 months

---

## 📋 Timeline & Milestones

| Phase | Duration | Deliverables | Status |
|-------|----------|-------------|---------|
| **Phase 1: Infrastructure** | Tuần 1-2 | Web3 setup, Smart contracts | ✅ |
| **Phase 2: Wallet Connection** | Tuần 3-4 | MetaMask, Phantom integration | ⏳ |
| **Phase 3: Transaction System** | Tuần 5-8 | Transfer, Swap implementation | 📋 |
| **Phase 4: Security & Testing** | Tuần 9-12 | Audit, Testing suite | 📋 |
| **Phase 5: Deployment** | Tuần 13-16 | Production launch | 📋 |

---

## 📞 Support & Maintenance

### Post-Launch Support
- 24/7 technical support
- Regular security updates
- Performance monitoring
- User feedback integration

### Maintenance Schedule
- Daily: Security monitoring
- Weekly: Performance optimization
- Monthly: Feature updates
- Quarterly: Security audits

---

## 💰 Budget Breakdown

| Category | Amount | Purpose |
|----------|--------|---------|
| **Development** | $40,000 | Web3 integration, smart contracts |
| **Security Audit** | $15,000 | Smart contract & infrastructure audit |
| **Infrastructure** | $10,000 | Servers, databases, monitoring |
| **Testing** | $8,000 | QA, E2E testing, bug bounties |
| **Legal & Compliance** | $7,000 | KYC, AML compliance |
| **Marketing** | $10,000 | User acquisition, education |
| **Contingency** | $10,000 | Unexpected issues |
| **Total** | **$100,000** | Complete wallet implementation |

---

## 🎯 Conclusion

Roadmap này cung cấp kế hoạch chi tiết để chuyển đổi từ hệ thống ví demo sang ví blockchain thật. Việc triển khai đòi hỏi sự kết hợp giữa:

- **Technical Excellence**: Web3 integration, smart contracts, security
- **User Experience**: Seamless wallet connections, intuitive UI
- **Risk Management**: Comprehensive security, testing, monitoring
- **Business Viability**: Cost-effective implementation, measurable ROI

**Thời gian dự kiến: 4-6 tháng**  
**Đầu tư: $50,000 - $100,000**  
**Rủi ro: Trung bình (với mitigation strategies)**  
**Tiềm năng: High (blockchain adoption đang tăng)**

---

*Document Version: 1.0*  
*Last Updated: October 2024*  
*Author: AI Assistant*  
*Review Required: CTO, Security Team, Legal*





