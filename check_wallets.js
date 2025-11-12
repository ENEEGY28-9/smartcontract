/**
 * Script để kiểm tra wallets trong PocketBase
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function checkWallets() {
    try {
        console.log('🔍 Checking wallets in PocketBase...');
        console.log('=====================================');
        console.log();

        // Authenticate as admin (you'll need to provide credentials)
        console.log('1️⃣ Attempting admin authentication...');

        try {
            await pb.admins.authWithPassword('admin@example.com', 'admin123456');
            console.log('✅ Admin authenticated successfully');
        } catch (error) {
            console.log('❌ Admin auth failed, trying user auth...');

            // Try user authentication
            try {
                await pb.collection('users').authWithPassword('test@example.com', 'testpassword123');
                console.log('✅ User authenticated successfully');
            } catch (userError) {
                console.log('❌ Both admin and user auth failed');
                console.log('💡 Please check PocketBase is running and credentials are correct');
                return;
            }
        }

        console.log();
        console.log('2️⃣ Fetching wallets...');

        // Get all wallets
        const wallets = await pb.collection('wallets').getFullList({
            sort: '-created',
            fields: 'id,address,network,wallet_type,balance,created,updated'
        });

        console.log(`📊 Found ${wallets.length} wallets:`);
        console.log();

        // Group by network
        const networks = {};

        wallets.forEach(wallet => {
            if (!networks[wallet.network]) {
                networks[wallet.network] = [];
            }
            networks[wallet.network].push(wallet);
        });

        // Display wallets by network
        Object.keys(networks).forEach(network => {
            console.log(`🌐 ${network.toUpperCase()} WALLETS:`);
            networks[network].forEach(wallet => {
                const created = new Date(wallet.created).toLocaleString();
                console.log(`   📍 ${wallet.address}`);
                console.log(`      Type: ${wallet.wallet_type}`);
                console.log(`      Balance: ${wallet.balance || 0}`);
                console.log(`      Created: ${created}`);
                console.log();
            });
        });

        // Check for Solana wallets specifically
        console.log('3️⃣ Checking Solana wallets...');
        const solanaWallets = wallets.filter(w => w.network === 'solana');

        if (solanaWallets.length > 0) {
            console.log(`✅ Found ${solanaWallets.length} Solana wallets:`);
            solanaWallets.forEach(wallet => {
                const isOldFormat = wallet.address.startsWith('So') && wallet.address.length < 44;
                const isNewFormat = wallet.address.length >= 32 && wallet.address.length <= 44;
                const status = isOldFormat ? '❌ OLD FORMAT' : isNewFormat ? '✅ NEW FORMAT' : '⚠️ UNKNOWN';

                console.log(`   ${wallet.address} - ${status}`);
            });
        } else {
            console.log('❌ No Solana wallets found');
        }

        console.log();
        console.log('💡 Tips:');
        console.log('   • Old format: Starts with "So" + short string');
        console.log('   • New format: 32-44 chars base58-like');
        console.log('   • Valid for transfer: New format wallets');

    } catch (error) {
        console.error('❌ Error checking wallets:', error.message);
        console.log();
        console.log('🔧 Troubleshooting:');
        console.log('   1. Make sure PocketBase is running: http://localhost:8090');
        console.log('   2. Check admin credentials in script');
        console.log('   3. Try accessing PocketBase admin panel manually');
    }
}

// Export for use as module
module.exports = { checkWallets };

// Run if called directly
if (require.main === module) {
    checkWallets().catch(console.error);
}
