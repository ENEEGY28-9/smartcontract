// Debug script to find the exact source of registration error
const debugRegisterError = async () => {
    console.log('🔍 Debugging Registration Error Source...');

    try {
        // Test 1: Check what happens with PocketBase client registration
        console.log('\n📡 Test 1: PocketBase Client Registration (simulated)');

        // Since we can't directly use PocketBase client from Node.js,
        // let's simulate what happens when it fails
        console.log('\n📍 Simulating PocketBase client error...');

        // Simulate a typical PocketBase error
        const mockPocketBaseError = {
            status: 400,
            message: { email: { message: 'Invalid email address' } }, // This could be the object causing issues
            url: 'http://localhost:8090/api/collections/users/records',
            data: { email: { code: 'validation_invalid_email' } }
        };

        console.log('Mock PocketBase error:', mockPocketBaseError);
        console.log('Error message type:', typeof mockPocketBaseError.message);
        console.log('Error message value:', mockPocketBaseError.message);

        // Test the exact error handling logic from pocketbaseService.ts register method
        let errorMessage = mockPocketBaseError.message;
        console.log('Original errorMessage:', errorMessage);
        console.log('Original errorMessage type:', typeof errorMessage);

        if (typeof errorMessage !== 'string') {
            if (errorMessage === null || errorMessage === undefined) {
                errorMessage = 'Registration failed';
            } else {
                try {
                    const stringified = JSON.stringify(errorMessage);
                    errorMessage = stringified === undefined ? 'Registration failed' : stringified;
                    console.log('Stringified errorMessage:', errorMessage);
                } catch (stringifyError) {
                    console.error('❌ Failed to stringify error message:', stringifyError);
                    errorMessage = 'Registration failed';
                }
            }
        }

        console.log('Final errorMessage:', errorMessage);
        console.log('Final errorMessage type:', typeof errorMessage);

        // Create the enhanced error
        const enhancedError = new Error(`Registration failed: ${errorMessage}`);
        enhancedError.status = mockPocketBaseError.status;
        enhancedError.data = mockPocketBaseError.data;
        enhancedError.url = mockPocketBaseError.url;

        console.log('\n📋 Enhanced error:');
        console.log('Message:', enhancedError.message);
        console.log('Contains "[object Object]":', enhancedError.message.includes('[object Object]'));

        // Test 2: Test component error handling
        console.log('\n📡 Test 2: Component Error Handling');

        // Test the exact logic from PocketBaseAuth.svelte
        let displayError = 'Authentication failed - please try again';
        if (enhancedError.message) {
            if (typeof enhancedError.message === 'string') {
                displayError = enhancedError.message;
            } else {
                try {
                    displayError = JSON.stringify(enhancedError.message);
                    if (displayError === undefined) {
                        displayError = 'Authentication failed - please try again';
                    }
                } catch (stringifyError) {
                    console.error('❌ Failed to stringify error in component:', stringifyError);
                    displayError = 'Authentication failed - please try again';
                }
            }
        }

        console.log('Display error:', displayError);
        console.log('Display error contains "[object Object]":', displayError.includes('[object Object]'));

        // Test 3: Test with different error structures
        console.log('\n📡 Test 3: Different Error Structures');

        const testErrors = [
            { message: 'Simple string error' },
            { message: { nested: { message: 'Nested error' } } },
            { message: { code: 'validation_error', message: 'Validation failed' } },
            { message: null },
            { message: undefined },
            { error: 'String error in error field' },
            { error: { code: 'error_code', message: 'Error message' } }
        ];

        testErrors.forEach((error, index) => {
            console.log(`\nTest ${index + 1}:`, error);

            let errorMessage = 'Registration failed';
            if (error.message) {
                if (typeof error.message === 'string') {
                    errorMessage = error.message;
                } else if (typeof error.message === 'object') {
                    if (error.message.message && typeof error.message.message === 'string') {
                        errorMessage = error.message.message;
                    } else {
                        try {
                            errorMessage = JSON.stringify(error.message);
                        } catch (stringifyError) {
                            console.log('❌ Failed to stringify message object:', stringifyError);
                            errorMessage = `Registration failed (Status: 400)`;
                        }
                    }
                }
            } else if (error.error) {
                if (typeof error.error === 'string') {
                    errorMessage = error.error;
                } else {
                    try {
                        errorMessage = JSON.stringify(error.error);
                    } catch (stringifyError) {
                        console.log('❌ Failed to stringify error object:', stringifyError);
                        errorMessage = `Registration failed (Status: 400)`;
                    }
                }
            }

            console.log('Result:', errorMessage);
            console.log('Contains "[object Object]":', errorMessage.includes('[object Object]'));
        });

    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
    }
};

// Run the debug
debugRegisterError();
