import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'dist', '.git', '.cache'],
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-setup.ts'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test-setup.ts',
                '**/*.d.ts',
                '**/*.config.*',
                '**/coverage/**'
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            }
        },
        testTimeout: 10000,
        hookTimeout: 10000,
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false,
                useAtomics: true
            }
        }
    },
    optimizeDeps: {
        include: ['vitest', '@vitest/ui']
    }
});

