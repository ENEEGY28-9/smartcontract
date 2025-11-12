# 🌉 Bridge System for Token Conversion

Bridge system cho phép chuyển đổi tokens giữa Solana và các blockchain khác sử dụng Wormhole protocol.

## 📋 Tổng quan

Bridge System bao gồm:
- **Smart Contracts**: Rust contracts trên Solana cho bridge operations
- **VAA Verification**: Xác thực Wormhole VAAs
- **Bridge Services**: TypeScript services cho bridge operations
- **Game Integration**: Tích hợp bridge vào game UI

## 🏗️ Kiến trúc

```
bridge/
├── programs/bridge_contract/src/lib.rs    # Smart contracts
├── src/
│   ├── index.ts                          # Main bridge system
│   ├── services/
│   │   ├── BridgeService.ts             # Bridge operations
│   │   └── VAAVerificationService.ts    # VAA verification
│   └── utils/
│       └── bridgeUtils.ts               # Utilities
├── scripts/
│   └── deploy.js                        # Deployment script
└── Anchor.toml                          # Anchor config
```

## 🚀 Các chức năng

### Bridge Tokens Out (Solana → Other Chains)
```typescript
const bridgeSystem = new BridgeSystem('devnet');
await bridgeSystem.bridgeTokensOut(userWallet, amount, targetChain, targetAddress);
```

### Bridge Tokens In (Other Chains → Solana)
```typescript
await bridgeSystem.bridgeTokensIn(userWallet, vaaHex);
```

### Supported Chains
- Ethereum (ID: 2)
- BSC (ID: 4)
- Polygon (ID: 5)
- Avalanche (ID: 6)
- Arbitrum (ID: 23)
- Optimism (ID: 24)
- Base (ID: 30)

## 💰 Bridge Fees

- **Base Fee**: 0.001 SOL
- **Percentage Fee**: 0.5% of token amount
- **Final Fee**: Max(baseFee, percentageFee)

## 🛠️ Development

### Build
```bash
npm install
npm run build
```

### Test
```bash
node test_simple.js
```

### Deploy
```bash
node scripts/deploy.js
```

## 🔒 Security

- VAA verification với Wormhole guardians
- Emergency pause functionality
- Multi-signature requirements (planned)
- Audit trail cho tất cả transactions

## 📊 Monitoring

Bridge system cung cấp:
- Transaction monitoring
- Bridge statistics
- Fee tracking
- Cross-chain volume analytics

## 🎮 Game Integration

Bridge system được tích hợp vào TokenService:

```typescript
// Bridge tokens to another chain
await TokenService.bridgeTokensOut(amount, targetChain, targetAddress);

// Complete bridge from another chain
await TokenService.bridgeTokensIn(vaaHex);

// Get bridge statistics
const stats = await TokenService.getBridgeStats();

// Get supported chains
const chains = TokenService.getSupportedBridgeChains();
```

## 📈 Roadmap

### Phase 1: Core Bridge (✅ Complete)
- Basic bridge contracts
- VAA verification system
- Game integration
- Multi-chain support

### Phase 2: Advanced Features (Next)
- Bridge aggregators
- Gas optimization
- Multi-hop bridges
- Bridge liquidity pools

### Phase 3: Enterprise Features (Future)
- Institutional bridges
- OTC trading
- Bridge insurance
- Cross-chain DeFi

## 🔗 Links

- [Wormhole Documentation](https://docs.wormhole.com/)
- [Solana Developer Guide](https://docs.solana.com/)
- [TokenMint Project](../tokenMint.md)

## 📞 Support

Bridge system được thiết kế để dễ dàng mở rộng và bảo trì. Contact development team để biết thêm chi tiết về implementation.

---

*Bridge System - Cross-chain token transfers made simple* 🌉










