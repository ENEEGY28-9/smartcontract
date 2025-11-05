import { Buffer } from 'buffer';
import type { HandleClientError } from '@sveltejs/kit';

// Polyfill Buffer for browser environment
// This must run before any other imports that might need Buffer
if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    (globalThis as any).Buffer = Buffer;
    console.log('✅ Buffer polyfill loaded');
}

// Client-side error handler
export const handleError: HandleClientError = ({ error, event }) => {
    console.error('Client error:', error);
    // Return a user-friendly error page
    return {
        message: 'Something went wrong on our end. Please try refreshing the page.',
        code: 'CLIENT_ERROR'
    };
};

