/**
 * Initialize PDAs and Token Accounts for Production
 * Run after smart contract deployment
 */

const anchor = require('@coral-xyz/anchor');
const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, createMint, createAccount, getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');

async function initializeProductionPDAs() {
    console.log('🚀 Initializing Production PDAs...');

    // Setup connection
    const connection = new anchor.web3.Connection(
        'https://api.devnet.solana.com',
        'confirmed'
    );

    // Load wallet
    const walletKeypair = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')))
    );

    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: 'confirmed'
    });

    // Load IDL and program
    const idl = JSON.parse(fs.readFileSync('./target/idl/game_token.json'));
    const programId = new PublicKey(process.env.PROGRAM_ID || idl.metadata.address);
    const program = new anchor.Program(idl, programId, provider);

    console.log('📋 Program ID:', programId.toString());
    console.log('👤 Wallet:', wallet.publicKey.toString());

    // Derive PDAs
    const [mintingAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("minting_authority")],
        program.programId
    );

    const [gamePools] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_pools")],
        program.programId
    );

    const [gamePoolsTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("game_pools_token_account")],
        program.programId
    );

    console.log('🔑 PDAs:');
    console.log('• Minting Authority:', mintingAuthority.toString());
    console.log('• Game Pools:', gamePools.toString());
    console.log('• Game Pools Token Account:', gamePoolsTokenAccount.toString());

    // Create game token mint if needed
    let gameTokenMint;
    try {
        const mintInfo = await connection.getAccountInfo(gamePoolsTokenAccount);
        if (!mintInfo) {
            console.log('🪙 Creating game token mint...');
            gameTokenMint = await createMint(
                connection,
                walletKeypair,
                wallet.publicKey,
                null,
                6,
                undefined,
                undefined,
                TOKEN_PROGRAM_ID
            );
            console.log('✅ Game token mint created:', gameTokenMint.toString());
        } else {
            // Find mint from token account
            const tokenAccountInfo = await connection.getAccountInfo(gamePoolsTokenAccount);
            if (tokenAccountInfo) {
                const tokenAccount = await connection.getTokenAccountBalance(gamePoolsTokenAccount);
                gameTokenMint = new PublicKey(tokenAccount.value.mint);
                console.log('✅ Game token mint exists:', gameTokenMint.toString());
            }
        }
    } catch (error) {
        console.error('❌ Error with token mint:', error);
        return;
    }

    // Initialize minting authority
    try {
        console.log('🏭 Initializing minting authority...');
        await program.methods
            .initializeMintingAuthority(new anchor.BN(10), true, new anchor.BN(0))
            .accounts({
                authority: mintingAuthority,
                owner: wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('✅ Minting authority initialized');
    } catch (error) {
        if (error.message.includes('already in use')) {
            console.log('✅ Minting authority already initialized');
        } else {
            console.error('❌ Error initializing minting authority:', error);
            return;
        }
    }

    // Initialize game pools
    try {
        console.log('🏊 Initializing game pools...');
        const gamePoolsBump = gamePools.toBuffer()[31]; // Last byte is bump

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
                rent: SYSVAR_RENT_PUBKEY,
            })
            .rpc();

        console.log('✅ Game pools initialized');
    } catch (error) {
        if (error.message.includes('already in use')) {
            console.log('✅ Game pools already initialized');
        } else {
            console.error('❌ Error initializing game pools:', error);
            return;
        }
    }

    // Create owner's token account
    try {
        console.log('💰 Creating owner token account...');
        const ownerTokenAccount = await createAccount(
            connection,
            walletKeypair,
            gameTokenMint,
            wallet.publicKey,
            undefined,
            undefined,
            TOKEN_PROGRAM_ID
        );
        console.log('✅ Owner token account created:', ownerTokenAccount.toString());
    } catch (error) {
        if (error.message.includes('already in use')) {
            console.log('✅ Owner token account already exists');
        } else {
            console.error('❌ Error creating owner token account:', error);
        }
    }

    // Save configuration
    const config = {
        programId: programId.toString(),
        mintingAuthority: mintingAuthority.toString(),
        gamePools: gamePools.toString(),
        gamePoolsTokenAccount: gamePoolsTokenAccount.toString(),
        gameTokenMint: gameTokenMint.toString(),
        wallet: wallet.publicKey.toString(),
        cluster: 'devnet',
        initialized: new Date().toISOString()
    };

    fs.writeFileSync('./production_config.json', JSON.stringify(config, null, 2));
    console.log('💾 Configuration saved to production_config.json');

    // Verify initialization
    console.log('\n🔍 Verification:');
    try {
        const authorityAccount = await program.account.mintingAuthority.fetch(mintingAuthority);
        console.log('✅ Minting Authority:', {
            owner: authorityAccount.owner.toString(),
            totalMinted: authorityAccount.totalMinted.toString(),
            isInfinite: authorityAccount.isInfinite
        });

        const gamePoolsAccount = await program.account.gameTokenPools.fetch(gamePools);
        console.log('✅ Game Pools:', {
            authority: gamePoolsAccount.authority.toString(),
            activePool: gamePoolsAccount.activePool.toString(),
            gameTokenMint: gamePoolsAccount.gameTokenMint.toString()
        });
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }

    console.log('\n🎉 PDA Initialization Complete!');
    console.log('📋 Ready for auto-mint testing...');
}

// Run if called directly
if (require.main === module) {
    initializeProductionPDAs().catch(console.error);
}

module.exports = { initializeProductionPDAs };
