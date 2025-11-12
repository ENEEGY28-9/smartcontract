import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { GameToken } from "../target/types/game_token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("game_token", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GameToken as Program<GameToken>;
  const wallet = provider.wallet;

  let mintingAuthority: PublicKey;
  let gameTokenMint: PublicKey;

  before(async () => {
    // Derive PDAs
    [mintingAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority")],
      program.programId
    );

    [gameTokenMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("game_token_mint")],
      program.programId
    );
  });

  it("Initializes the program", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        owner: wallet.publicKey,
        authority: mintingAuthority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction signature:", tx);

    // Verify authority was created
    const authorityAccount = await program.account.mintingAuthority.fetch(mintingAuthority);
    expect(authorityAccount.owner.toString()).to.equal(wallet.publicKey.toString());
    expect(authorityAccount.isInfinite).to.be.true;
  });

  it("Creates game token mint", async () => {
    const tx = await program.methods
      .createGameTokenMint()
      .accounts({
        signer: wallet.publicKey,
        mint: gameTokenMint,
        authority: mintingAuthority,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Create mint transaction signature:", tx);
  });

  it("Mints tokens when eating energy particle", async () => {
    const playerStats = PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), wallet.publicKey.toBytes()],
      program.programId
    )[0];

    const gamePools = PublicKey.findProgramAddressSync(
      [Buffer.from("game_pools")],
      program.programId
    )[0];

    const tx = await program.methods
      .eatEnergyParticle([10, 15]) // particle location
      .accounts({
        player: wallet.publicKey,
        authority: mintingAuthority,
        gamePools,
        gamePoolsTokenAccount: gameTokenMint, // This needs proper ATA
        ownerTokenAccount: gameTokenMint, // This needs proper ATA
        gameTokenMint,
        playerStats,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    console.log("Mint token transaction signature:", tx);
  });
});












