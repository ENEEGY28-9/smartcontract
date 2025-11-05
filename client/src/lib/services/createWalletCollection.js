// Script to create wallet collection in PocketBase
// Run this in browser console when PocketBase admin is open

const createWalletCollection = async () => {
  try {
    // PocketBase admin API endpoint
    const PB_URL = 'http://localhost:8090';

    // Wallet collection schema
    const walletSchema = {
      name: 'wallets',
      schema: [
        {
          name: 'user_id',
          type: 'relation',
          required: false,
          options: {
            collectionId: 'users',
            cascadeDelete: false,
            minSelect: null,
            maxSelect: 1
          }
        },
        {
          name: 'address',
          type: 'text',
          required: true,
          options: {
            maxSize: 200
          }
        },
        {
          name: 'private_key',
          type: 'text',
          required: false,
          options: {
            maxSize: 2000
          }
        },
        {
          name: 'mnemonic',
          type: 'text',
          required: false,
          options: {
            maxSize: 1000
          }
        },
        {
          name: 'wallet_type',
          type: 'select',
          required: true,
          options: {
            values: ['metamask', 'phantom', 'generated', 'sui', 'other']
          }
        },
        {
          name: 'network',
          type: 'select',
          required: true,
          options: {
            values: ['ethereum', 'solana', 'sui']
          }
        },
        {
          name: 'balance',
          type: 'number',
          required: false,
          options: {
            min: 0
          }
        },
        {
          name: 'balance_last_updated',
          type: 'date',
          required: false
        },
        {
          name: 'is_connected',
          type: 'bool',
          required: false
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
          options: {
            maxSize: 1000
          }
        }
      ],
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '@request.auth.id != ""',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id'
    };

    // Create the collection via PocketBase admin API
    const response = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You may need to add admin authentication header here
        // 'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
      },
      body: JSON.stringify(walletSchema)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Wallet collection created successfully:', result);
      return result;
    } else {
      const error = await response.text();
      console.error('❌ Failed to create wallet collection:', error);
      throw new Error(error);
    }
  } catch (error) {
    console.error('❌ Error creating wallet collection:', error);
    throw error;
  }
};

// Also create users collection if it doesn't exist
const createUsersCollection = async () => {
  try {
    const PB_URL = 'http://localhost:8090';

    const userSchema = {
      name: 'users',
      schema: [
        {
          name: 'email',
          type: 'email',
          required: true,
          options: {
            "exceptDomains": [],
            "onlyDomains": []
          }
        },
        {
          name: 'name',
          type: 'text',
          required: false,
          options: {
            maxSize: 200
          }
        },
        {
          name: 'avatar',
          type: 'file',
          required: false,
          options: {
            maxSize: 5242880,
            mimeTypes: ["image/jpeg", "image/png", "image/gif"],
            thumbs: []
          }
        }
      ],
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null
    };

    const response = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userSchema)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Users collection created successfully:', result);
      return result;
    } else {
      const error = await response.text();
      console.error('❌ Failed to create users collection:', error);
      // Don't throw error if collection already exists
    }
  } catch (error) {
    console.error('❌ Error creating users collection:', error);
  }
};

// Function to setup all collections
export const setupCollections = async () => {
  console.log('🚀 Setting up PocketBase collections...');

  try {
    await createUsersCollection();
    await createWalletCollection();
    console.log('✅ All collections setup complete!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
};

// Function to update existing wallet collection schema
export const updateWalletCollection = async () => {
  try {
    const PB_URL = 'http://localhost:8090';

    // First, get the current collection
    const getResponse = await fetch(`${PB_URL}/api/collections/wallets`);
    if (!getResponse.ok) {
      throw new Error('Could not fetch wallet collection');
    }

    const currentCollection = await getResponse.json();

    // Update the schema to include 'sui' network
    const updatedSchema = {
      ...currentCollection,
      schema: currentCollection.schema.map(field => {
        if (field.name === 'network') {
          return {
            ...field,
            options: {
              ...field.options,
              values: ['ethereum', 'solana', 'sui']
            }
          };
        }
        if (field.name === 'wallet_type') {
          return {
            ...field,
            options: {
              ...field.options,
              values: ['metamask', 'phantom', 'generated', 'sui', 'other']
            }
          };
        }
        return field;
      })
    };

    // Update the collection
    const updateResponse = await fetch(`${PB_URL}/api/collections/wallets`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedSchema)
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ Wallet collection updated successfully:', result);
      return result;
    } else {
      const error = await updateResponse.text();
      console.error('❌ Failed to update wallet collection:', error);
      throw new Error(error);
    }
  } catch (error) {
    console.error('❌ Error updating wallet collection:', error);
    throw error;
  }
};

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  window.setupPocketBaseCollections = setupCollections;
  window.updateWalletCollection = updateWalletCollection;
  console.log('📝 Run updateWalletCollection() in the console to update the wallet collection schema');
  console.log('📝 Or run setupPocketBaseCollections() to create collections if they don\'t exist');
}
