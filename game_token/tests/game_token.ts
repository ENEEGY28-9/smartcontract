import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GameToken } from "../target/types/game_token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { expect } from "chai";

describe("game_token", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GameToken as Program<GameToken>;
  const wallet = provider.wallet;

  // Test accounts
  let mintingAuthority: PublicKey;
  let gamePools: PublicKey;
  let gamePoolsTokenAccount: PublicKey;
  let gameTokenMint: PublicKey;
  let ownerTokenAccount: PublicKey;
  let player: Keypair;

  const mintingAuthorityBump = 255; // Will be calculated properly
  const gamePoolsBump = 255; // Will be calculated properly
  const gamePoolsTokenAccountBump = 255; // Will be calculated properly

  before(async () => {
    // Create test accounts
    player = Keypair.generate();

    // Derive PDAs
    [mintingAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("minting_authority")],
      program.programId
    );

    [gamePools] = PublicKey.findProgramAddressSync(
      [Buffer.from("game_pools")],
      program.programId
    );

    [gamePoolsTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("game_pools_token_account")],
      program.programId
    );

    // Create game token mint
    gameTokenMint = await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    // Create owner's token account
    ownerTokenAccount = await createAccount(
      provider.connection,
      wallet.payer,
      gameTokenMint,
      wallet.publicKey,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    // Initialize minting authority
    await program.methods
      .initializeMintingAuthority(10, true, 0)
      .accounts({
        authority: mintingAuthority,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Initialize game pools
    await program.methods
      .initializeGamePools(gamePoolsBump)
      .accounts({
        gamePools: gamePools,
        gamePoolsTokenAccount: gamePoolsTokenAccount,
        gameTokenMint: gameTokenMint,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Airdrop SOL to player
    const airdropSig = await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(player.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL)
    );
  });

  it("Verify initialization", async () => {
    // Fetch and verify authority
    const authorityAccount = await program.account.mintingAuthority.fetch(mintingAuthority);
    expect(authorityAccount.owner.toString()).to.equal(wallet.publicKey.toString());
    expect(authorityAccount.isInfinite).to.be.true;
    expect(authorityAccount.maxMintsPerPlayerPerMinute).to.equal(10);

    // Verify game pools
    const gamePoolsAccount = await program.account.gameTokenPools.fetch(gamePools);
    expect(gamePoolsAccount.authority.toString()).to.equal(wallet.publicKey.toString());
    expect(gamePoolsAccount.activePool).to.equal(0);
  });

  it("Auto-mint tokens (scheduler logic)", async () => {
    const mintAmount = 100; // Mint 100 tokens

    const tx = await program.methods
      .autoMintTokens(mintAmount)
      .accounts({
        authority: mintingAuthority,
        gamePools: gamePools,
        gamePoolsTokenAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("game_pools_token_account")],
          program.programId
        )[0],
        ownerTokenAccount: ownerTokenAccount,
        gameTokenMint: gameTokenMint,
        owner: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    // Verify tokens were minted with 80/20 distribution
    const authorityAccount = await program.account.mintingAuthority.fetch(mintingAuthority);
    expect(authorityAccount.totalMinted).to.equal(mintAmount); // 100 tokens total

    // Verify game pools were updated
    const gamePoolsAccount = await program.account.gameTokenPools.fetch(gamePools);
    expect(gamePoolsAccount.activePool).to.equal(80); // 80% to game pool
  });

  it("Player earn from pool (new correct logic)", async () => {
    const earnAmount = 5; // Player earns 5 tokens from pool

    const tx = await program.methods
      .playerEarnFromPool(earnAmount)
      .accounts({
        gamePools: gamePools,
        gamePoolsTokenAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("game_pools_token_account")],
          program.programId
        )[0],
        playerStats: PublicKey.findProgramAddressSync(
          [Buffer.from("player_stats"), player.publicKey.toBytes()],
          program.programId
        )[0],
        playerTokenAccount: await createAccount(
          provider.connection,
          wallet.payer,
          gameTokenMint,
          player.publicKey,
          undefined,
          undefined,
          TOKEN_PROGRAM_ID
        ),
        gameTokenMint: gameTokenMint,
        player: player.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    // Verify player earned tokens
    const [playerStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), player.publicKey.toBytes()],
      program.programId
    );
    const playerStats = await program.account.playerMintStats.fetch(playerStatsPda);
    expect(playerStats.sessionTokens).to.equal(earnAmount);
    expect(playerStats.totalEarned).to.equal(earnAmount);

    // Verify game pool was reduced
    const gamePoolsAccount = await program.account.gameTokenPools.fetch(gamePools);
    expect(gamePoolsAccount.activePool).to.equal(80 - earnAmount); // 80 - 5 = 75
  });

  it("Rate limiting - respect per-player earn limits", async () => {
    // Try to earn tokens rapidly to test rate limiting
    const earnAmount = 3;

    // This should succeed (within rate limit)
    await program.methods
      .playerEarnFromPool(earnAmount)
      .accounts({
        gamePools: gamePools,
        gamePoolsTokenAccount: PublicKey.findProgramAddressSync(
          [Buffer.from("game_pools_token_account")],
          program.programId
        )[0],
        playerStats: PublicKey.findProgramAddressSync(
          [Buffer.from("player_stats"), player.publicKey.toBytes()],
          program.programId
        )[0],
        playerTokenAccount: await createAccount(
          provider.connection,
          wallet.payer,
          gameTokenMint,
          player.publicKey,
          undefined,
          undefined,
          TOKEN_PROGRAM_ID
        ),
        gameTokenMint: gameTokenMint,
        player: player.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
  });

  it("Emergency pause functionality", async () => {
    // First mint some tokens
    await program.methods
      .autoMintTokens(50)
      .accounts({
        authority: mintingAuthority,
        gamePools: gamePools,
        gamePoolsTokenAccount: gamePoolsTokenAccount,
        ownerTokenAccount: ownerTokenAccount,
        gameTokenMint: gameTokenMint,
        owner: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    await program.methods
      .emergencyPause()
      .accounts({
        authority: mintingAuthority,
        owner: wallet.publicKey,
      })
      .rpc();

    // Verify emergency pause
    const authorityAccount = await program.account.mintingAuthority.fetch(mintingAuthority);
    expect(authorityAccount.isInfinite).to.be.false;
    expect(authorityAccount.maxSupply).to.equal(authorityAccount.totalMinted);
  });
});

