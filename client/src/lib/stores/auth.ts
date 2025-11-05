import { writable } from 'svelte/store';
import { pocketbaseService } from '$lib/services/pocketbaseService';
// Simplified auth store for debugging SSR issues

export interface User {
  id: string;
  email: string;
  solanaWalletAddress?: string;  // Add this field
  tokenBalance?: number;         // Add this field
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Khởi tạo state từ localStorage nếu có (chỉ trong browser)
const storedTokens = typeof window !== 'undefined' ? localStorage.getItem('auth_tokens') : null;
const storedUser = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;

let initialTokens: AuthTokens | null = null;
let initialUser: User | null = null;

if (typeof window !== 'undefined') {
  if (storedTokens && storedUser) {
    try {
      const tokens = JSON.parse(storedTokens) as AuthTokens;
      const user = JSON.parse(storedUser) as User;

      // Kiểm tra token có hết hạn không
      if (tokens.expires_at > Date.now()) {
        initialTokens = tokens;
        initialUser = user;
      } else {
        // Token hết hạn, xóa khỏi localStorage
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
      }
    } catch (e) {
      console.warn('Invalid stored auth data:', e);
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    }
  }
}

export const authStore = writable<AuthState>({
  user: initialUser,
  tokens: initialTokens,
  isAuthenticated: !!initialUser,
  isLoading: false,
});

export const authActions = {
  async register(username: string, email: string, password: string) {
    authStore.update(state => ({ ...state, isLoading: true }));

    try {
      const response = await fetch('http://localhost:8090/api/collections/users/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          passwordConfirm: password,
          name: username
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
        // Properly extract error message from errorData
        let errorMessage = `HTTP ${response.status}`;
        if (errorData.message) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (typeof errorData.message === 'object') {
            // If message is an object, try to extract a meaningful string
            if (errorData.message.message && typeof errorData.message.message === 'string') {
              errorMessage = errorData.message.message;
            } else if (errorData.message.error && typeof errorData.message.error === 'string') {
              errorMessage = errorData.message.error;
            } else if (errorData.message.data && typeof errorData.message.data === 'string') {
              errorMessage = errorData.message.data;
            } else {
              errorMessage = `HTTP ${response.status} - Validation error`;
            }
          }
        } else if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (typeof errorData.error === 'object') {
            if (errorData.error.message && typeof errorData.error.message === 'string') {
              errorMessage = errorData.error.message;
            } else if (errorData.error.error && typeof errorData.error.error === 'string') {
              errorMessage = errorData.error.error;
            } else {
              errorMessage = `HTTP ${response.status} - Authentication error`;
            }
          } else {
            errorMessage = `HTTP ${response.status} - Authentication error`;
          }
        }
        throw new Error(errorMessage);
      }

      // Safely parse JSON response with error handling
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response text:', await response.text());
        throw new Error(`Server returned invalid JSON response (Status: ${response.status})`);
      }

      const tokens: AuthTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Date.now() + (data.expires_in * 1000),
      };

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        solanaWalletAddress: undefined,  // Initialize as undefined
        tokenBalance: 0,                // Initialize as 0
      };

      // Lưu vào localStorage (chỉ trong browser)
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_tokens', JSON.stringify(tokens));
        localStorage.setItem('auth_user', JSON.stringify(user));
      }

      authStore.set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      authStore.update(state => ({
        ...state,
        isLoading: false
      }));
      return { success: false, error: error.message };
    }
  },

  async login(email: string, password: string, rememberMe: boolean = false) {
    authStore.update(state => ({ ...state, isLoading: true }));

    try {
      const response = await fetch('http://localhost:8090/api/collections/users/auth-with-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: email,
          password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        // Properly extract error message from errorData
        let errorMessage = `HTTP ${response.status}`;
        if (errorData.message) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (typeof errorData.message === 'object') {
            // If message is an object, try to extract a meaningful string
            if (errorData.message.message && typeof errorData.message.message === 'string') {
              errorMessage = errorData.message.message;
            } else if (errorData.message.error && typeof errorData.message.error === 'string') {
              errorMessage = errorData.message.error;
            } else if (errorData.message.data && typeof errorData.message.data === 'string') {
              errorMessage = errorData.message.data;
            } else {
              errorMessage = `HTTP ${response.status} - Validation error`;
            }
          }
        } else if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (typeof errorData.error === 'object') {
            if (errorData.error.message && typeof errorData.error.message === 'string') {
              errorMessage = errorData.error.message;
            } else if (errorData.error.error && typeof errorData.error.error === 'string') {
              errorMessage = errorData.error.error;
            } else {
              errorMessage = `HTTP ${response.status} - Authentication error`;
            }
          } else {
            errorMessage = `HTTP ${response.status} - Authentication error`;
          }
        }
        throw new Error(errorMessage);
      }

      // Safely parse JSON response with error handling
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response text:', await response.text());
        throw new Error(`Server returned invalid JSON response (Status: ${response.status})`);
      }

      const tokens: AuthTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Date.now() + (data.expires_in * 1000),
      };

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        solanaWalletAddress: undefined,  // Initialize as undefined
        tokenBalance: 0,                // Initialize as 0
      };

      // Lưu vào localStorage (chỉ trong browser)
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_tokens', JSON.stringify(tokens));
        localStorage.setItem('auth_user', JSON.stringify(user));
      }

      authStore.set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      authStore.update(state => ({
        ...state,
        isLoading: false
      }));
      return { success: false, error: error.message };
    }
  },

  async refreshToken() {
    authStore.update(state => {
      if (!state.tokens) return state;

      return {
        ...state,
        isLoading: true,
      };
    });

    try {
      const state = await new Promise<AuthState>((resolve) => {
        const unsubscribe = authStore.subscribe(s => resolve(s));
        unsubscribe();
      });

      if (!state.tokens) {
        throw new Error('No tokens available');
      }

      // Note: PocketBase doesn't have a refresh token endpoint like traditional JWT
      // This method might not be needed for PocketBase, but let's make it compatible
      const response = await fetch('http://localhost:8090/api/collections/users/auth-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: state.tokens?.refresh_token,
        }),
      });

      if (!response.ok) {
        // PocketBase auth tokens are long-lived, so refresh might not be needed
        // If refresh fails, just return failure
        throw new Error('Token refresh failed');
      }

      // Safely parse JSON response with error handling
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response text:', await response.text());
        throw new Error(`Server returned invalid JSON response (Status: ${response.status})`);
      }

      const tokens: AuthTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Date.now() + (data.expires_in * 1000),
      };

      // Lưu vào localStorage (chỉ trong browser)
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_tokens', JSON.stringify(tokens));
      }

      authStore.update(state => ({
        ...state,
        tokens,
        isLoading: false,
      }));

      return { success: true };
    } catch (error) {
      authStore.update(state => ({
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      }));

      // Xóa token khỏi localStorage nếu refresh thất bại
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
      }

      return { success: false, error: error.message };
    }
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    }

    authStore.set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  async connectSolanaWallet(wallet: any): Promise<void> {
    // This will be implemented after we install Solana wallet adapter
    // For now, just show a placeholder
    console.log('Connecting Solana wallet:', wallet);

    // TODO: Implement actual wallet connection logic
    // const publicKey = await wallet.connect();
    //
    // // Associate wallet với user account
    // await fetch('/api/auth/link-wallet', {
    //   method: 'POST',
    //   headers: this.getAuthHeaders(),
    //   body: JSON.stringify({
    //     walletAddress: publicKey.toString(),
    //     walletType: 'solana'
    //   })
    // });
    //
    // // Update user profile
    // this.updateUserProfile({ solanaWalletAddress: publicKey.toString() });
  },

  updateUserProfile(updates: Partial<User>): void {
    authStore.update(state => {
      if (state.user) {
        const updatedUser = { ...state.user, ...updates };

        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        }

        return {
          ...state,
          user: updatedUser,
        };
      }
      return state;
    });
  },

  getAuthHeaders(): Record<string, string> {
    let headers: Record<string, string> = {};

    authStore.subscribe(state => {
      if (state.tokens?.access_token) {
        headers['Authorization'] = `Bearer ${state.tokens.access_token}`;
      }
    });

    return headers;
  },
};

// Auto refresh token trước khi hết hạn 5 phút (chỉ trong browser)
if (typeof window !== 'undefined' && initialTokens) {
  const timeUntilExpiry = initialTokens.expires_at - Date.now() - (5 * 60 * 1000); // 5 minutes before expiry

  if (timeUntilExpiry > 0) {
    setTimeout(() => {
      authActions.refreshToken();
    }, timeUntilExpiry);
  }
}

// Sync authStore with PocketBase client state and listen for auth events (browser only)
if (typeof window !== 'undefined') {
  const syncFromPocketBase = () => {
    try {
      const pbState = pocketbaseService.refreshAuthState();

      const isValid = pbState?.isValid ?? pocketbaseService.getInstance().authStore.isValid;
      const model = pbState?.model ?? pocketbaseService.getInstance().authStore.model;
      const token = pbState?.token ?? pocketbaseService.getInstance().authStore.token;

      if (isValid && model) {
        const tokens: AuthTokens = {
          access_token: token || '',
          refresh_token: '',
          expires_in: 0,
          expires_at: Date.now() + (60 * 60 * 1000), // best-effort expiry
        };

        const user: User = {
          id: model.id,
          email: model.email,
          solanaWalletAddress: undefined,  // Initialize as undefined
          tokenBalance: 0,                // Initialize as 0
        };

        // Persist to localStorage so existing initialization logic sees it
        try {
          localStorage.setItem('auth_tokens', JSON.stringify(tokens));
          localStorage.setItem('auth_user', JSON.stringify(user));
        } catch (e) {
          console.warn('Failed to write auth to localStorage:', e);
        }

        authStore.set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (err) {
      console.warn('Failed to sync authStore with PocketBase:', err);
    }
  };

  // Initial sync on page load
  syncFromPocketBase();

  const handleAuthSuccess = () => {
    syncFromPocketBase();
  };

  const handleAuthLogout = () => {
    try {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    } catch (e) {
      console.warn('Failed to remove auth from localStorage:', e);
    }

    authStore.set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  window.addEventListener('pocketbase-auth-success', handleAuthSuccess);
  window.addEventListener('pocketbase-auth-logout', handleAuthLogout);
}
