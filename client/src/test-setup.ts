import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
    value: {
        clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined),
            readText: vi.fn().mockResolvedValue(''),
        },
        credentials: {
            create: vi.fn(),
            get: vi.fn(),
        },
        onLine: true,
    },
    writable: true,
});

// Mock crypto.getRandomValues for testing
Object.defineProperty(global, 'crypto', {
    value: {
        getRandomValues: (arr: any) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
        },
        subtle: {
            digest: vi.fn(),
            importKey: vi.fn(),
            encrypt: vi.fn(),
            decrypt: vi.fn(),
        },
    },
});

// Mock performance API
Object.defineProperty(window, 'performance', {
    value: {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn(),
        memory: {
            usedJSHeapSize: 1024 * 1024 * 50, // 50MB
            totalJSHeapSize: 1024 * 1024 * 100, // 100MB
            jsHeapSizeLimit: 1024 * 1024 * 500, // 500MB
        },
    },
    writable: true,
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Test setup
beforeAll(async () => {
    // Setup test environment
    console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
    // Cleanup test environment
    console.log('🧹 Cleaning up test environment...');
});

beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
});

afterEach(() => {
    // Cleanup after each test
    cleanup();
});

// Global test utilities
global.testUtils = {
    // Generate test wallet data
    generateTestWallet: () => ({
        id: `test_wallet_${Date.now()}`,
        userId: 'test_user_123',
        wallets: {
            solana: {
                chain: 'solana',
                publicKey: 'TestSolanaPublicKey123',
                encryptedPrivateKey: 'encrypted_test_key',
                derivationPath: "m/44'/501'/0'/0/0",
                balance: '0',
                symbol: 'SOL'
            },
            ethereum: {
                chain: 'ethereum',
                publicKey: '0x1234567890123456789012345678901234567890',
                encryptedPrivateKey: 'encrypted_test_key',
                derivationPath: "m/44'/60'/0'/0/0",
                balance: '0',
                symbol: 'ETH'
            }
        },
        masterSeed: 'encrypted_master_seed',
        createdAt: new Date().toISOString(),
        securityLevel: 'MILITARY'
    }),

    // Generate test seed phrase
    generateTestSeedPhrase: () => 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',

    // Mock API response
    mockApiResponse: (overrides = {}) => ({
        wallet_id: 'test_wallet_123',
        public_key: 'TestPubKey123',
        encrypted_private_key: 'encrypted_key',
        seed_phrase: 'test seed phrase words here',
        wallet_type: 'multi-chain',
        created_at: new Date().toISOString(),
        security_level: 'MILITARY',
        ...overrides
    }),

    // Wait for async operations
    waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

    // Mock network delay
    mockNetworkDelay: (ms: number = 100) => {
        (global.fetch as any).mockImplementationOnce(() =>
            new Promise(resolve =>
                setTimeout(() => resolve({
                    ok: true,
                    json: async () => global.testUtils.mockApiResponse()
                }), ms)
            )
        );
    },

    // Mock network error
    mockNetworkError: (error: string = 'Network error') => {
        (global.fetch as any).mockRejectedValueOnce(new Error(error));
    }
};

