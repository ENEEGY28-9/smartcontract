console.log('🔑 AUTHORITY TRONG SOLANA - GIẢI THÍCH CHI TIẾT');
console.log('='.repeat(60));
console.log('');

console.log('🎮 VÍ DỤ CỤ THỂ TỪ GAME CỦA CHÚNG TA:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎯 Game Pool Address: 5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc');
console.log('🪙 Token Mint: 2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK');
console.log('');

console.log('📊 ACCOUNT AUTHORITIES HIỆN TẠI:');
console.log('');

console.log('1️⃣ TOKEN ACCOUNT AUTHORITY:');
console.log('   👤 Token Owner: 8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U');
console.log('   ✅ Có quyền: Transfer tokens, Close account');
console.log('   ❌ Không có quyền: Mint new tokens');
console.log('');

console.log('2️⃣ TOKEN MINT AUTHORITIES:');
console.log('   👑 Mint Authority: [Unknown - cần check]');
console.log('   🚫 Freeze Authority: [Unknown - cần check]');
console.log('   ✅ Mint Authority có quyền: Tạo thêm tokens');
console.log('');

console.log('3️⃣ SYSTEM ACCOUNT OWNER:');
console.log('   👤 Account Owner: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
console.log('   📝 Đây là SPL Token Program');
console.log('   ✅ Có quyền: Execute token instructions');
console.log('');

console.log('🔐 AUTHORITY VALIDATION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

console.log('✅ VALID SIGNERS:');
console.log('   • 8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U ✅');
console.log('   • TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA ✅');
console.log('');

console.log('❌ INVALID SIGNERS:');
console.log('   • A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB ❌');
console.log('   • Any other wallet ❌');
console.log('');

console.log('🎯 TRANSFER REQUIREMENTS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

console.log('Để transfer 1 token từ Game Pool → User Wallet:');
console.log('');
console.log('✅ CẦN:');
console.log('   • Transaction signer: 8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U');
console.log('   • Private key của: 8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U');
console.log('   • SOL trong ví: 8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U');
console.log('');

console.log('❌ KHÔNG ĐỦ:');
console.log('   • Chỉ có SOL trong: A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB');
console.log('   • Private key của: A1Tk1KLSkH4dbeS1mKv9CrUKVRuErHGBg6oH9XUD2sLB');
console.log('');

console.log('🔑 AUTHORITY HIERARCHY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('🏦 TOKEN MINT (Factory)');
console.log('   ↓ owns');
console.log('💰 TOKEN ACCOUNTS (Wallets holding tokens)');
console.log('   ↓ controlled by');
console.log('👤 TOKEN OWNERS (Users with private keys)');
console.log('');

console.log('💡 TẠI SAO CẦN ĐÚNG AUTHORITY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('• Blockchain security: Chỉ owner mới có thể move tokens');
console.log('• Prevent theft: Không ai khác có thể transfer tiền của bạn');
console.log('• Digital signature: Authority = Private key ownership');
console.log('• Decentralized control: Không central authority');
console.log('');

console.log('🎯 NEXT STEP:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('1. Fund đúng authority: 8WU639hdEB5HWu83nvC5q9cj3zRaxRLDGtRGaJpMk95U');
console.log('2. Get private key của authority đó');
console.log('3. Sign transaction với đúng authority');
console.log('4. Transfer thành công!');
console.log('');

console.log('🔍 VERIFY AUTHORITIES:');
console.log('node debug_game_pool.js');
console.log('');
console.log('💰 FUND REAL AUTHORITY:');
console.log('node fund_real_owner.js');




