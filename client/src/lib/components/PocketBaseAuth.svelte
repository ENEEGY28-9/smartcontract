<script>
    import { pocketbaseService } from '$lib/services/pocketbaseService';

    let email = '';
    let password = '';
    let confirmPassword = '';
    let isLoginMode = true;
    let isLoading = false;
    let error = '';
    let success = '';
    let useProxy = true;

    function validateEmail(email) {
        // More permissive email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email) && email.includes('@') && email.includes('.');
        console.log(`Email validation for "${email}": ${isValid}`);
        return isValid;
    }

    function validatePassword(password) {
        // At least 6 characters
        const isValid = password.length >= 6;
        console.log(`Password validation: "${password.length} chars" - ${isValid ? 'PASS' : 'FAIL'}`);
        return isValid;
    }

    async function handleAuth() {
        // Clear previous messages
        error = '';
        success = '';

        if (!email.trim() || !password.trim()) {
            error = 'Please fill in all fields';
            return;
        }

        console.log('🔍 Validation check:', {
            email: email.trim(),
            password: password.length + ' chars',
            isValidEmail: validateEmail(email.trim()),
            isValidPassword: validatePassword(password)
        });

        if (!validateEmail(email.trim())) {
            error = 'Please enter a valid email address (e.g., user@domain.com)';
            console.log('❌ Email validation failed for:', email.trim());
            return;
        }

        if (!validatePassword(password)) {
            error = 'Password must be at least 6 characters long';
            console.log('❌ Password validation failed:', password.length + ' chars');
            return;
        }

        if (!isLoginMode) {
            if (password !== confirmPassword) {
                error = 'Passwords do not match';
                return;
            }
        }

        isLoading = true;
        error = '';
        success = '';

        try {
            console.log('🔐 Starting authentication...', {
                isLoginMode,
                email: email.trim(),
                passwordLength: password.length,
                confirmPasswordLength: confirmPassword.length
            });

            if (isLoginMode) {
                console.log('🔑 Attempting login...');
                await pocketbaseService.authenticate(email.trim(), password);
                success = 'Login successful!';
                console.log('✅ Login successful');

                // Clear any previous errors
                error = '';

                // Dispatch event to notify parent component and trigger reactive updates
                window.dispatchEvent(new CustomEvent('pocketbase-auth-success'));

            } else {
                console.log('📝 Attempting registration...');
                console.log('Registration data:', {
                    email: email.trim(),
                    name: email.split('@')[0],
                    passwordLength: password.length
                });

                try {
                    await pocketbaseService.register(email.trim(), password, {
                        name: email.split('@')[0] // Use email prefix as name
                    });
                    success = 'Registration successful! You can now log in.';
                    console.log('✅ Registration successful');

                    // Clear any previous errors
                    error = '';

                    // Switch to login mode
                    isLoginMode = true;
                } catch (regError) {
                    console.error('❌ Registration failed:', regError);
                    console.error('Error details:', {
                        status: regError.status,
                        message: regError.message,
                        data: regError.data,
                        url: regError.url
                    });

                    // Try direct fetch method as fallback
                    console.log('🔄 Attempting fallback registration...');
                    try {
                        await pocketbaseService.registerDirect(email.trim(), password, {
                            name: email.split('@')[0]
                        });
                        success = 'Registration successful! You can now log in.';
                        error = ''; // Clear any previous errors
                        isLoginMode = true;
                        console.log('✅ Fallback registration successful');

                        // Dispatch event for fallback registration success
                        window.dispatchEvent(new CustomEvent('pocketbase-auth-success'));
                    } catch (fallbackError) {
                        console.error('❌ Fallback registration also failed:', fallbackError);
                        console.error('❌ Fallback error details:', {
                            status: fallbackError.status,
                            message: fallbackError.message,
                            data: fallbackError.data
                        });

                        // If user already exists, try to login instead
                        if (fallbackError.status === 400 && (
                            fallbackError.message?.includes('already in use') ||
                            fallbackError.message?.includes('already exists') ||
                            fallbackError.data?.email?.message?.includes('already in use')
                        )) {
                            console.log('User already exists, attempting login...');
                            try {
                                await pocketbaseService.authenticate(email.trim(), password);
                                success = 'Login successful! (User already existed)';
                                error = ''; // Clear any previous errors
                                isLoginMode = true;
                                window.dispatchEvent(new CustomEvent('pocketbase-auth-success'));
                                return;
                            } catch (loginError) {
                                console.error('❌ Login also failed:', loginError);
                                throw fallbackError;
                            }
                        }
                        throw fallbackError;
                    }
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            console.error('Full error object:', err);

            // Handle different types of errors
            if (err.status) {
                switch (err.status) {
                    case 400:
                        // Handle PocketBase validation errors - improved extraction
                        console.log('🔍 Processing 400 error:', err);

                        // First check if error.data has field-specific errors
                        if (err.data && typeof err.data === 'object') {
                            let validationErrors = [];

                            if (err.data.email) {
                                const emailMsg = typeof err.data.email === 'string' ? err.data.email : err.data.email.message;
                                if (emailMsg) validationErrors.push(`Email: ${emailMsg}`);
                            }
                            if (err.data.password) {
                                const passwordMsg = typeof err.data.password === 'string' ? err.data.password : err.data.password.message;
                                if (passwordMsg) validationErrors.push(`Password: ${passwordMsg}`);
                            }
                            if (err.data.passwordConfirm) {
                                const confirmMsg = typeof err.data.passwordConfirm === 'string' ? err.data.passwordConfirm : err.data.passwordConfirm.message;
                                if (confirmMsg) validationErrors.push(`Confirm Password: ${confirmMsg}`);
                            }
                            if (err.data.name) {
                                const nameMsg = typeof err.data.name === 'string' ? err.data.name : err.data.name.message;
                                if (nameMsg) validationErrors.push(`Name: ${nameMsg}`);
                            }

                            if (validationErrors.length > 0) {
                                error = validationErrors.join('; ');
                            } else {
                                // Fallback to error message
                                error = typeof err.message === 'string' ? err.message : 'Validation failed';
                            }
                        } else {
                            // Fallback error handling
                            error = typeof err.message === 'string' ? err.message : 'Invalid data provided';
                        }

                        console.log('📝 Final error message to display:', error);
                        break;
                    case 403:
                        error = 'Registration disabled or invalid data';
                        break;
                    case 404:
                        error = 'Authentication service not available';
                        break;
                    default:
                        let defaultMsg = 'Unknown error';
                        if (err.message) {
                            if (typeof err.message === 'string') {
                                defaultMsg = err.message;
                            } else if (typeof err.message === 'object') {
                                if (err.message.message) {
                                    defaultMsg = err.message.message;
                                } else if (err.message.error) {
                                    defaultMsg = err.message.error;
                                } else if (err.message.data) {
                                    defaultMsg = err.message.data;
                                } else {
                                    defaultMsg = 'Unknown error format';
                                }
                            } else {
                                defaultMsg = String(err.message);
                            }
                        }
                        error = `Server error (${err.status}): ${defaultMsg}`;
                }
            } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
                error = 'Network error - please check if PocketBase server is running on port 8090';
            } else if (err.status === 400) {
                let validationMsg = 'Invalid data provided';
                if (err.data?.message) {
                    if (typeof err.data.message === 'string') {
                        validationMsg = err.data.message;
                    } else if (typeof err.data.message === 'object') {
                        if (err.data.message.message) {
                            validationMsg = err.data.message.message;
                        } else if (err.data.message.error) {
                            validationMsg = err.data.message.error;
                        } else {
                            validationMsg = 'Invalid data provided';
                        }
                    } else {
                        validationMsg = String(err.data.message);
                    }
                } else if (err.message) {
                    if (typeof err.message === 'string') {
                        validationMsg = err.message;
                    } else if (typeof err.message === 'object') {
                        if (err.message.message) {
                            validationMsg = err.message.message;
                        } else if (err.message.error) {
                            validationMsg = err.message.error;
                        } else {
                            validationMsg = 'Invalid data provided';
                        }
                    } else {
                        validationMsg = String(err.message);
                    }
                }
                error = `Validation error: ${validationMsg}`;
            } else if (err.status === 404) {
                error = 'Authentication service not found - check PocketBase URL';
            } else if (err.status === 0) {
                error = 'CORS error - check browser console for details';
            } else {
                let finalMsg = 'Authentication failed - please try again';
                if (err.message) {
                    if (typeof err.message === 'string') {
                        finalMsg = err.message;
                    } else if (typeof err.message === 'object') {
                        if (err.message.message) {
                            finalMsg = err.message.message;
                        } else if (err.message.error) {
                            finalMsg = err.message.error;
                        } else if (err.message.data) {
                            finalMsg = err.message.data;
                        } else {
                            finalMsg = 'Authentication failed - please try again';
                        }
                    } else {
                        finalMsg = String(err.message);
                    }
                }
                error = finalMsg;
            }

            console.log('Error message to display:', error);
            console.log('Full error object:', err);
        } finally {
            isLoading = false;
        }
    }

    function logout() {
        pocketbaseService.logout();
        success = 'Logged out successfully';
        error = '';

        // Dispatch event to notify parent component
        window.dispatchEvent(new CustomEvent('pocketbase-auth-logout'));
    }

    // Debug function to test registration directly
    async function debugRegister() {
        console.log('🔧 Debug registration attempt...');
        console.log('Current form data:', {
            email: email.trim(),
            password: password.length + ' chars',
            confirmPassword: confirmPassword.length + ' chars',
            isLoginMode
        });

        try {
            // Try to register directly
            await pocketbaseService.register(email.trim(), password, {
                name: email.split('@')[0]
            });
            success = 'Debug registration successful!';
            isLoginMode = true;
        } catch (err) {
            console.error('Debug registration failed:', err);
            error = `Debug failed: ${err.message} (Status: ${err.status})`;
        }
    }

    function toggleMode() {
        isLoginMode = !isLoginMode;
        error = '';
        success = '';
        confirmPassword = '';
    }

    function toggleProxy() {
        useProxy = !useProxy;
        error = '';
        success = '';

        // Update environment variable for proxy mode
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('usePocketBaseProxy', useProxy.toString());
            console.log('🔄 Proxy mode:', useProxy ? 'ENABLED' : 'DISABLED');
        }
    }

    // Check if user is already authenticated - improved reactivity
    $: isAuthenticated = pocketbaseService.isAuthenticated();
    $: currentUser = pocketbaseService.getCurrentUser();

    // Force reactive updates - additional reactivity layer
    $: authState = {
        isAuthenticated: pocketbaseService.isAuthenticated(),
        user: pocketbaseService.getCurrentUser(),
        trigger: authTrigger
    };

    // Force reactive update when auth events are dispatched
    let authTrigger = 0;

    // Listen for authentication events
    if (typeof window !== 'undefined') {
        const handleAuthSuccess = () => {
            console.log('🔄 Received pocketbase-auth-success event, forcing reactive update');

            // Force refresh auth state first
            pocketbaseService.refreshAuthState();

            authTrigger += 1;
            // Force component re-render by updating reactive variables
            isAuthenticated = pocketbaseService.isAuthenticated();
            currentUser = pocketbaseService.getCurrentUser();
            // Clear any previous messages
            error = '';
            success = '';

            // Force authState update
            authState = {
                isAuthenticated: pocketbaseService.isAuthenticated(),
                user: pocketbaseService.getCurrentUser(),
                trigger: authTrigger
            };
        };

        const handleAuthLogout = () => {
            console.log('🔄 Received pocketbase-auth-logout event, forcing reactive update');

            // Force refresh auth state first
            pocketbaseService.refreshAuthState();

            authTrigger += 1;
            isAuthenticated = pocketbaseService.isAuthenticated();
            currentUser = pocketbaseService.getCurrentUser();
            // Clear messages on logout
            error = '';
            success = '';

            // Force authState update
            authState = {
                isAuthenticated: pocketbaseService.isAuthenticated(),
                user: pocketbaseService.getCurrentUser(),
                trigger: authTrigger
            };
        };

        window.addEventListener('pocketbase-auth-success', handleAuthSuccess);
        window.addEventListener('pocketbase-auth-logout', handleAuthLogout);

        // Cleanup event listeners when component is destroyed
        // Note: In Svelte, we would normally use onDestroy, but for simplicity we'll rely on the fact that
        // the component will be recreated when needed
    }

    // Reactive statement that depends on authTrigger to force updates
    $: {
        if (authTrigger > 0) {
            console.log('🔄 Auth trigger updated, current auth state:', {
                isAuthenticated: pocketbaseService.isAuthenticated(),
                currentUser: pocketbaseService.getCurrentUser()
            });
        }
    }
</script>

<div style="background: #1a1f2e; padding: 1.5rem; border-radius: 12px; border: 1px solid #253157; margin-bottom: 1rem;">
    <h3 style="color: #446bff; margin: 0 0 1rem 0;">
        {authState.isAuthenticated ? 'Account' : isLoginMode ? 'Login' : 'Register'}
    </h3>

    {#if authState.isAuthenticated}
        <!-- Authenticated user info -->
        <div style="background: rgba(68, 107, 255, 0.1); border: 1px solid rgba(68, 107, 255, 0.3); border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
            <div style="color: #f6f8ff; margin-bottom: 0.5rem;">
                <strong>Welcome, {authState.user?.name || authState.user?.email || 'User'}!</strong>
            </div>
            <div style="font-size: 0.9rem; color: #888; margin-bottom: 1rem;">
                Email: {authState.user?.email}
            </div>
            <button
                style="padding: 0.5rem 1rem; border: none; border-radius: 6px; background: #ff4757; color: white; cursor: pointer; font-weight: 600;"
                on:click={logout}
            >
                Logout
            </button>
        </div>
    {:else}
        <!-- Login/Register form -->
        <div style="margin-bottom: 1rem;">
            <div style="margin-bottom: 1rem;">
                <label style="color: #f6f8ff; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Email</label>
                <input
                    type="email"
                    bind:value={email}
                    placeholder="Enter your email"
                    style="width: 100%; padding: 0.75rem; border: 1px solid #253157; border-radius: 6px; background: #0f1629; color: #f6f8ff; font-size: 0.9rem;"
                    disabled={isLoading}
                >
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="color: #f6f8ff; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Password</label>
                <input
                    type="password"
                    bind:value={password}
                    placeholder="Enter your password"
                    style="width: 100%; padding: 0.75rem; border: 1px solid #253157; border-radius: 6px; background: #0f1629; color: #f6f8ff; font-size: 0.9rem;"
                    disabled={isLoading}
                >
            </div>

            {#if !isLoginMode}
                <div style="margin-bottom: 1rem;">
                    <label style="color: #f6f8ff; font-size: 0.9rem; display: block; margin-bottom: 0.5rem;">Confirm Password</label>
                    <input
                        type="password"
                        bind:value={confirmPassword}
                        placeholder="Confirm your password"
                        style="width: 100%; padding: 0.75rem; border: 1px solid #253157; border-radius: 6px; background: #0f1629; color: #f6f8ff; font-size: 0.9rem;"
                        disabled={isLoading}
                    >
                </div>
            {/if}

            {#if error}
                <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem;">
                    <p style="color: #ff4757; margin: 0; font-size: 0.9rem;">{error}</p>
                </div>
            {/if}

            {#if success}
                <div style="background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem;">
                    <p style="color: #2ecc71; margin: 0; font-size: 0.9rem;">{success}</p>
                </div>
            {/if}

            <div style="display: flex; gap: 1rem; align-items: center;">
                <button
                    style="padding: 0.75rem 1.5rem; border: none; border-radius: 6px; background: linear-gradient(135deg, #446bff, #6b73ff); color: white; cursor: pointer; font-weight: 600; flex: 1;"
                    on:click={handleAuth}
                    disabled={isLoading}
                >
                    {#if isLoading}
                        {isLoginMode ? 'Logging in...' : 'Registering...'}
                    {:else}
                        {isLoginMode ? 'Login' : 'Register'}
                    {/if}
                </button>

                <button
                    style="padding: 0.75rem 1rem; border: 1px solid #446bff; border-radius: 6px; background: transparent; color: #446bff; cursor: pointer; font-weight: 600;"
                    on:click={toggleMode}
                    disabled={isLoading}
                >
                    {isLoginMode ? 'Register' : 'Login'}
                </button>

                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                    {#if !isLoginMode}
                        <button
                            style="padding: 0.5rem 1rem; border: 1px solid #ff6b6b; border-radius: 6px; background: transparent; color: #ff6b6b; cursor: pointer; font-size: 0.8rem;"
                            on:click={debugRegister}
                            disabled={isLoading}
                        >
                            Debug Register
                        </button>
                    {/if}

                    <button
                        style="padding: 0.5rem 1rem; border: 1px solid {useProxy ? '#e74c3c' : '#27ae60'}; border-radius: 6px; background: transparent; color: {useProxy ? '#e74c3c' : '#27ae60'}; cursor: pointer; font-size: 0.8rem;"
                        on:click={toggleProxy}
                        disabled={isLoading}
                    >
                        Proxy: {useProxy ? 'ON' : 'OFF'}
                    </button>

                    <button
                        style="padding: 0.5rem 1rem; border: 1px solid #3498db; border-radius: 6px; background: transparent; color: #3498db; cursor: pointer; font-size: 0.8rem;"
                        on:click={() => window.open('/test-proxy.html', '_blank')}
                    >
                        Test Proxy
                    </button>
                </div>

                {#if error}
                    <button
                        style="padding: 0.5rem 1rem; border: 1px solid #ff4757; border-radius: 6px; background: transparent; color: #ff4757; cursor: pointer; font-size: 0.8rem; margin-top: 0.5rem;"
                        on:click={async () => {
                            console.log('🔧 Manual API test...');
                            try {
                                const response = await fetch('/pb-api/api/collections/users/records', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        email: 'manual' + Date.now() + '@example.com',
                                        password: 'test123456',
                                        passwordConfirm: 'test123456',
                                        name: 'Manual Test'
                                    })
                                });

                                const result = await response.text();
                                console.log('Manual API result:', response.status, result);

                                if (response.ok) {
                                    alert('✅ Manual registration successful! Check console for details.');
                                } else {
                                    alert('❌ Manual registration failed: ' + response.status + ' - ' + result);
                                }
                            } catch (err) {
                                console.error('Manual API error:', err);
                                alert('❌ Manual API error: ' + err.message);
                            }
                        }}
                    >
                        Test API Direct
                    </button>
                {/if}

                <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button
                        style="padding: 0.5rem 1rem; border: 1px solid #ffa500; border-radius: 6px; background: transparent; color: #ffa500; cursor: pointer; font-size: 0.8rem;"
                        on:click={() => {
                            email = 'walletuser@example.com';
                            password = 'wallet123456';
                            confirmPassword = 'wallet123456';
                            isLoginMode = true;
                            error = '';
                        }}
                    >
                        Try Test Credentials
                    </button>
                    <button
                        style="padding: 0.5rem 1rem; border: 1px solid #3498db; border-radius: 6px; background: transparent; color: #3498db; cursor: pointer; font-size: 0.8rem;"
                        on:click={() => window.open('http://localhost:8090/_/', '_blank')}
                    >
                        Admin Panel
                    </button>
                    <button
                        style="padding: 0.5rem 1rem; border: 1px solid #9b59b6; border-radius: 6px; background: transparent; color: #9b59b6; cursor: pointer; font-size: 0.8rem;"
                        on:click={() => window.open('/test-proxy.html', '_blank')}
                    >
                        Test Proxy
                    </button>
                </div>
            </div>
        </div>

        <!-- Info text -->
        <div style="background: rgba(68, 107, 255, 0.1); border: 1px solid rgba(68, 107, 255, 0.3); border-radius: 6px; padding: 1rem;">
            <p style="color: #446bff; margin: 0; font-size: 0.8rem;">
                🔐 <strong>PocketBase Authentication:</strong> Login or register to save and manage your wallets in the database.
                Your wallet data will be securely stored and accessible across sessions.
            </p>
            {#if error}
                <p style="color: #ff6b6b; margin: 0.5rem 0 0 0; font-size: 0.7rem;">
                    💡 <strong>Troubleshooting:</strong> Check browser console (F12) for detailed error logs. Make sure password is at least 6 characters long.
                </p>
                <p style="color: #ffa500; margin: 0.5rem 0 0 0; font-size: 0.7rem;">
                    🛠️ <strong>Quick Fix:</strong> Use "Try Test Credentials" button above or create user manually in admin panel (click "Open Admin Panel").
                </p>
            {/if}
        </div>
    {/if}
</div>

<style>
    input:focus {
        outline: none;
        border-color: #446bff;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
