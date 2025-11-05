// Script xem data wallet hiện tại trong PocketBase
console.log('🔍 XEM DATA WALLET HIỆN TẠI TRONG POCKETBASE\n');

async function viewCurrentWalletData() {
    try {
        // Lấy data từ API
        const response = await fetch('http://localhost:8090/api/collections/wallets/records?perPage=100');
        const data = await response.json();

        console.log(`📊 Tổng số wallets: ${data.totalItems}\n`);

        if (data.items.length === 0) {
            console.log('❌ Chưa có wallet nào trong database\n');
            console.log('💡 Cách tạo wallet:');
            console.log('   1. Mở: http://localhost:5173/wallet-test');
            console.log('   2. Đăng nhập: demo@example.com / demo123456');
            console.log('   3. Click: "Create New Wallet"');
            console.log('   4. Balance sẽ được lưu tự động');
            return;
        }

        console.log('📋 CHI TIẾT CÁC WALLETS:\n');
        console.log('='.repeat(80));

        // Thống kê
        let totalBalance = 0;
        let connectedWallets = 0;
        let networkStats = {};

        data.items.forEach((wallet, index) => {
            console.log(`\n🏦 WALLET ${index + 1}:`);
            console.log(`   🆔 ID: ${wallet.id}`);
            console.log(`   👤 User ID: ${wallet.user_id || 'N/A'}`);
            console.log(`   📍 Address: ${wallet.address}`);
            console.log(`   🌐 Network: ${wallet.network}`);
            console.log(`   🔧 Type: ${wallet.wallet_type}`);
            console.log(`   💰 Balance: ${wallet.balance !== undefined ? wallet.balance + ' ' + wallet.network.toUpperCase() : 'N/A'}`);
            console.log(`   ⏰ Last Updated: ${wallet.balance_last_updated || 'Never'}`);
            console.log(`   🔌 Connected: ${wallet.is_connected ? '✅ Yes' : '❌ No'}`);
            console.log(`   📅 Created: ${new Date(wallet.created).toLocaleString()}`);

            // Thống kê
            if (wallet.balance !== undefined && wallet.balance !== null) {
                totalBalance += parseFloat(wallet.balance);
            }
            if (wallet.is_connected) {
                connectedWallets++;
            }

            // Network stats
            if (!networkStats[wallet.network]) {
                networkStats[wallet.network] = { count: 0, balance: 0, connected: 0 };
            }
            networkStats[wallet.network].count++;
            networkStats[wallet.network].balance += parseFloat(wallet.balance) || 0;
            if (wallet.is_connected) {
                networkStats[wallet.network].connected++;
            }

            console.log('-'.repeat(50));
        });

        // Hiển thị thống kê
        console.log('\n📈 THỐNG KÊ TỔNG QUAN:');
        console.log(`   💰 Tổng balance: ${totalBalance}`);
        console.log(`   🔌 Connected wallets: ${connectedWallets}/${data.items.length}`);
        console.log(`   💼 Wallets có balance: ${(data.items.filter(w => w.balance && w.balance > 0)).length}/${data.items.length}`);

        console.log('\n🌐 THEO NETWORK:');
        Object.keys(networkStats).forEach(network => {
            const stats = networkStats[network];
            console.log(`   ${network.toUpperCase()}: ${stats.count} wallets, ${stats.connected} connected, Balance: ${stats.balance}`);
        });

        console.log('\n🔍 CÁCH KIỂM TRA TRỰC TIẾP:');
        console.log('   1. Mở: http://localhost:8090/_/');
        console.log('   2. Click: Collections → wallets');
        console.log('   3. Xem cột "balance" - đây là nơi lưu số dư ví');
        console.log('   4. Filter theo "user_id" để xem wallets của user cụ thể');
        console.log('   5. Sắp xếp theo "balance_last_updated" để xem cập nhật gần nhất');

        console.log('\n✅ Hoàn tất kiểm tra!');

        if (totalBalance === 0) {
            console.log('\n💡 Balance = 0? Hãy tạo wallet để có data:');
            console.log('   → Mở http://localhost:5173/wallet-test');
            console.log('   → Đăng nhập và tạo wallet');
            console.log('   → Balance sẽ được fetch từ blockchain');
        }

    } catch (error) {
        console.error('❌ Lỗi khi lấy data:', error.message);
        console.log('\n💡 Khắc phục:');
        console.log('   1. Đảm bảo PocketBase đang chạy: npm run pocketbase');
        console.log('   2. Mở http://localhost:8090/_/ để xem admin panel');
        console.log('   3. Kiểm tra collections "wallets" có tồn tại không');
    }
}

// Chạy script
viewCurrentWalletData();








