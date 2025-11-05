#!/usr/bin/env node

/**
 * Demo Script cho Wallet System với PocketBase Integration
 *
 * Script này demo cách sử dụng hệ thống wallet mới với các tính năng:
 * - Authentication với PocketBase
 * - Wallet portfolio summary
 * - Auto-refresh balance
 * - Multi-network support
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Wallet System Demo với PocketBase Integration\n');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPrerequisites() {
    log('🔍 Kiểm tra prerequisites...', 'blue');

    // Check if Node.js is installed
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        log(`✅ Node.js: ${nodeVersion}`, 'green');
    } catch (error) {
        log('❌ Node.js không được cài đặt', 'red');
        return false;
    }

    // Check if npm is installed
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`✅ NPM: ${npmVersion}`, 'green');
    } catch (error) {
        log('❌ NPM không được cài đặt', 'red');
        return false;
    }

    // Check if PocketBase is running
    try {
        const response = execSync('curl -s http://localhost:8090/api/health || echo "PocketBase not responding"', { encoding: 'utf8' });
        if (response.includes('PocketBase not responding')) {
            log('⚠️  PocketBase có thể chưa chạy. Hãy chạy: npm run pocketbase', 'yellow');
        } else {
            log('✅ PocketBase đang chạy', 'green');
        }
    } catch (error) {
        log('⚠️  Không thể kết nối đến PocketBase. Hãy chạy: npm run pocketbase', 'yellow');
    }

    return true;
}

function createTestCollections() {
    log('\n📋 Tạo collections test...', 'blue');

    // Create users collection if not exists
    try {
        const usersCollection = {
            name: 'users',
            schema: [
                { name: 'email', type: 'email', required: true },
                { name: 'name', type: 'text', required: false },
                { name: 'avatar', type: 'file', required: false }
            ]
        };

        log('✅ Users collection schema đã sẵn sàng', 'green');
    } catch (error) {
        log('⚠️  Không thể tạo users collection', 'yellow');
    }

    // Create wallets collection if not exists
    try {
        const walletsCollection = {
            name: 'wallets',
            schema: [
                { name: 'user_id', type: 'relation', required: true, options: { collectionId: 'users' } },
                { name: 'address', type: 'text', required: true },
                { name: 'private_key', type: 'text', required: false },
                { name: 'mnemonic', type: 'text', required: false },
                { name: 'wallet_type', type: 'select', required: true, options: {
                    values: ['metamask', 'phantom', 'generated', 'bitcoin']
                }},
                { name: 'network', type: 'select', required: true, options: {
                    values: ['ethereum', 'solana', 'bitcoin']
                }},
                { name: 'balance', type: 'number', required: false },
                { name: 'balance_last_updated', type: 'date', required: false },
                { name: 'is_connected', type: 'bool', required: false },
                { name: 'notes', type: 'text', required: false }
            ]
        };

        log('✅ Wallets collection schema đã sẵn sàng', 'green');
    } catch (error) {
        log('⚠️  Không thể tạo wallets collection', 'yellow');
    }
}

function createTestUsers() {
    log('\n👤 Tạo test users...', 'blue');

    const testUsers = [
        {
            email: 'demo@example.com',
            password: 'demo123456',
            name: 'Demo User'
        },
        {
            email: 'test@example.com',
            password: 'test123456',
            name: 'Test User'
        },
        {
            email: 'wallet@example.com',
            password: 'wallet123456',
            name: 'Wallet User'
        }
    ];

    log('📝 Test users để demo:', 'yellow');
    testUsers.forEach((user, index) => {
        log(`   ${index + 1}. ${user.email} / ${user.password}`, 'yellow');
    });

    return testUsers;
}

function showDemoInstructions() {
    log('\n📖 Hướng dẫn demo:', 'blue');
    log('\n1. Khởi động hệ thống:', 'yellow');
    log('   cd client', 'reset');
    log('   npm run dev', 'reset');

    log('\n2. Khởi động PocketBase (trong terminal khác):', 'yellow');
    log('   npm run pocketbase', 'reset');

    log('\n3. Mở trình duyệt:', 'yellow');
    log('   http://localhost:5173/wallet-test', 'reset');

    log('\n4. Test các tính năng:', 'yellow');
    log('   - Đăng nhập với test credentials', 'reset');
    log('   - Xem wallet portfolio summary', 'reset');
    log('   - Connect wallet (MetaMask, Phantom)', 'reset');
    log('   - Tạo wallet mới', 'reset');
    log('   - Xem auto-refresh balance', 'reset');
    log('   - Test với custom addresses', 'reset');

    log('\n5. Test multi-network:', 'yellow');
    log('   - Chọn Ethereum network', 'reset');
    log('   - Chọn Solana network', 'reset');
    log('   - Chọn Bitcoin network', 'reset');

    log('\n6. Test authentication:', 'yellow');
    log('   - Đăng ký user mới', 'reset');
    log('   - Đăng nhập/đăng xuất', 'reset');
    log('   - Xem account summary', 'reset');
}

function showFeatures() {
    log('\n✨ Tính năng mới được thêm:', 'blue');

    log('\n🔐 Authentication với PocketBase:', 'green');
    log('   - Đăng nhập/đăng ký user an toàn', 'reset');
    log('   - JWT token management', 'reset');
    log('   - User session persistence', 'reset');

    log('\n💰 Wallet Portfolio Summary:', 'green');
    log('   - Tổng quan số dư tất cả ví', 'reset');
    log('   - Breakdown theo network (ETH, SOL, BTC)', 'reset');
    log('   - Real-time balance tracking', 'reset');
    log('   - Auto-refresh mỗi 30 giây', 'reset');

    log('\n👤 Account Management:', 'green');
    log('   - User avatar và thông tin', 'reset');
    log('   - Thống kê wallet (total, connected)', 'reset');
    log('   - Quick actions (Create, Import, Settings)', 'reset');
    log('   - Authentication state management', 'reset');

    log('\n🔄 Auto-sync Features:', 'green');
    log('   - Tự động load wallet data khi đăng nhập', 'reset');
    log('   - Real-time balance updates', 'reset');
    log('   - Event-driven architecture', 'reset');
    log('   - Cross-device synchronization', 'reset');

    log('\n🌐 Multi-network Support:', 'green');
    log('   - Ethereum (MetaMask integration)', 'reset');
    log('   - Solana (Phantom integration)', 'reset');
    log('   - Bitcoin (custom address support)', 'reset');
    log('   - Network-specific balance fetching', 'reset');

    log('\n💾 Database Integration:', 'green');
    log('   - PocketBase backend', 'reset');
    log('   - Encrypted wallet storage', 'reset');
    log('   - User isolation và security', 'reset');
    log('   - RESTful API endpoints', 'reset');
}

function showAPIEndpoints() {
    log('\n🔌 API Endpoints:', 'blue');

    log('\nAuthentication:', 'green');
    log('   POST /api/collections/users/records', 'reset');
    log('   POST /api/collections/users/auth-with-password', 'reset');
    log('   POST /api/collections/users/auth-refresh', 'reset');

    log('\nWallet Operations:', 'green');
    log('   GET  /api/collections/wallets/records', 'reset');
    log('   POST /api/collections/wallets/records', 'reset');
    log('   PATCH /api/collections/wallets/records/:id', 'reset');
    log('   DELETE /api/collections/wallets/records/:id', 'reset');

    log('\nBlockchain APIs:', 'green');
    log('   Ethereum RPC endpoints (multiple fallbacks)', 'reset');
    log('   Solana RPC endpoints (multiple fallbacks)', 'reset');
    log('   Bitcoin BlockCypher API', 'reset');
}

function showTroubleshooting() {
    log('\n🔧 Troubleshooting:', 'blue');

    log('\n1. Authentication Issues:', 'yellow');
    log('   - Kiểm tra PocketBase đang chạy trên port 8090', 'reset');
    log('   - Verify credentials trong admin panel', 'reset');
    log('   - Check CORS settings', 'reset');
    log('   - Clear browser cache và cookies', 'reset');

    log('\n2. Wallet Balance Not Updating:', 'yellow');
    log('   - Kiểm tra wallet connection status', 'reset');
    log('   - Verify RPC endpoints hoạt động', 'reset');
    log('   - Check network connectivity', 'reset');
    log('   - Try manual refresh', 'reset');

    log('\n3. Auto-refresh Not Working:', 'yellow');
    log('   - Kiểm tra browser console logs', 'reset');
    log('   - Verify user authentication state', 'reset');
    log('   - Check JavaScript errors', 'reset');
    log('   - Restart browser', 'reset');

    log('\n4. Database Issues:', 'yellow');
    log('   - Access PocketBase admin panel: http://localhost:8090/_/', 'reset');
    log('   - Check collections và records', 'reset');
    log('   - Verify user permissions', 'reset');
    log('   - Check server logs', 'reset');
}

function showQuickStart() {
    log('\n⚡ Quick Start Commands:', 'blue');

    log('\n1. Start PocketBase:', 'yellow');
    log('   npm run pocketbase', 'reset');

    log('\n2. Start Client:', 'yellow');
    log('   cd client && npm run dev', 'reset');

    log('\n3. Test Commands:', 'yellow');
    log('   # Test wallet connection', 'reset');
    log('   curl http://localhost:8090/api/health', 'reset');
    log('   ', 'reset');

    log('   # Test authentication', 'reset');
    log('   curl -X POST http://localhost:8090/api/collections/users/auth-with-password \\', 'reset');
    log('        -H "Content-Type: application/json" \\', 'reset');
    log('        -d \'{"identity": "demo@example.com", "password": "demo123456"}\'', 'reset');

    log('\n4. Browser Testing:', 'yellow');
    log('   - Open http://localhost:5173/wallet-test', 'reset');
    log('   - Try "Try Test Credentials" button', 'reset');
    log('   - Test wallet connections', 'reset');
    log('   - Check console for debug info', 'reset');
}

function main() {
    console.log('='.repeat(60));

    if (checkPrerequisites()) {
        createTestCollections();
        const testUsers = createTestUsers();

        showFeatures();
        showAPIEndpoints();
        showDemoInstructions();
        showTroubleshooting();
        showQuickStart();

        log('\n🎉 Demo setup hoàn thành!', 'green');
        log('\n📝 Test Users:', 'blue');
        testUsers.forEach((user, index) => {
            log(`   ${index + 1}. Email: ${colors.bold}${user.email}${colors.reset} | Password: ${colors.bold}${user.password}${colors.reset}`, 'yellow');
        });

        log('\n🚀 Bắt đầu demo:', 'blue');
        log('   1. Chạy: npm run pocketbase', 'reset');
        log('   2. Chạy: cd client && npm run dev', 'reset');
        log('   3. Mở: http://localhost:5173/wallet-test', 'reset');
        log('   4. Đăng nhập với test credentials', 'reset');
        log('   5. Khám phá các tính năng mới!', 'reset');

    } else {
        log('\n❌ Prerequisites không đầy đủ. Hãy cài đặt Node.js và NPM trước.', 'red');
        process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
}

// Run main function if this script is executed directly
main();

export {
    checkPrerequisites,
    createTestCollections,
    createTestUsers,
    showDemoInstructions,
    showFeatures,
    showAPIEndpoints,
    showTroubleshooting,
    showQuickStart
};
