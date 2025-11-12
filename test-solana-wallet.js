#!/usr/bin/env node

/**
 * Test script for Solana wallet generation and claim functionality
 * This script tests the new real Solana wallet generation feature
 */

const axios = require('axios');

// Configuration
const GATEWAY_URL = 'http://localhost:8080';
const TEST_USER_TOKEN = 'your_test_jwt_token_here'; // Replace with actual token

async function testSolanaWalletGeneration() {
    console.log('🧪 Testing Solana Wallet Generation & Claim System\n');

    try {
        // Test 1: Generate new Solana wallet
        console.log('1️⃣ Testing wallet generation...');
        const walletResponse = await axios.post(`${GATEWAY_URL}/api/wallet/generate-solana`, {}, {
            headers: {
                'Authorization': `Bearer ${TEST_USER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (walletResponse.data.success) {
            console.log('✅ Wallet generation successful!');
            console.log('📍 Address:', walletResponse.data.address);
            console.log('🔑 Private Key:', walletResponse.data.private_key ? '[HIDDEN]' : 'Not provided');
            console.log('🔓 Public Key:', walletResponse.data.public_key);
            console.log();
        } else {
            console.log('❌ Wallet generation failed:', walletResponse.data.error);
            return;
        }

        // Test 2: Claim energies with generated wallet
        console.log('2️⃣ Testing energy claim...');
        const claimResponse = await axios.post(`${GATEWAY_URL}/api/energies/claim-to-wallet`, {
            amount: 10,
            user_wallet: walletResponse.data.address
        }, {
            headers: {
                'Authorization': `Bearer ${TEST_USER_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (claimResponse.data.success) {
            console.log('✅ Energy claim successful!');
            console.log('📊 Claimed amount:', claimResponse.data.claimed_amount);
            console.log('💰 Remaining energies:', claimResponse.data.remaining_energies);
            console.log('🔗 Transaction:', claimResponse.data.tx_signature);
        } else {
            console.log('❌ Energy claim failed:', claimResponse.data.error);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            console.log('\n💡 Tip: You need a valid JWT token. Get one by logging in first.');
        } else if (error.response?.status === 500) {
            console.log('\n💡 Tip: Backend might not be running or Solana client not configured.');
        }
    }
}

// Run the test
testSolanaWalletGeneration().then(() => {
    console.log('\n🏁 Test completed!');
}).catch(error => {
    console.error('💥 Test crashed:', error);
});






