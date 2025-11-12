import PocketBase, { ClientResponseError } from 'pocketbase';
import { POCKETBASE_URL, COLLECTIONS, WALLET_TYPES, NETWORK_TYPES } from '$lib/config/pocketbase-config';
import { authStore } from '$lib/stores/auth';

export interface WalletData {
  id?: string;
  user_id?: string;
  address: string;
  private_key?: string; // Encrypted, only for generated wallets
  mnemonic?: string; // Encrypted, only for generated wallets
  wallet_type: string;
  network: string;
  balance?: number;
  balance_last_updated?: string;
  is_connected: boolean;
  notes?: string;
  created: string;
  updated: string;
}

export interface WalletCreateData {
  address: string;
  private_key?: string;
  mnemonic?: string;
  wallet_type: string;
  network: string;
  balance?: number;
}

export interface WalletUpdateData {
  balance?: number;
  is_connected?: boolean;
  balance_last_updated?: string;
}

// Energy interfaces
export interface EnergyData {
  id?: string;
  user_id?: string;
  points: number;
  created: string;
  updated: string;
}

export interface EnergyUpdateData {
  points?: number;
}

// Items/Inventory interfaces
export interface ItemData {
  id?: string;
  user_id?: string;
  item_id: string;
  item_name: string;
  category: 'powerups' | 'consumables' | 'cosmetics';
  icon?: string;
  quantity: number;
  purchase_price: number;
  purchased_at: string;
  created: string;
  updated: string;
}

export interface ItemCreateData {
  item_id: string;
  item_name: string;
  category: 'powerups' | 'consumables' | 'cosmetics';
  icon?: string;
  quantity?: number;
  purchase_price: number;
}

// Shop items interfaces
export interface ShopItemData {
  id?: string;
  item_id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: 'powerups' | 'consumables' | 'cosmetics';
  is_enabled: boolean;
  sort_order: number;
  created: string;
  updated: string;
}

export interface ShopItemCreateData {
  item_id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: 'powerups' | 'consumables' | 'cosmetics';
  is_enabled?: boolean;
  sort_order?: number;
}

class PocketBaseService {
  private pb: PocketBase;
  private energyRequests = new Map<string, Promise<EnergyData>>(); // Deduplication for energy requests

  constructor() {
    this.pb = new PocketBase(POCKETBASE_URL);

    // Configure PocketBase client for better error handling
    this.pb.autoCancellation = false; // Disable auto-cancellation of requests

    // Add request interceptor for debugging and CORS
    this.pb.beforeSend = function (url, options) {
      console.log('📡 PocketBase Request:', {
        url: url,
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
      });

      // Ensure proper headers for CORS
      options.headers = Object.assign({}, {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
      }, options.headers);

      // Enable credentials for authentication
      options.credentials = 'include';

      // Set mode to cors for cross-origin requests
      if (typeof window !== 'undefined') {
        options.mode = 'cors';
      }

      // Increase timeout for wallet operations
      if (url.includes('/wallets/') || url.includes('/collections/wallets')) {
        options.signal = AbortSignal.timeout(30000); // 30 second timeout for wallet operations
      }

      // Log the final request for debugging
      if (url.includes('/api/collections/users/records') && options.method === 'POST') {
        console.log('📝 Registration request details:', {
          url: url,
          method: options.method,
          headers: options.headers,
          body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
        });
      }

      return { url, options };
    };

    // Add response interceptor for debugging and error handling
    this.pb.afterSend = function (response, data) {
      console.log('📡 PocketBase Response:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        url: response.url
      });

      // If response is not ok, ensure error is properly formatted
      if (!response.ok && data) {
        console.log('📡 PocketBase Error Response Data:', data);

        // Ensure error data is properly formatted for our error handlers
        if (data && typeof data === 'object') {
          // If data has nested error objects, flatten them
          if (data.data && typeof data.data === 'object') {
            Object.keys(data.data).forEach(key => {
              if (data.data[key] && typeof data.data[key] === 'object' && data.data[key].message) {
                data.data[key] = data.data[key].message;
              }
            });
          }
        }
      }

      return data;
    };
  }

  // Get PocketBase instance
  getInstance(): PocketBase {
    return this.pb;
  }

  // Alternative registration method using direct fetch (bypass PocketBase client)
  async registerDirect(email: string, password: string, userData?: any) {
    try {
      console.log('🔄 Attempting direct registration...');

      const response = await fetch(`${POCKETBASE_URL.replace('/pb-api', '')}/api/collections/users/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          passwordConfirm: password,
          ...userData
        })
      });

      // Safely parse JSON response with error handling
      let result;
      const responseText = await response.text();

      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response statusText:', response.statusText);
        console.error('❌ Response body:', responseText);
        throw new Error(`Server returned invalid JSON response (Status: ${response.status})`);
      }

      if (response.ok) {
        console.log('✅ Direct registration successful');
        return result;
      } else {
        console.error('❌ Direct registration failed:', result);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response statusText:', response.statusText);

        // Properly extract error message from result - ensure it's always a string
        let errorMessage = 'Registration failed';

        // Handle PocketBase validation error format
        if (result.data) {
          // PocketBase validation errors
          if (result.data.email?.message) {
            errorMessage = `Email: ${result.data.email.message}`;
          } else if (result.data.password?.message) {
            errorMessage = `Password: ${result.data.password.message}`;
          } else if (result.data.passwordConfirm?.message) {
            errorMessage = `Confirm Password: ${result.data.passwordConfirm.message}`;
          } else if (result.data.name?.message) {
            errorMessage = `Name: ${result.data.name.message}`;
          } else {
            errorMessage = result.message || `Validation failed (Status: ${response.status})`;
          }
        } else if (result.message) {
          if (typeof result.message === 'string') {
            errorMessage = result.message;
          } else if (typeof result.message === 'object') {
            errorMessage = result.message.message || result.message.error || `Registration failed (Status: ${response.status})`;
          } else {
            errorMessage = String(result.message);
          }
        } else if (result.error) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (typeof result.error === 'object') {
            errorMessage = result.error.message || result.error.error || `Registration failed (Status: ${response.status})`;
          } else {
            errorMessage = String(result.error);
          }
        } else {
          errorMessage = `Registration failed (Status: ${response.status})`;
        }

        console.log('❌ Final error message:', errorMessage);
        console.log('❌ Full error result:', result);

        const enhancedError = new Error(errorMessage);
        enhancedError.status = response.status;
        enhancedError.data = result;
        throw enhancedError;
      }
    } catch (error) {
      console.error('❌ Direct registration error:', error);
      throw error;
    }
  }

  // Authenticate user (if needed)
  async authenticate(email: string, password: string) {
    try {
      console.log('🔑 Attempting authentication for:', email);
      const authData = await this.pb.collection('users').authWithPassword(email, password);
      console.log('✅ PocketBase authentication successful');
      console.log('📋 Auth data received:', {
        token: authData.token ? 'present' : 'missing',
        user: authData.record ? authData.record.email : 'no record',
        recordId: authData.record?.id
      });

      // Now authenticate with the gateway to get JWT tokens for API access
      console.log('🔐 Authenticating with gateway...');
      try {
        const gatewayResponse = await fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: email,
            password: password
          }),
        });

        if (gatewayResponse.ok) {
          const gatewayAuth = await gatewayResponse.json();
          console.log('✅ Gateway authentication successful');

          // Store gateway tokens in localStorage for the auth store
          const authTokens = {
            access_token: gatewayAuth.access_token,
            refresh_token: gatewayAuth.refresh_token,
            expires_in: gatewayAuth.expires_in,
            expires_at: Date.now() + (gatewayAuth.expires_in * 1000),
          };

          const authUser = {
            id: gatewayAuth.user.id,
            email: gatewayAuth.user.email,
            solanaWalletAddress: undefined,
            tokenBalance: 0,
          };

          // Update auth store with gateway tokens
          authStore.set({
            user: authUser,
            tokens: authTokens,
            isAuthenticated: true,
            isLoading: false,
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
            localStorage.setItem('auth_user', JSON.stringify(authUser));
            console.log('💾 Gateway auth tokens stored in localStorage and auth store updated');
          }
        } else {
          console.warn('⚠️ Gateway authentication failed, but PocketBase login succeeded');
          console.warn('Gateway response:', gatewayResponse.status, gatewayResponse.statusText);
        }
      } catch (gatewayError) {
        console.warn('⚠️ Failed to authenticate with gateway:', gatewayError);
        console.warn('Continuing with PocketBase authentication only');
      }

      // Dispatch event to notify components about auth state change
      if (typeof window !== 'undefined') {
        // Small delay to ensure authStore is updated
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('pocketbase-auth-success'));
          console.log('📡 Dispatched pocketbase-auth-success event');
        }, 50);
      }

      return authData;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      console.error('Error details:', {
        status: error.status,
        message: error.message,
        url: error.url
      });
      throw error;
    }
  }

  // Register new user
  async register(email: string, password: string, userData?: any) {
    try {
      console.log('📝 Attempting registration for:', email);
      console.log('Registration data:', {
        email,
        passwordLength: password.length,
        userData
      });

      // Create user record first
      const userRecord = await this.pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        ...userData
      });
      console.log('✅ User record created:', userRecord.id);

      // Then authenticate
      try {
        const authData = await this.pb.collection('users').authWithPassword(email, password);
        console.log('✅ User authenticated after registration');
        console.log('📋 Registration auth data:', {
          token: authData.token ? 'present' : 'missing',
          user: authData.record ? authData.record.email : 'no record',
          recordId: authData.record?.id
        });

        // Now authenticate with the gateway to get JWT tokens for API access
        console.log('🔐 Authenticating with gateway after registration...');
        try {
          const gatewayResponse = await fetch('/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: email,
              password: password
            }),
          });

          if (gatewayResponse.ok) {
            const gatewayAuth = await gatewayResponse.json();
            console.log('✅ Gateway authentication successful after registration');

            // Store gateway tokens in localStorage for the auth store
            const authTokens = {
              access_token: gatewayAuth.access_token,
              refresh_token: gatewayAuth.refresh_token,
              expires_in: gatewayAuth.expires_in,
              expires_at: Date.now() + (gatewayAuth.expires_in * 1000),
            };

            const authUser = {
              id: gatewayAuth.user.id,
              email: gatewayAuth.user.email,
              solanaWalletAddress: undefined,
              tokenBalance: 0,
            };

            // Update auth store with gateway tokens
            authStore.set({
              user: authUser,
              tokens: authTokens,
              isAuthenticated: true,
              isLoading: false,
            });

            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_tokens', JSON.stringify(authTokens));
              localStorage.setItem('auth_user', JSON.stringify(authUser));
              console.log('💾 Gateway auth tokens stored in localStorage and auth store updated after registration');
            }
          } else {
            console.warn('⚠️ Gateway authentication failed after registration, but PocketBase registration succeeded');
            console.warn('Gateway response:', gatewayResponse.status, gatewayResponse.statusText);
          }
        } catch (gatewayError) {
          console.warn('⚠️ Failed to authenticate with gateway after registration:', gatewayError);
          console.warn('Continuing with PocketBase registration only');
        }

        // Dispatch event to notify components about auth state change
        if (typeof window !== 'undefined') {
          // Small delay to ensure authStore is updated
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('pocketbase-auth-success'));
            console.log('📡 Dispatched pocketbase-auth-success event after registration');
          }, 50);
        }
      } catch (authError) {
        console.warn('⚠️ Authentication after registration failed:', authError);
        // Don't fail registration if authentication fails
        // User can still login manually
      }

      return userRecord;
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error details:', {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: error.url,
        data: error.data
      });

      // Re-throw with more context - improved error handling
      let errorMessage = 'Registration failed';

      // Handle PocketBase error format - prioritize validation errors
      if (error.data) {
        console.log('📋 Processing error.data:', error.data);

        if (error.data.email || error.data.password || error.data.passwordConfirm || error.data.name) {
          // PocketBase validation errors
          let validationErrors = [];
          if (error.data.email) {
            const emailMsg = typeof error.data.email === 'string' ? error.data.email : error.data.email.message;
            if (emailMsg) validationErrors.push(`Email: ${emailMsg}`);
          }
          if (error.data.password) {
            const passwordMsg = typeof error.data.password === 'string' ? error.data.password : error.data.password.message;
            if (passwordMsg) validationErrors.push(`Password: ${passwordMsg}`);
          }
          if (error.data.passwordConfirm) {
            const confirmMsg = typeof error.data.passwordConfirm === 'string' ? error.data.passwordConfirm : error.data.passwordConfirm.message;
            if (confirmMsg) validationErrors.push(`Confirm Password: ${confirmMsg}`);
          }
          if (error.data.name) {
            const nameMsg = typeof error.data.name === 'string' ? error.data.name : error.data.name.message;
            if (nameMsg) validationErrors.push(`Name: ${nameMsg}`);
          }

          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join('; ');
          } else {
            errorMessage = typeof error.message === 'string' ? error.message : 'Validation failed';
          }
        } else {
          // Fallback for other error formats
          if (typeof error.data === 'string') {
            errorMessage = error.data;
          } else if (typeof error.data === 'object') {
            if (error.data.message && typeof error.data.message === 'string') {
              errorMessage = error.data.message;
            } else if (error.data.error && typeof error.data.error === 'string') {
              errorMessage = error.data.error;
            } else {
              errorMessage = typeof error.message === 'string' ? error.message : 'Registration failed - invalid data format';
            }
          }
        }
      } else if (error.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (typeof error.message === 'object') {
          // Handle object messages safely - extract nested messages
          if (error.message.message && typeof error.message.message === 'string') {
            errorMessage = error.message.message;
          } else if (error.message.error && typeof error.message.error === 'string') {
            errorMessage = error.message.error;
          } else if (error.message.data && typeof error.message.data === 'string') {
            errorMessage = error.message.data;
          } else {
            // Try to extract from nested object
            try {
              const keys = Object.keys(error.message);
              for (const key of keys) {
                if (typeof error.message[key] === 'string') {
                  errorMessage = error.message[key];
                  break;
                } else if (typeof error.message[key] === 'object' && error.message[key]?.message) {
                  errorMessage = error.message[key].message;
                  break;
                }
              }
              if (!errorMessage || errorMessage === 'Registration failed') {
                errorMessage = 'Registration failed - unknown error format';
              }
            } catch (extractError) {
              errorMessage = 'Registration failed - unknown error format';
            }
          }
        } else {
          errorMessage = String(error.message);
        }
      }

      console.log('❌ Enhanced error message:', errorMessage);
      console.log('❌ Original error:', error);

      const enhancedError = new Error(errorMessage);
      enhancedError.status = error.status || 400;
      enhancedError.data = error.data;
      enhancedError.url = error.url;
      throw enhancedError;
    }
  }

  // Logout
  logout() {
    this.pb.authStore.clear();

    // Dispatch event to notify components about auth state change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pocketbase-auth-logout'));
      console.log('📡 Dispatched pocketbase-auth-logout event');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const isValid = this.pb.authStore.isValid;
    console.log('🔍 Checking auth state:', {
      isValid,
      token: this.pb.authStore.token ? 'present' : 'missing',
      model: this.pb.authStore.model ? this.pb.authStore.model.email : 'no model'
    });
    return isValid;
  }

  // Get current user
  getCurrentUser() {
    const model = this.pb.authStore.model;
    console.log('🔍 Getting current user:', model ? model.email : 'no user');
    return model;
  }

  // Force refresh authentication state
  refreshAuthState() {
    console.log('🔄 Forcing auth state refresh');
    // Access authStore properties to trigger any internal updates
    const isValid = this.pb.authStore.isValid;
    const model = this.pb.authStore.model;
    const token = this.pb.authStore.token;

    console.log('📋 Current auth state after refresh:', {
      isValid,
      hasModel: !!model,
      hasToken: !!token,
      userEmail: model?.email
    });

    return { isValid, model, token };
  }

  // Wallets CRUD operations

  // Create wallet
  async createWallet(walletData: WalletCreateData, userId?: string): Promise<WalletData> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) {
        throw new Error('No user ID available for wallet creation');
      }

      const data = {
        ...walletData,
        user_id: user,
        is_connected: false,
        balance_last_updated: new Date().toISOString()
      };

      console.log('📝 Creating wallet in PocketBase:', data);

      // Always attempt to create in PocketBase, even if auth might not be fully synced
      // The PocketBase client should handle authentication internally
      const record = await this.pb.collection(COLLECTIONS.WALLETS).create(data);
      console.log('✅ Wallet created successfully in PocketBase:', record.id);
      return record as WalletData;
    } catch (error) {
      console.error('❌ Error creating wallet in PocketBase:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        data: error.data
      });

      // Re-throw all errors to let the caller handle authentication issues properly
      throw error;
    }
  }

  // Get wallet by address
  async getWalletByAddress(address: string, network: string, userId?: string): Promise<WalletData | null> {
    try {
      // If userId provided, check wallet ownership
      const userFilter = userId ? ` && user_id = "${userId}"` : '';
      const records = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `address = "${address}" && network = "${network}"${userFilter}`
        });

      return records.items.length > 0 ? records.items[0] as WalletData : null;
    } catch (error) {
      console.error('Error getting wallet:', error);
      return null;
    }
  }

  // Check if address exists globally (for security)
  async addressExistsGlobally(address: string, network: string): Promise<boolean> {
    try {
      const records = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `address = "${address}" && network = "${network}"`
        });

      return records.items.length > 0;
    } catch (error) {
      console.error('Error checking global address existence:', error);
      return false;
    }
  }

  // Check if user already has a wallet for this network
  async userHasWalletForNetwork(userId: string, network: string): Promise<boolean> {
    try {
      const records = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `user_id = "${userId}" && network = "${network}"`
        });

      return records.items.length > 0;
    } catch (error) {
      console.error('Error checking user wallet for network:', error);
      return false;
    }
  }

  // Get all wallets for current user - improved error handling
  async getUserWallets(userId?: string): Promise<WalletData[]> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) {
        console.log('No user ID available for wallet loading');
        return [];
      }

      console.log('📦 Loading wallets for user:', user);

      const records = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 100, {
          filter: `user_id = "${user}"`,
          sort: '-created'
        });

      console.log('✅ Successfully loaded wallets:', records.items.length);
      return records.items as WalletData[];
    } catch (error) {
      console.error('❌ Error getting user wallets:', error);

      // Handle specific error types
      if (error.name === 'AbortError' || error.message?.includes('autocancelled')) {
        console.log('🔄 Request was cancelled, this is normal for concurrent requests');
        return [];
      }

      if (error.name === 'ClientResponseError') {
        console.log('🔄 PocketBase client error, user may not be authenticated yet');
        return [];
      }

      if (error.status === 0 || error.message?.includes('fetch')) {
        console.log('🔄 Network error, PocketBase may not be available');
        return [];
      }

      // For any other errors, still return empty array to prevent UI crashes
      console.log('🔄 Unknown error, returning empty wallet list');
      return [];
    }
  }

  // Get wallets by network
  async getWalletsByNetwork(network: string, userId?: string): Promise<WalletData[]> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return [];

      const records = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 100, {
          filter: `user_id = "${user}" && network = "${network}"`,
          sort: '-created'
        });

      return records.items as WalletData[];
    } catch (error) {
      console.error('Error getting wallets by network:', error);
      return [];
    }
  }

  // Update wallet
  async updateWallet(id: string, updateData: WalletUpdateData): Promise<WalletData> {
    try {
      const record = await this.pb.collection(COLLECTIONS.WALLETS).update(id, {
        ...updateData,
        balance_last_updated: new Date().toISOString()
      });
      return record as WalletData;
    } catch (error) {
      console.error('Error updating wallet:', error);
      throw error;
    }
  }

  // Update wallet balance
  async updateWalletBalance(id: string, balance: number): Promise<WalletData> {
    return this.updateWallet(id, {
      balance,
      is_connected: true,
      balance_last_updated: new Date().toISOString()
    });
  }

  // Connect/Disconnect wallet
  async setWalletConnection(id: string, connected: boolean): Promise<WalletData> {
    return this.updateWallet(id, {
      is_connected: connected,
      balance_last_updated: new Date().toISOString()
    });
  }

  // Delete wallet
  async deleteWallet(id: string): Promise<boolean> {
    try {
      await this.pb.collection(COLLECTIONS.WALLETS).delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting wallet:', error);
      return false;
    }
  }

  // Get wallet statistics
  async getWalletStats(userId?: string) {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return null;

      // Get total wallets
      const totalWallets = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `user_id = "${user}"`
        });

      // Get connected wallets
      const connectedWallets = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `user_id = "${user}" && is_connected = true`
        });

      // Get wallets by network
      const ethereumWallets = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `user_id = "${user}" && network = "${NETWORK_TYPES.ETHEREUM}"`
        });

      const solanaWallets = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `user_id = "${user}" && network = "${NETWORK_TYPES.SOLANA}"`
        });

      const suiWallets = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 1, {
          filter: `user_id = "${user}" && network = "${NETWORK_TYPES.SUI}"`
        });

      return {
        total: totalWallets.totalItems,
        connected: connectedWallets.totalItems,
        ethereum: ethereumWallets.totalItems,
        solana: solanaWallets.totalItems,
        sui: suiWallets.totalItems
      };
    } catch (error) {
      console.error('Error getting wallet stats:', error);
      return null;
    }
  }

  // Search wallets
  async searchWallets(query: string, userId?: string): Promise<WalletData[]> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return [];

      const records = await this.pb.collection(COLLECTIONS.WALLETS)
        .getList(1, 50, {
          filter: `user_id = "${user}" && (address ~ "${query}" || wallet_type ~ "${query}" || network ~ "${query}")`,
          sort: '-created'
        });

      return records.items as WalletData[];
    } catch (error) {
      console.error('Error searching wallets:', error);
      return [];
    }
  }

  // Energy CRUD operations

  // Create or get user energy record
  async getOrCreateUserEnergy(userId?: string): Promise<EnergyData> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) {
        throw new Error('No user ID available');
      }

      // DEBUG: Log current auth state
      console.log('🔐 ENERGY SERVICE AUTH DEBUG:', {
        requestedUserId: userId,
        authStoreUserId: this.pb.authStore.model?.id,
        authStoreEmail: this.pb.authStore.model?.email,
        finalUserId: user,
        isAuthValid: this.pb.authStore.isValid,
        tokenPresent: !!this.pb.authStore.token
      });

      // If using gateway auth and PocketBase auth is not available, return default energy
      if (userId && !this.pb.authStore.model) {
        console.log('🔄 Using gateway auth without PocketBase sync - returning default energy');
        return {
          id: 'gateway-energy',
          user_id: userId,
          points: 0,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        } as EnergyData;
      }

      // Check if there's already a pending request for this user
      const existingRequest = this.energyRequests.get(user);
      if (existingRequest) {
        console.log('🔄 Returning existing energy request for user:', user);
        return existingRequest;
      }

      console.log('🔍 Checking energy record for user:', user, `(email: ${this.pb.authStore.model?.email})`);

      // Create new request and store it
      const requestPromise = this._getOrCreateUserEnergyInternal(user);
      this.energyRequests.set(user, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up the request from the map
        this.energyRequests.delete(user);
      }
    } catch (error) {
      // Clean up on error too
      const user = userId || this.pb.authStore.model?.id;
      if (user) {
        this.energyRequests.delete(user);
      }

      // Return default energy data on error to keep the app functional
      console.log('⚠️ Energy service failed, returning default energy data');
      return {
        id: 'fallback-energy',
        user_id: userId || 'unknown',
        points: 0,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      } as EnergyData;
    }
  }

  // Internal method for the actual logic
  private async _getOrCreateUserEnergyInternal(user: string): Promise<EnergyData> {

    try {
      // Try to get existing energy record
      const existingRecords = await this.pb.collection(COLLECTIONS.ENERGY)
        .getList(1, 1, {
          filter: `user_id = "${user}"`
        });

      if (existingRecords.items.length > 0) {
        console.log('📋 Found existing energy record:', existingRecords.items[0].points, 'points');
        return existingRecords.items[0] as EnergyData;
      }

      // Create new energy record if none exists
      console.log('🆕 No energy record found, creating new one...');

      // Ensure we have a valid authenticated user before creating
      const currentUser = this.pb.authStore.model;
      if (!currentUser || currentUser.id !== user) {
        console.log('⚠️ User authentication state inconsistent, refreshing...');
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        const refreshedUser = this.pb.authStore.model;
        if (!refreshedUser) {
          throw new Error('User not authenticated for energy creation');
        }
      }

      // Validate user exists before creating energy
      console.log('🔍 Validating user exists...');
      try {
        const userRecord = await this.pb.collection('users').getOne(user);
        console.log('✅ User exists:', userRecord.email);
      } catch (userError) {
        console.error('❌ User validation failed:', userError);
        throw new Error(`User ${user} does not exist or is not accessible`);
      }

      // Try creating with minimal required fields first
      console.log('🔄 Attempting to create with minimal data (user_id, points only)...');

      const minimalData = {
        user_id: user,
        points: 1  // Use 1 instead of 0 to avoid PocketBase validation issue
      };

      console.log('📝 Minimal data:', minimalData);
      console.log('🔗 User ID type:', typeof user, 'value:', user);

      const record = await this.pb.collection(COLLECTIONS.ENERGY).create(minimalData);
      console.log('✅ Created new energy record for user:', user, 'with ID:', record.id);
      return record as EnergyData;
    } catch (error) {
      console.error('❌ Error getting/creating user energy:', error);
      throw error;
    }
  }

  // Get user energy
  async getUserEnergy(userId?: string): Promise<EnergyData | null> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return null;

      const records = await this.pb.collection(COLLECTIONS.ENERGY)
        .getList(1, 1, {
          filter: `user_id = "${user}"`
        });

      return records.items.length > 0 ? records.items[0] as EnergyData : null;
    } catch (error) {
      console.error('Error getting user energy:', error);
      return null;
    }
  }

  // Update energy points
  async updateEnergyPoints(points: number, userId?: string): Promise<EnergyData> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) {
        throw new Error('No user ID available');
      }

      // Validate that points is a valid number
      if (isNaN(points) || !isFinite(points) || points < 0) {
        console.error('❌ Invalid points value:', points);
        throw new Error('Invalid energy points value');
      }

      console.log('🔄 Updating energy points to:', points, 'for user:', user);

      // Get or create energy record
      console.log('🔍 Getting/creating energy record...');
      const energyRecord = await this.getOrCreateUserEnergy(user);
      console.log('📋 Energy record:', energyRecord);

      console.log('📝 Updating energy record with ID:', energyRecord.id!, 'to points:', points);

      // Ensure points is explicitly set as a number to avoid validation issues
      const updateData: any = {
        points: Number(points),
        user_id: energyRecord.user_id
      };

      console.log('📊 Update data:', updateData);
      console.log('📊 Update data types:', {
        points: typeof updateData.points,
        pointsValue: updateData.points,
        user_id: typeof updateData.user_id,
        last_updated: typeof updateData.last_updated
      });

      console.log('🔄 Sending update request to PocketBase...');
      console.log('📡 Request URL:', `${this.pb.baseUrl}/api/collections/${COLLECTIONS.ENERGY}/records/${energyRecord.id}`);
      console.log('📡 Request method: PATCH');

      // Use direct fetch to ensure proper handling of zero values
      const response = await fetch(`${this.pb.baseUrl}/api/collections/${COLLECTIONS.ENERGY}/records/${energyRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.pb.authStore.token
        },
        body: JSON.stringify({
          points: updateData.points,
          user_id: updateData.user_id,
          last_updated: updateData.last_updated
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Direct fetch failed:', error);
        throw new ClientResponseError({
          url: response.url,
          status: response.status,
          data: error
        });
      }

      const record = await response.json();
      console.log('📡 Direct fetch response:', record);

      console.log('✅ Updated energy points to:', points, 'Record:', record);
      return record as EnergyData;
    } catch (error) {
      console.error('Error updating energy points:', error);
      if (error instanceof ClientResponseError) {
        console.error('PocketBase error status:', error.status);
        if (error.data) {
          console.error('PocketBase error data:', JSON.stringify(error.data, null, 2));
        }
        if (error.response) {
          console.error('PocketBase error response:', error.response);
        }
      }
      throw error;
    }
  }

  // Add energy points
  async addEnergyPoints(points: number, userId?: string): Promise<EnergyData> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) {
        throw new Error('No user ID available');
      }

      // Ensure points is a positive integer
      const pointsToAdd = Math.floor(Math.abs(points));

      // Get current energy
      const currentEnergy = await this.getUserEnergy(user);
      const currentPoints = currentEnergy?.points || 0;
      const newPoints = currentPoints + pointsToAdd;

      return await this.updateEnergyPoints(newPoints, user);
    } catch (error) {
      console.error('Error adding energy points:', error);
      throw error;
    }
  }

  // Subtract energy points
  async subtractEnergyPoints(points: number, userId?: string): Promise<EnergyData> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) {
        console.error('❌ No user ID available for energy subtraction');
        throw new Error('No user ID available');
      }

      console.log('🔄 Subtracting energy points:', points, 'for user:', user);
      console.log('🔐 Auth state:', {
        isAuthenticated: this.pb.authStore.isValid,
        userId: this.pb.authStore.model?.id,
        userEmail: this.pb.authStore.model?.email
      });

      // Ensure points is an integer
      const pointsToSubtract = Math.floor(Math.abs(points));
      console.log('📊 Points to subtract (integer):', pointsToSubtract);

      // Get current energy
      console.log('🔍 Getting current energy for user:', user);
      const currentEnergy = await this.getUserEnergy(user);
      console.log('📊 Current energy record:', currentEnergy);

      if (!currentEnergy) {
        console.error('❌ No energy record found for user:', user);
        throw new Error('No energy record found for user');
      }

      const currentPoints = currentEnergy?.points || 0;
      console.log('📊 Current points:', currentPoints);

      const newPoints = Math.max(0, Math.floor(currentPoints - pointsToSubtract)); // Prevent negative points, ensure integer
      console.log('📊 New points after subtraction:', newPoints);

      // Validate that newPoints is a valid number
      if (isNaN(newPoints) || !isFinite(newPoints)) {
        console.error('❌ Invalid newPoints calculated:', newPoints, 'currentPoints:', currentPoints, 'pointsToSubtract:', pointsToSubtract);
        throw new Error('Invalid energy points calculation');
      }

      console.log('📝 Updating energy points to:', newPoints);
      const result = await this.updateEnergyPoints(newPoints, user);
      console.log('✅ Energy subtraction completed:', result);
      return result;
    } catch (error) {
      console.error('Error subtracting energy points:', error);
      throw error;
    }
  }

  // -------------------- Items/Inventory management --------------------

  // Add item to user inventory
  async addItemToInventory(itemData: ItemCreateData, userId?: string): Promise<ItemData> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) {
        throw new Error('No user ID available');
      }

      const data = {
        ...itemData,
        user_id: user,
        quantity: itemData.quantity || 1,
        purchased_at: new Date().toISOString()
      };

      const record = await this.pb.collection(COLLECTIONS.ITEMS).create(data);
      console.log('✅ Added item to inventory:', record.item_name);
      return record as ItemData;
    } catch (error) {
      console.error('❌ Error adding item to inventory:', error);
      throw error;
    }
  }

  // Get user inventory
  async getUserInventory(userId?: string): Promise<ItemData[]> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return [];

      const records = await this.pb.collection(COLLECTIONS.ITEMS)
        .getList(1, 100, {
          filter: `user_id = "${user}"`,
          sort: '-purchased_at'
        });

      console.log('✅ Loaded user inventory:', records.items.length, 'items');
      return records.items as ItemData[];
    } catch (error) {
      console.error('❌ Error getting user inventory:', error);
      return [];
    }
  }

  // Check if user owns specific item
  async userOwnsItem(itemId: string, userId?: string): Promise<boolean> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return false;

      const records = await this.pb.collection(COLLECTIONS.ITEMS)
        .getList(1, 1, {
          filter: `user_id = "${user}" && item_id = "${itemId}"`
        });

      return records.items.length > 0;
    } catch (error) {
      console.error('❌ Error checking item ownership:', error);
      return false;
    }
  }

  // Update item quantity
  async updateItemQuantity(itemId: string, newQuantity: number, userId?: string): Promise<ItemData | null> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return null;

      // Find the item
      const records = await this.pb.collection(COLLECTIONS.ITEMS)
        .getList(1, 1, {
          filter: `user_id = "${user}" && item_id = "${itemId}"`
        });

      if (records.items.length === 0) return null;

      const item = records.items[0];
      const updated = await this.pb.collection(COLLECTIONS.ITEMS).update(item.id, {
        quantity: Math.max(0, newQuantity)
      });

      console.log('✅ Updated item quantity:', item.item_name, '->', newQuantity);
      return updated as ItemData;
    } catch (error) {
      console.error('❌ Error updating item quantity:', error);
      return null;
    }
  }

  // Remove item from inventory
  async removeItemFromInventory(itemId: string, userId?: string): Promise<boolean> {
    try {
      const user = userId || this.pb.authStore.model?.id;
      if (!user) return false;

      // Find the item
      const records = await this.pb.collection(COLLECTIONS.ITEMS)
        .getList(1, 1, {
          filter: `user_id = "${user}" && item_id = "${itemId}"`
        });

      if (records.items.length === 0) return false;

      await this.pb.collection(COLLECTIONS.ITEMS).delete(records.items[0].id);
      console.log('✅ Removed item from inventory:', records.items[0].item_name);
      return true;
    } catch (error) {
      console.error('❌ Error removing item from inventory:', error);
      return false;
    }
  }

  // -------------------- Shop items management --------------------

  // Get all enabled shop items
  async getShopItems(): Promise<ShopItemData[]> {
    try {
      const records = await this.pb.collection(COLLECTIONS.SHOP_ITEMS)
        .getList(1, 100, {
          filter: 'is_enabled = true',
          sort: 'sort_order,created'
        });

      console.log('✅ Loaded shop items:', records.items.length, 'enabled items');
      return records.items as ShopItemData[];
    } catch (error) {
      console.error('❌ Error getting shop items:', error);
      return [];
    }
  }

  // Get shop item by item_id
  async getShopItemById(itemId: string): Promise<ShopItemData | null> {
    try {
      const records = await this.pb.collection(COLLECTIONS.SHOP_ITEMS)
        .getList(1, 1, {
          filter: `item_id = "${itemId}" && is_enabled = true`
        });

      return records.items.length > 0 ? records.items[0] as ShopItemData : null;
    } catch (error) {
      console.error('❌ Error getting shop item:', error);
      return null;
    }
  }

  // Create new shop item (admin only)
  async createShopItem(shopItemData: ShopItemCreateData): Promise<ShopItemData> {
    try {
      const data = {
        ...shopItemData,
        is_enabled: shopItemData.is_enabled !== undefined ? shopItemData.is_enabled : true,
        sort_order: shopItemData.sort_order || 0
      };

      const record = await this.pb.collection(COLLECTIONS.SHOP_ITEMS).create(data);
      console.log('✅ Created shop item:', record.name);
      return record as ShopItemData;
    } catch (error) {
      console.error('❌ Error creating shop item:', error);
      throw error;
    }
  }

  // Update shop item (admin only)
  async updateShopItem(itemId: string, updateData: Partial<ShopItemCreateData>): Promise<ShopItemData | null> {
    try {
      // First find the record by item_id
      const records = await this.pb.collection(COLLECTIONS.SHOP_ITEMS)
        .getList(1, 1, {
          filter: `item_id = "${itemId}"`
        });

      if (records.items.length === 0) return null;

      const record = records.items[0];
      const updated = await this.pb.collection(COLLECTIONS.SHOP_ITEMS).update(record.id, updateData);
      console.log('✅ Updated shop item:', updated.name);
      return updated as ShopItemData;
    } catch (error) {
      console.error('❌ Error updating shop item:', error);
      return null;
    }
  }

  // Delete shop item (admin only)
  async deleteShopItem(itemId: string): Promise<boolean> {
    try {
      // First find the record by item_id
      const records = await this.pb.collection(COLLECTIONS.SHOP_ITEMS)
        .getList(1, 1, {
          filter: `item_id = "${itemId}"`
        });

      if (records.items.length === 0) return false;

      await this.pb.collection(COLLECTIONS.SHOP_ITEMS).delete(records.items[0].id);
      console.log('✅ Deleted shop item:', records.items[0].name);
      return true;
    } catch (error) {
      console.error('❌ Error deleting shop item:', error);
      return false;
    }
  }

  // Get all shop items (admin only - including disabled ones)
  async getAllShopItems(): Promise<ShopItemData[]> {
    try {
      const records = await this.pb.collection(COLLECTIONS.SHOP_ITEMS)
        .getList(1, 100, {
          sort: 'sort_order,created'
        });

      console.log('✅ Loaded all shop items:', records.items.length, 'total items');
      return records.items as ShopItemData[];
    } catch (error) {
      console.error('❌ Error getting all shop items:', error);
      return [];
    }
  }

  // -------------------- Room management (PocketBase-backed) --------------------
  // Rooms are stored in a 'rooms' collection. Each room record structure:
  // {
  //   name, host_player_id, players: [{id, name, isHost}], player_count, spectator_count,
  //   settings: {...}, status, created_at, updated_at, last_activity
  // }

  async createRoom(roomName: string, hostId: string, hostName: string, settings: any = {}): Promise<any> {
    try {
      // Verify requester is the authenticated user
      const currentUserId = this.pb.authStore.model?.id;
      if (currentUserId && currentUserId !== hostId) {
        throw new Error('Authenticated user does not match hostId');
      }

      // CRITICAL: Verify that the host user actually exists in the database
      // This prevents creating rooms with non-existent owners
      try {
        const hostUser = await this.pb.collection('users').getOne(hostId);
        if (!hostUser) {
          throw new Error(`Host user ${hostId} does not exist in database`);
        }
        console.log('✅ Verified host user exists:', hostUser.email);
      } catch (userError) {
        console.error('❌ Host user validation failed:', userError);
        throw new Error(`Cannot create room: Host user does not exist or is not accessible`);
      }

      const data = {
        name: roomName,
        owner_id: hostId, // Changed from host_player_id to owner_id
        members: [hostId], // Changed from players array to members array
        status: 'waiting',
        max_members: settings.maxMembers || settings.maxPlayers || 4,
        game_type: settings.gameType || settings.gameMode || 'rune',
        settings: settings, // Store settings in settings json field
        is_private: settings.isPrivate || settings.hasPassword || false,
        password: settings.password || (settings.hasPassword ? 'default_password' : null),
        description: settings.description || ''
      };

      const record = await this.pb.collection('rooms').create(data);
      console.log('✅ Created room in PocketBase:', record.id);
      return record;
    } catch (error) {
      console.error('❌ Error creating room in PocketBase:', error);
      throw error;
    }
  }

  async listRooms(filter?: any): Promise<any[]> {
    try {
      // Simple pagination - load first 100 rooms matching optional filters
      const params: any = { page: 1, perPage: 100 };
      if (filter) {
        // Build PocketBase filter string if provided
        // Example filter keys: gameMode, state
        const filters: string[] = [];
        if (filter.gameMode && ['rune', 'bote'].includes(filter.gameMode)) filters.push(`game_type = \"${filter.gameMode}\"`);
        if (filter.state) filters.push(`status = \"${filter.state}\"`);
        if (filters.length > 0) params.filter = filters.join(' && ');
      }

      const records = await this.pb.collection('rooms').getList(params.page, params.perPage, { filter: params.filter, sort: '-updated' });
      return records.items;
    } catch (error) {
      console.error('❌ Error listing rooms from PocketBase:', error);
      return [];
    }
  }

  async joinRoomAsPlayer(roomId: string, player: { id: string; name: string; isHost?: boolean }): Promise<any> {
    try {
      // Verify the requester is the authenticated user when joining as the given player id
      const currentUserId = this.pb.authStore.model?.id;
      if (currentUserId && currentUserId !== player.id) {
        throw new Error('Authenticated user does not match player id');
      }

      const room = await this.pb.collection('rooms').getOne(roomId);
      if (!room) throw new Error('Room not found');

      const players = Array.isArray(room.players) ? [...room.players] : [];
      if (players.find(p => p.id === player.id)) {
        // already in room
        return room;
      }

      players.push({ id: player.id, name: player.name, isHost: !!player.isHost });
      const updated = await this.pb.collection('rooms').update(roomId, {
        players,
        player_count: players.length,
        updated_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      });

      return updated;
    } catch (error) {
      console.error('❌ Error joining room as player:', error);
      throw error;
    }
  }

  async leaveRoom(roomId: string, playerId: string): Promise<any> {
    try {
      // Verify the requester matches playerId
      const currentUserId = this.pb.authStore.model?.id;
      if (currentUserId && currentUserId !== playerId) {
        throw new Error('Authenticated user does not match player id');
      }

      const room = await this.pb.collection('rooms').getOne(roomId);
      if (!room) throw new Error('Room not found');

      let ownerId = room.owner_id;
      let members = Array.isArray(room.members) ? room.members : [];

      // Check if player is owner or member
      const isOwner = ownerId === playerId;
      const isMember = members.includes(playerId);

      if (!isOwner && !isMember) throw new Error('Player not in room');

      // If owner is leaving, set owner to null (PocketBase hooks will handle the rest)
      if (isOwner) {
        ownerId = null;
      } else {
        // Remove from members
        members = members.filter(member => member !== playerId);
      }

      const updated = await this.pb.collection('rooms').update(roomId, {
        owner_id: ownerId,
        members: members
      });

      return updated;
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      throw error;
    }
  }

  async kickPlayer(roomId: string, requesterId: string, targetPlayerId: string): Promise<any> {
    try {
      // Verify requester identity
      const currentUserId = this.pb.authStore.model?.id;
      if (currentUserId && currentUserId !== requesterId) {
        throw new Error('Authenticated user does not match requesterId');
      }

      const room = await this.pb.collection('rooms').getOne(roomId);
      if (!room) throw new Error('Room not found');
      if (room.owner_id !== requesterId) throw new Error('Only owner can kick players');
      if (targetPlayerId === requesterId) throw new Error('Cannot kick yourself');

      const members = Array.isArray(room.members) ? room.members.filter(member => member !== targetPlayerId) : [];

      const updated = await this.pb.collection('rooms').update(roomId, {
        members: members
      });

      return updated;
    } catch (error) {
      console.error('❌ Error kicking player:', error);
      throw error;
    }
  }

  async updateRoomSettings(roomId: string, settings: any): Promise<any> {
    try {
      const updateData: any = {};

      // Also update game_type field if gameType or gameMode is provided
      if (settings.gameType || settings.gameMode) {
        updateData.game_type = settings.gameType || settings.gameMode;
      }

      // Update settings field with new values
      updateData.settings = settings;

      const updated = await this.pb.collection('rooms').update(roomId, updateData);
      return updated;
    } catch (error) {
      console.error('❌ Error updating room settings:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const pocketbaseService = new PocketBaseService();

// Export types and constants for use in components
export { WALLET_TYPES, NETWORK_TYPES };
