# 🚀 **HƯỚNG DẪN TÍCH HỢP TOKEN SYSTEM VÀO DỰ ÁN GAME**

## 📋 **TỔNG QUAN**

Dự án game hiện tại có foundation xuất sắc với:
- ✅ **Architecture**: Rust microservices + SvelteKit frontend
- ✅ **Game Engine**: Three.js + Rapier physics với collectibles system
- ✅ **Authentication**: PocketBase auth system
- ✅ **Wallet Integration**: Solana wallet support
- ✅ **Real-time Infrastructure**: WebSocket + gRPC

**Tuy nhiên, cần cải tiến 5 điểm chính trước khi tích hợp tokenMint.md để đảm bảo smooth integration.**

---

## 🎯 **CÁC ĐIỂM CẦN CẢI TIẾN**

### **1. 🔐 ENHANCE AUTHENTICATION SYSTEM (2-3 ngày)**

#### **Current State:**
- ✅ PocketBase authentication hoạt động
- ❌ Chưa có Solana wallet authentication
- ❌ Chưa có JWT middleware cho API protection

#### **Why Important for Token System:**
- Token operations cần user authentication
- Wallet address association với user account
- API protection cho sensitive operations

#### **Implementation Steps:**

##### **Step 1.1: Extend User Model**
```typescript
// client/src/lib/stores/auth.ts
interface User {
  id: string;
  email: string;
  solanaWalletAddress?: string;  // Add this field
  tokenBalance?: number;         // Add this field
}
```

##### **Step 1.2: Add Solana Wallet Authentication**
```typescript
// client/src/lib/stores/auth.ts - Add new method
async connectSolanaWallet(wallet: PhantomWallet): Promise<void> {
  const publicKey = await wallet.connect();

  // Associate wallet với user account
  await fetch('/api/auth/link-wallet', {
    method: 'POST',
    headers: this.getAuthHeaders(),
    body: JSON.stringify({
      walletAddress: publicKey.toString(),
      walletType: 'solana'
    })
  });

  // Update user profile
  this.updateUserProfile({ solanaWalletAddress: publicKey.toString() });
}
```

##### **Step 1.3: Add JWT Middleware**
```rust
// server/src/gateway/middleware.rs
pub async fn jwt_auth_middleware(
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Validate JWT token
    let token = req.headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "));

    match token {
        Some(token) => {
            // Verify JWT và extract user info
            match verify_jwt_token(token).await {
                Ok(user_claims) => {
                    // Add user info to request extensions
                    req.extensions_mut().insert(user_claims);
                    Ok(next.run(req).await)
                }
                Err(_) => Err(StatusCode::UNAUTHORIZED),
            }
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
```

##### **Step 1.4: Apply Middleware to Token Routes**
```rust
// server/src/gateway/routes.rs
let token_routes = Router::new()
    .route("/eat-particle", post(eat_particle_handler))
    .route("/balance", get(balance_handler))
    .route("/transfer", post(transfer_handler))
    .layer(middleware::from_fn(jwt_auth_middleware)); // Add auth middleware
```

---

### **2. 🌐 ADD TOKEN API ENDPOINTS (2-3 ngày)**

#### **Current State:**
- ✅ Room management, game state APIs
- ❌ Chưa có token operations

#### **Required Endpoints:**

##### **Step 2.1: Eat Particle Endpoint**
```rust
// server/src/gateway/handlers/token.rs
#[derive(Deserialize)]
pub struct EatParticleRequest {
    pub particle_location: (i32, i32),
    pub particle_type: String,
}

pub async fn eat_particle_handler(
    State(state): State<AppState>,
    Extension(user): Extension<UserClaims>,
    Json(req): Json<EatParticleRequest>,
) -> Result<Json<EatParticleResponse>, StatusCode> {
    // Validate user has Solana wallet connected
    let wallet_address = get_user_wallet_address(&state.db, user.user_id)
        .await
        .ok_or(StatusCode::BAD_REQUEST)?;

    // Call Anchor program to mint token
    let tx_result = mint_token_on_solana(
        &state.solana_client,
        &wallet_address,
        req.particle_location,
    ).await;

    match tx_result {
        Ok(tx_signature) => {
            // Update user token balance in database
            update_user_balance(&state.db, user.user_id, 1).await?;

            // Emit real-time update via WebSocket
            emit_token_update(&state.websocket, user.user_id, 1).await;

            Ok(Json(EatParticleResponse {
                success: true,
                tx_signature,
                new_balance: get_user_balance(&state.db, user.user_id).await,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to mint token: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
```

##### **Step 2.2: Balance Check Endpoint**
```rust
pub async fn balance_handler(
    State(state): State<AppState>,
    Extension(user): Extension<UserClaims>,
) -> Result<Json<BalanceResponse>, StatusCode> {
    let balance = get_user_balance(&state.db, user.user_id).await;

    Ok(Json(BalanceResponse {
        game_tokens: balance,
        wallet_address: get_user_wallet_address(&state.db, user.user_id).await,
    }))
}
```

##### **Step 2.3: Transfer Endpoint**
```rust
#[derive(Deserialize)]
pub struct TransferRequest {
    pub to_user_id: String,
    pub amount: u64,
}

pub async fn transfer_handler(
    State(state): State<AppState>,
    Extension(user): Extension<UserClaims>,
    Json(req): Json<TransferRequest>,
) -> Result<Json<TransferResponse>, StatusCode> {
    // Validate balance
    let balance = get_user_balance(&state.db, user.user_id).await;
    if balance < req.amount {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Execute transfer on Solana
    let tx_result = transfer_tokens_on_solana(
        &state.solana_client,
        &user.wallet_address,
        &req.to_wallet_address,
        req.amount,
    ).await;

    match tx_result {
        Ok(tx_signature) => {
            // Update database balances
            update_user_balance(&state.db, user.user_id, -(req.amount as i64)).await?;
            update_user_balance(&state.db, req.to_user_id, req.amount as i64).await?;

            Ok(Json(TransferResponse {
                success: true,
                tx_signature,
            }))
        }
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
```

---

### **3. 🎮 INTEGRATE TOKEN INTO GAME LOGIC (2-3 ngày)**

#### **Current State:**
- ✅ Collectible system hoạt động
- ❌ Chưa có token minting khi collect

#### **Implementation Steps:**

##### **Step 3.1: Modify Collectible.collect()**
```typescript
// client/src/lib/game/core/entities/Collectible.ts
public async collect(): Promise<void> {
  if (this.isCollected) return;

  this.isCollected = true;
  this.collectionTime = Date.now();

  try {
    // Call API to mint token
    const response = await fetch('/api/token/eat-particle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`, // From auth store
      },
      body: JSON.stringify({
        particle_location: [
          Math.round(this.getPosition().x),
          Math.round(this.getPosition().z)
        ],
        particle_type: this.getType(),
      }),
    });

    if (response.ok) {
      const result = await response.json();

      // Show token reward effect
      this.showTokenRewardEffect(result.new_balance);

      // Update game UI
      gameStore.updateTokenBalance(result.new_balance);

      console.log(`🎯 Minted token! New balance: ${result.new_balance}`);
    } else {
      console.error('Failed to mint token:', response.statusText);
      // Fallback: continue with visual collection only
    }
  } catch (error) {
    console.error('Token minting error:', error);
    // Continue with visual collection
  }

  // Continue with existing collection animation
  this.animateCollection();
}
```

##### **Step 3.2: Add Token Reward Effect**
```typescript
// client/src/lib/game/core/entities/Collectible.ts
private showTokenRewardEffect(newBalance: number): void {
  if (!this.mesh) return;

  // Create floating text effect
  const tokenText = this.createTokenText(`+1 TOKEN\nBalance: ${newBalance}`);
  tokenText.position.copy(this.getPosition());
  tokenText.position.y += 2;

  // Add to scene temporarily
  this.gameScene.add(tokenText);

  // Animate upward and fade out
  const animate = () => {
    tokenText.position.y += 0.02;
    tokenText.material.opacity -= 0.01;

    if (tokenText.material.opacity > 0) {
      requestAnimationFrame(animate);
    } else {
      this.gameScene.remove(tokenText);
    }
  };

  animate();
}
```

##### **Step 3.3: Update Game Store**
```typescript
// client/src/lib/stores/game.ts
interface GameState {
  score: number;
  distance: number;
  tokenBalance: number;        // Add this
  sessionTokenEarned: number;  // Add this
  isConnected: boolean;
}

export const gameStore = writable<GameState>({
  score: 0,
  distance: 0,
  tokenBalance: 0,             // Initialize
  sessionTokenEarned: 0,       // Initialize
  isConnected: false,
});

export const gameActions = {
  // ... existing actions

  updateTokenBalance(balance: number) {
    gameStore.update(state => ({
      ...state,
      tokenBalance: balance,
    }));
  },

  addTokenEarned(amount: number) {
    gameStore.update(state => ({
      ...state,
      sessionTokenEarned: state.sessionTokenEarned + amount,
    }));
  },
};
```

---

### **4. 💰 SMART CONTRACT INTEGRATION (3-4 ngày)**

#### **Current State:**
- ✅ Solana wallet connection
- ❌ Chưa có Anchor program integration

#### **Implementation Steps:**

##### **Step 4.1: Setup Anchor Project**
```bash
# Tạo Anchor project trong thư mục mới
cd tokenMint
anchor init game_token
cd game_token

# Cài đặt dependencies
npm install @solana/web3.js @solana/wallet-adapter-react
```

##### **Step 4.2: Implement Anchor Program**
```rust
// programs/game_token/src/lib.rs
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

declare_id!("YourProgramIDHere");

#[program]
pub mod game_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Initialize program state
        Ok(())
    }

    pub fn eat_energy_particle(
        ctx: Context<EatEnergyParticle>,
        particle_location: (i32, i32)
    ) -> Result<()> {
        // Implementation from tokenMint.md
        // Mint tokens and emit event
        Ok(())
    }
}

// Context structs và account validations
#[derive(Accounts)]
pub struct Initialize<'info> {
    // ... accounts
}

#[derive(Accounts)]
pub struct EatEnergyParticle<'info> {
    // ... accounts from tokenMint.md
}
```

##### **Step 4.3: Client Integration**
```typescript
// client/src/lib/services/solanaService.ts
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';

export class SolanaService {
  private program: Program;
  private connection: Connection;

  constructor(wallet: any) {
    this.connection = new Connection(web3.clusterApiUrl('devnet'));

    const provider = new AnchorProvider(
      this.connection,
      wallet,
      AnchorProvider.defaultOptions()
    );

    // Load program from IDL
    this.program = new Program(IDL, PROGRAM_ID, provider);
  }

  async eatEnergyParticle(particleLocation: (i32, i32)) {
    try {
      const tx = await this.program.methods
        .eatEnergyParticle(particleLocation)
        .accounts({
          player: wallet.publicKey,
          // ... other accounts
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Solana transaction failed:', error);
      throw error;
    }
  }
}
```

##### **Step 4.4: Error Handling**
```typescript
// client/src/lib/services/solanaService.ts
async eatEnergyParticle(particleLocation: (i32, i32)) {
  try {
    // Check wallet connection
    if (!this.wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Estimate gas fee
    const estimatedFee = await this.connection.getFeeForMessage(/* ... */);

    // Execute transaction
    const tx = await this.program.methods
      .eatEnergyParticle(particleLocation)
      .accounts({ /* ... */ })
      .rpc();

    // Wait for confirmation
    await this.connection.confirmTransaction(tx);

    return tx;
  } catch (error) {
    // Handle different error types
    if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient SOL for transaction fees');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Too many transactions, please wait');
    } else {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
}
```

---

### **5. 📊 ADD TOKEN TRACKING & UI (1-2 ngày)**

#### **Current State:**
- ✅ Game stats tracking
- ❌ Chưa có token balance tracking

#### **Implementation Steps:**

##### **Step 5.1: Token Balance UI Component**
```svelte
<!-- client/src/lib/components/TokenBalance.svelte -->
<script lang="ts">
  import { gameStore } from '$lib/stores/game';
  import { authStore } from '$lib/stores/auth';

  let tokenBalance = 0;
  let sessionEarned = 0;

  // Subscribe to stores
  gameStore.subscribe(state => {
    tokenBalance = state.tokenBalance;
    sessionEarned = state.sessionTokenEarned;
  });
</script>

<div class="token-balance">
  <div class="balance-display">
    <span class="balance-icon">🪙</span>
    <span class="balance-amount">{tokenBalance.toLocaleString()}</span>
    <span class="balance-label">Tokens</span>
  </div>

  {#if sessionEarned > 0}
    <div class="session-earned">
      +{sessionEarned} this session
    </div>
  {/if}
</div>

<style>
  .token-balance {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-family: monospace;
  }

  .balance-display {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .balance-icon {
    font-size: 24px;
  }

  .balance-amount {
    font-size: 18px;
    font-weight: bold;
    color: #00ff88;
  }

  .session-earned {
    margin-top: 4px;
    font-size: 12px;
    color: #888;
  }
</style>
```

##### **Step 5.2: Real-time Balance Sync**
```typescript
// client/src/lib/services/tokenService.ts
export class TokenService {
  private ws: WebSocket;
  private reconnectAttempts = 0;

  constructor() {
    this.connectWebSocket();
  }

  private connectWebSocket() {
    this.ws = new WebSocket('ws://localhost:8080/token-updates');

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'token_update') {
        // Update game store
        gameActions.updateTokenBalance(data.new_balance);
        gameActions.addTokenEarned(data.amount);

        // Show notification
        this.showTokenNotification(data.amount);
      }
    };

    this.ws.onclose = () => {
      // Reconnect logic
      if (this.reconnectAttempts < 5) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connectWebSocket();
        }, 1000 * this.reconnectAttempts);
      }
    };
  }

  private showTokenNotification(amount: number) {
    // Show toast notification
    const notification = document.createElement('div');
    notification.className = 'token-notification';
    notification.innerHTML = `+${amount} 🪙`;
    document.body.appendChild(notification);

    // Animate and remove
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}
```

##### **Step 5.3: Token History Component**
```svelte
<!-- client/src/lib/components/TokenHistory.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/auth';

  interface Transaction {
    id: string;
    type: 'mint' | 'transfer' | 'receive';
    amount: number;
    timestamp: string;
    txSignature?: string;
  }

  let transactions: Transaction[] = [];
  let loading = false;

  onMount(async () => {
    await loadTransactionHistory();
  });

  async function loadTransactionHistory() {
    loading = true;
    try {
      const response = await fetch('/api/token/history', {
        headers: {
          'Authorization': `Bearer ${$authStore.tokens?.access_token}`,
        },
      });

      if (response.ok) {
        transactions = await response.json();
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="token-history">
  <h3>Transaction History</h3>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if transactions.length === 0}
    <div class="empty">No transactions yet</div>
  {:else}
    <div class="transactions">
      {#each transactions as tx}
        <div class="transaction" class:mint={tx.type === 'mint'} class:transfer={tx.type === 'transfer'}>
          <div class="tx-icon">
            {#if tx.type === 'mint'}🪙{:else if tx.type === 'transfer'}📤{:else}📥{/if}
          </div>
          <div class="tx-details">
            <div class="tx-amount">{tx.type === 'transfer' ? '-' : '+'}{tx.amount}</div>
            <div class="tx-timestamp">{new Date(tx.timestamp).toLocaleString()}</div>
            {#if tx.txSignature}
              <div class="tx-signature">
                <a href={`https://solscan.io/tx/${tx.txSignature}`} target="_blank">
                  View on Solscan
                </a>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .token-history {
    max-width: 400px;
    margin: 20px auto;
  }

  .transactions {
    max-height: 300px;
    overflow-y: auto;
  }

  .transaction {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #eee;
    gap: 12px;
  }

  .mint { background-color: rgba(0, 255, 136, 0.1); }
  .transfer { background-color: rgba(255, 136, 0, 0.1); }

  .tx-icon {
    font-size: 20px;
  }

  .tx-amount {
    font-weight: bold;
    font-size: 16px;
  }

  .tx-timestamp {
    font-size: 12px;
    color: #666;
  }

  .tx-signature a {
    font-size: 11px;
    color: #007bff;
    text-decoration: none;
  }
</style>
```

---

## 📅 **TIMELINE TÍCH HỢP**

### **Phase 1: Foundation Enhancement (Tuần 1)**
- ✅ Enhance Authentication: Add Solana wallet auth + JWT middleware
- ✅ Add Token API Endpoints: `/api/token/*` routes
- ✅ Deploy Anchor Program: Smart contract on Solana devnet

### **Phase 2: Game Integration (Tuần 2)**
- ✅ Integrate Collectible System: Gọi API khi ăn hạt
- ✅ Add Token UI: Balance display, earning notifications
- ✅ Real-time Balance Sync: WebSocket updates

### **Phase 3: Advanced Features (Tuần 3)**
- ✅ Token Transfer System: Player-to-player transfers
- ✅ Transaction History: Mint/transfer logs
- ✅ Leaderboards: Token earnings rankings

### **Phase 4: Testing & Optimization (Tuần 4)**
- ✅ End-to-end Testing: Mint → Transfer → Balance sync
- ✅ Performance Testing: 1000+ concurrent minting
- ✅ Security Audit: Smart contract và API security

---

## 🎯 **SUCCESS METRICS**

### **Technical Metrics:**
- ✅ **Minting Latency**: <500ms từ eat đến confirm
- ✅ **API Response Time**: <100ms cho balance checks
- ✅ **WebSocket Sync**: <50ms real-time updates
- ✅ **Transaction Success Rate**: >99.5%

### **User Experience Metrics:**
- ✅ **Token Visibility**: Real-time balance updates
- ✅ **Minting Feedback**: Immediate visual/audio feedback
- ✅ **Error Handling**: Clear error messages
- ✅ **Performance**: No gameplay stuttering

### **Business Metrics:**
- ✅ **Token Adoption**: >70% players mint tokens
- ✅ **Retention**: +15% daily active users
- ✅ **Engagement**: +25% session duration

---

## 🚨 **RISK MITIGATION**

### **Technical Risks:**
- **Smart Contract Failures**: Comprehensive testing + audit
- **Network Congestion**: Retry logic + user notifications
- **Wallet Connection Issues**: Fallback mechanisms

### **User Experience Risks:**
- **Minting Delays**: Optimistic UI updates
- **Balance Sync Issues**: Local caching + conflict resolution
- **Transaction Failures**: Clear error handling + retry options

---

## 🏆 **FINAL RESULT**

**Sau khi hoàn thành các cải tiến trên, dự án sẽ có:**

🎯 **True Blockchain Integration**: Real-time token minting trong gameplay
💰 **Sustainable Token Economy**: 80/20 distribution với proper tracking
🎮 **Seamless User Experience**: Instant feedback, real-time balance updates
🛡️ **Production Ready**: Comprehensive error handling, security measures
📈 **Scalable Architecture**: Support thousands of concurrent players

**Timeline: 4 tuần | Budget: $15K-$25K | Risk Level: Low**

*Document này sẽ được cập nhật liên tục theo tiến độ implementation.*
