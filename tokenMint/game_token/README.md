# Game Token Smart Contract

This is the Solana smart contract for the Eneegy game's token system, built with Anchor framework.

## Features

- **Token Minting**: Mint tokens when players eat energy particles
- **80/20 Distribution**: 80% to game pool, 20% to owner
- **Rate Limiting**: Prevent spam minting (max 10 per minute per player)
- **Real-time Tracking**: Track player statistics and token balances

## Project Structure

```
game_token/
├── programs/
│   └── game_token/
│       └── src/
│           └── lib.rs          # Main smart contract logic
├── tests/
│   └── game_token.ts           # Integration tests
├── app/
│   └── src/
│       ├── components/
│       │   └── WalletConnector.tsx  # React component for wallet integration
│       ├── solanaService.ts         # Service for interacting with smart contract
│       └── App.tsx                  # Main React app
├── Anchor.toml                 # Anchor configuration
└── package.json               # Node.js dependencies
```

## Prerequisites

1. **Install Solana CLI**: https://docs.solana.com/cli/install-solana-cli-tools
2. **Install Anchor**: https://www.anchor-lang.com/docs/installation
3. **Install Node.js**: https://nodejs.org/

## Setup

1. **Install dependencies**:
```bash
npm install
cd app && npm install
```

2. **Start local Solana validator**:
```bash
solana-test-validator
```

3. **Build the smart contract**:
```bash
anchor build
```

4. **Deploy to localnet**:
```bash
anchor deploy
```

5. **Run tests**:
```bash
anchor test
```

## Running the Demo App

1. **Start the React app**:
```bash
cd app
npm start
```

2. **Connect Phantom wallet** and test token minting

## Smart Contract Functions

### `initialize()`
Initialize the minting authority and set up the program.

### `create_game_token_mint()`
Create the SPL token mint for game tokens.

### `eat_energy_particle(particle_location)`
Mint tokens when a player eats an energy particle:
- Checks rate limits
- Mints 1 token to game pool (80% distribution)
- Mints 1 token to owner (20% distribution)
- Updates player statistics
- Emits event with transaction details

### `convert_to_real_tokens(amount)`
Convert game tokens to real tokens (for future implementation).

## Account Structure

### MintingAuthority
- `owner`: Program owner
- `total_minted`: Total tokens minted
- `is_infinite`: Whether supply is infinite
- `max_supply`: Maximum supply (if not infinite)
- `max_mints_per_player_per_minute`: Rate limit per player

### PlayerMintStats
- `player`: Player public key
- `session_tokens`: Tokens earned in current session
- `last_mint_minute`: Last mint timestamp (minutes)
- `mints_this_minute`: Mints in current minute
- `total_earned`: Total tokens earned

### GameTokenPools
- `authority`: Minting authority
- `active_pool`: Tokens in active gameplay
- `reward_pool`: Reward tokens
- `reserve_pool`: Reserve tokens
- `burn_pool`: Burned tokens

## Events

### TokenMintedEvent
Emitted when tokens are minted:
- `player`: Player who triggered minting
- `game_amount`: Tokens sent to game pool
- `owner_amount`: Tokens sent to owner
- `particle_location`: Location of eaten particle
- `timestamp`: Mint timestamp
- `session_tokens`: Player's session token count

## Error Handling

- `SupplyLimitExceeded`: Token supply limit reached
- `PlayerRateLimitExceeded`: Player exceeded minting rate limit

## Security Features

- **Rate Limiting**: Prevents spam minting
- **Account Validation**: Ensures proper account ownership
- **Supply Control**: Optional supply limits
- **Access Control**: Owner-only functions

## Integration with Game

The smart contract integrates with the game backend through:

1. **API Endpoints**: `/api/token/eat-particle`
2. **Real-time Updates**: WebSocket notifications
3. **Balance Sync**: Automatic balance updates
4. **Transaction History**: Mint/transfer tracking

## Deployment

### Devnet Deployment
```bash
anchor deploy --provider.cluster devnet
```

### Mainnet Deployment
```bash
anchor deploy --provider.cluster mainnet
```

## Testing

Run comprehensive tests:
```bash
anchor test
```

Test scenarios:
- ✅ Program initialization
- ✅ Token mint creation
- ✅ Energy particle eating
- ✅ Rate limiting
- ✅ Account validation
- ✅ Event emission

## Monitoring

Monitor contract activity:
- Transaction logs
- Event emissions
- Account balances
- Rate limit tracking

## Future Enhancements

- Token burning mechanisms
- Staking rewards
- NFT integration
- Cross-chain bridging
- Advanced analytics



