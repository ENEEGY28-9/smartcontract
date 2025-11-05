#!/usr/bin/env node

// Simple test to verify rate limiting configuration
console.log('🚀 Testing Rate Limiting Configuration');
console.log('=====================================');

// Check environment variables
const expectedLimits = {
  'RATE_LIMIT_DEFAULT_IP_BURST': '5000',
  'RATE_LIMIT_DEFAULT_IP_SUSTAINED': '10000',
  'RATE_LIMIT_DEFAULT_USER_BURST': '2000',
  'RATE_LIMIT_DEFAULT_USER_SUSTAINED': '5000'
};

let allCorrect = true;

for (const [key, expectedValue] of Object.entries(expectedLimits)) {
  const actualValue = process.env[key];
  const isCorrect = actualValue === expectedValue;

  console.log(`${key}:`);
  console.log(`  Expected: ${expectedValue}`);
  console.log(`  Actual:   ${actualValue}`);
  console.log(`  Status:   ${isCorrect ? '✅' : '❌'}`);

  if (!isCorrect) {
    allCorrect = false;
  }
  console.log('');
}

if (allCorrect) {
  console.log('🎉 All rate limits are correctly configured!');
  console.log('Rate limiting has been successfully updated from:');
  console.log('  Old: 10/60 (burst/sustained) IP, 5/30 (burst/sustained) User');
  console.log('  New: 5000/10000 (burst/sustained) IP, 2000/5000 (burst/sustained) User');
} else {
  console.log('❌ Some rate limits are not correctly configured');
  process.exit(1);
}
