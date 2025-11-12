/**
 * Audit wallet security - check current database for violations
 */

const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = 'http://localhost:8090';
const pb = new PocketBase(POCKETBASE_URL);

async function auditWalletSecurity() {
    console.log('🔍 AUDITING WALLET SECURITY');
    console.log('===========================');
    console.log();

    try {
        // Authenticate
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log('✅ Admin authenticated');
        console.log();

        // Get all wallets
        const allWallets = await pb.collection('wallets').getFullList({
            sort: 'created'
        });

        console.log(`📊 Total wallets in database: ${allWallets.length}`);
        console.log();

        // Analyze by network
        const networks = {};
        const users = {};

        allWallets.forEach(wallet => {
            // Group by network
            if (!networks[wallet.network]) {
                networks[wallet.network] = [];
            }
            networks[wallet.network].push(wallet);

            // Group by user
            if (!users[wallet.user_id]) {
                users[wallet.user_id] = {};
            }
            if (!users[wallet.user_id][wallet.network]) {
                users[wallet.user_id][wallet.network] = [];
            }
            users[wallet.user_id][wallet.network].push(wallet);
        });

        // Check for violations
        let violations = [];
        let warnings = [];

        console.log('🔎 SECURITY ANALYSIS:');
        console.log();

        // Check 1: Multiple wallets per user per network
        console.log('1️⃣ CHECKING: One wallet per user per network');
        Object.keys(users).forEach(userId => {
            Object.keys(users[userId]).forEach(network => {
                const userNetworkWallets = users[userId][network];
                if (userNetworkWallets.length > 1) {
                    violations.push({
                        type: 'MULTIPLE_WALLETS_PER_NETWORK',
                        userId: userId,
                        network: network,
                        count: userNetworkWallets.length,
                        wallets: userNetworkWallets.map(w => w.address)
                    });
                    console.log(`   ❌ VIOLATION: User ${userId.slice(0,8)} has ${userNetworkWallets.length} ${network} wallets`);
                }
            });
        });

        if (violations.filter(v => v.type === 'MULTIPLE_WALLETS_PER_NETWORK').length === 0) {
            console.log('   ✅ PASSED: No user has multiple wallets per network');
        }
        console.log();

        // Check 2: Duplicate addresses across users
        console.log('2️⃣ CHECKING: No duplicate addresses across users');
        const addressMap = {};
        allWallets.forEach(wallet => {
            const key = `${wallet.address}_${wallet.network}`;
            if (!addressMap[key]) {
                addressMap[key] = [];
            }
            addressMap[key].push(wallet);
        });

        Object.keys(addressMap).forEach(key => {
            const wallets = addressMap[key];
            if (wallets.length > 1) {
                const uniqueUsers = [...new Set(wallets.map(w => w.user_id))];
                if (uniqueUsers.length > 1) {
                    violations.push({
                        type: 'DUPLICATE_ADDRESS_CROSS_USERS',
                        address: wallets[0].address,
                        network: wallets[0].network,
                        users: uniqueUsers,
                        count: wallets.length
                    });
                    console.log(`   ❌ VIOLATION: Address ${wallets[0].address} owned by ${uniqueUsers.length} different users`);
                } else {
                    warnings.push({
                        type: 'DUPLICATE_ADDRESS_SAME_USER',
                        address: wallets[0].address,
                        network: wallets[0].network,
                        userId: uniqueUsers[0],
                        count: wallets.length
                    });
                    console.log(`   ⚠️  WARNING: Address ${wallets[0].address} appears ${wallets.length} times for same user`);
                }
            }
        });

        if (violations.filter(v => v.type === 'DUPLICATE_ADDRESS_CROSS_USERS').length === 0) {
            console.log('   ✅ PASSED: No duplicate addresses across different users');
        }
        console.log();

        // Check 3: Old format addresses
        console.log('3️⃣ CHECKING: Old format addresses');
        const oldFormatWallets = allWallets.filter(wallet =>
            wallet.network === 'solana' &&
            wallet.address.startsWith('So') &&
            wallet.address.length < 44
        );

        if (oldFormatWallets.length > 0) {
            warnings.push({
                type: 'OLD_FORMAT_ADDRESSES',
                count: oldFormatWallets.length,
                wallets: oldFormatWallets.map(w => ({ address: w.address, user: w.user_id }))
            });
            console.log(`   ⚠️  WARNING: ${oldFormatWallets.length} old format Solana addresses found`);
            console.log('   📝 These should be updated to new base58 format');
        } else {
            console.log('   ✅ PASSED: No old format addresses found');
        }
        console.log();

        // Summary
        console.log('📋 AUDIT SUMMARY:');
        console.log(`   🚨 Critical Violations: ${violations.length}`);
        console.log(`   ⚠️  Warnings: ${warnings.length}`);
        console.log(`   ✅ Passed Checks: ${3 - (violations.length > 0 ? 1 : 0) - (warnings.length > 0 ? 1 : 0)}`);
        console.log();

        // Network breakdown
        console.log('🌐 NETWORK BREAKDOWN:');
        Object.keys(networks).forEach(network => {
            const networkWallets = networks[network];
            const uniqueUsers = [...new Set(networkWallets.map(w => w.user_id))];
            console.log(`   ${network}: ${networkWallets.length} wallets, ${uniqueUsers.length} users`);
        });
        console.log();

        // Recommendations
        if (violations.length > 0 || warnings.length > 0) {
            console.log('💡 RECOMMENDATIONS:');
            if (violations.length > 0) {
                console.log('   🚨 FIX CRITICAL VIOLATIONS FIRST:');
                violations.forEach(v => {
                    if (v.type === 'MULTIPLE_WALLETS_PER_NETWORK') {
                        console.log(`      • Remove extra wallets for user ${v.userId} on ${v.network}`);
                    } else if (v.type === 'DUPLICATE_ADDRESS_CROSS_USERS') {
                        console.log(`      • Resolve ownership conflict for address ${v.address}`);
                    }
                });
            }
            if (warnings.length > 0) {
                console.log('   ⚠️  ADDRESS WARNINGS:');
                warnings.forEach(w => {
                    if (w.type === 'OLD_FORMAT_ADDRESSES') {
                        console.log(`      • Update ${w.count} old format addresses`);
                    }
                });
            }
            console.log();
        }

        return {
            totalWallets: allWallets.length,
            violations: violations,
            warnings: warnings,
            networks: Object.keys(networks).length,
            uniqueUsers: Object.keys(users).length
        };

    } catch (error) {
        console.error('❌ Audit failed:', error.message);
        return null;
    }
}

// Export for use as module
module.exports = { auditWalletSecurity };

// Run if called directly
if (require.main === module) {
    auditWalletSecurity().catch(console.error);
}







