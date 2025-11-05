# 🎮 Game Token - Eat Particles, Mint Tokens

**Eneegy Game Token Mint System** - Smart contract cho hệ thống token game nơi người chơi ăn hạt năng lượng để mint token ngay lập tức.

## 🌟 **Core Concept**

**Ăn Hạt = Mint Token Ngay Lập Tức**
- Nhân vật chạy vô tận trên map
- Hạt năng lượng spawn ngẫu nhiên
- Ăn hạt → Mint token real-time (80% game, 20% owner)
- Continuous gameplay = Continuous token minting

## 🏗️ **Architecture**

### **Smart Contract Modules**
- `MintingAuthority` - Quản lý việc mint token với rate limiting
- `PlayerMintStats` - Theo dõi hoạt động mint của từng player
- `GameTokenPools` - Quản lý các pool token trong game
- `eat_energy_particle()` - **CORE FUNCTION**: Ăn hạt → Mint token

### **Token Distribution (80/20)**
- **80%** → Game pools (cho gameplay)
- **20%** → Owner wallet (revenue)

### **Security Features**
- Per-player rate limiting (anti-spam)
- Supply control (infinite/finite)
- Emergency pause mechanism
- PDA-based account security

## 🚀 **Quick Start**

```bash
# Install dependencies
npm install

# Build smart contract
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## 🔧 **Development**

### **Project Structure**
```
game_token/
├── programs/game_token/src/lib.rs    # Main smart contract
├── tests/game_token.ts               # Integration tests
├── app/                              # Frontend (optional)
├── Anchor.toml                       # Anchor configuration
└── package.json                      # Dependencies
```

### **Key Functions**

#### `eat_energy_particle()`
```rust
// Core gameplay function
pub fn eat_energy_particle(
    ctx: Context<EatEnergyParticle>,
    particle_location: (i32, i32)  // Track where particle was eaten
) -> Result<()>
```
- Mint 2 tokens (1 game + 1 owner)
- Update player stats
- Emit event với location tracking
- Rate limiting per player

#### `earn_tokens()`
```rust
// Player earns tokens from game pools
pub fn earn_tokens(ctx: Context<EarnTokens>, amount: u64) -> Result<()>
```

## 📊 **Events**

### `TokenMintedEvent`
```rust
pub struct TokenMintedEvent {
    pub player: Pubkey,
    pub game_amount: u64,
    pub owner_amount: u64,
    pub particle_location: (i32, i32),  // Location tracking
    pub timestamp: i64,
    pub session_tokens: u64,
}
```

## 🧪 **Testing**

```bash
# Run all tests
anchor test

# Test specific scenarios
- Rate limiting per player
- Supply limit enforcement
- Emergency pause functionality
- Event emission verification
```

## 🔒 **Security**

- **Rate Limiting**: Max 10 mints/player/minute
- **Supply Control**: Configurable infinite/finite supply
- **Emergency Pause**: Owner can pause minting
- **PDA Security**: Program-derived addresses
- **Event Logging**: Complete audit trail

## 📈 **Performance Targets**

- **Minting Speed**: 1000+ particles/second
- **Latency**: <500ms per mint
- **Cost**: <$0.0005 per particle
- **Scalability**: 10,000+ concurrent players

## 🎯 **Integration với Game Client**

```typescript
// Game client integration
const eatParticle = async (location: {x: number, y: number}) => {
  const tx = await program.methods
    .eatEnergyParticle(location)
    .accounts({ /* accounts */ })
    .rpc();

  // Token minted immediately!
  // Update UI with new balance
  updatePlayerBalance();
};
```

## 🚀 **Deployment**

### **Devnet**
```bash
anchor deploy --provider.cluster devnet
```

### **Mainnet**
```bash
anchor deploy --provider.cluster mainnet
```

---

**Built with ❤️ for the Eneegy gaming ecosystem**

