<script>
  import { onMount } from 'svelte';
  import { ShoppingBag } from 'lucide-svelte';
  import { pocketbaseService } from '$lib/services/pocketbaseService';

  // Authentication state
  let isAuthenticated = false;
  let currentUser = null;
  let userEnergy = null;

  // Shop items data (same as in shop page)
  let shopItems = [
    {
      id: 'boost_pack',
      name: 'Boost Pack',
      description: 'Instant speed boost for 10 seconds',
      price: 50,
      icon: '🚀',
      category: 'powerups'
    },
    {
      id: 'energy_refill',
      name: 'Energy Refill',
      description: 'Restore full energy instantly',
      price: 100,
      icon: '⚡',
      category: 'consumables'
    },
    {
      id: 'pet_upgrade',
      name: 'Pet Upgrade',
      description: 'Make your pet glow brighter',
      price: 200,
      icon: '🐾',
      category: 'cosmetics'
    },
    {
      id: 'skin_blue',
      name: 'Blue Player Skin',
      description: 'Change your character color to blue',
      price: 300,
      icon: '🔵',
      category: 'cosmetics'
    },
    {
      id: 'skin_red',
      name: 'Red Player Skin',
      description: 'Change your character color to red',
      price: 300,
      icon: '🔴',
      category: 'cosmetics'
    },
    {
      id: 'double_score',
      name: 'Double Score',
      description: 'Earn double points for 30 seconds',
      price: 150,
      icon: '💰',
      category: 'powerups'
    },
    {
      id: 'shield',
      name: 'Shield',
      description: 'Protect against one obstacle hit',
      price: 75,
      icon: '🛡️',
      category: 'powerups'
    },
    {
      id: 'pet_green',
      name: 'Green Pet',
      description: 'Change your pet color to green',
      price: 250,
      icon: '🟢',
      category: 'cosmetics'
    },
    {
      id: 'energy_gloves',
      name: 'Energy Gloves',
      description: 'Shoot energy blasts to clear obstacles',
      price: 400,
      icon: '🧤',
      category: 'powerups'
    },
    {
      id: 'boom',
      name: 'Boom',
      description: 'Explosive power-up for massive destruction',
      price: 350,
      icon: '💥',
      category: 'consumables'
    },
    {
      id: 'hoverboard',
      name: 'Hoverboard',
      description: 'Ride on air with this futuristic board',
      price: 600,
      icon: '🛼',
      category: 'cosmetics'
    },
    {
      id: 'spider_pet',
      name: 'Spider Pet',
      description: 'A loyal spider companion that follows you',
      price: 450,
      icon: '🕷️',
      category: 'cosmetics'
    }
  ];

  // Purchased items - load from PocketBase
  let purchasedItems = [];
  let ownedItemsFromDB = [];

  // Filter and search
  let selectedCategory = 'all';
  let searchQuery = '';

  // Load purchased items from PocketBase
  async function loadPurchasedItems() {
    if (isAuthenticated && currentUser) {
      try {
        // Load from PocketBase
        ownedItemsFromDB = await pocketbaseService.getUserInventory();
        // Extract item IDs for backward compatibility
        purchasedItems = ownedItemsFromDB.map(item => item.item_id);
        console.log('✅ Loaded items from PocketBase:', ownedItemsFromDB.length, 'items');
      } catch (error) {
        console.error('❌ Failed to load items from PocketBase, falling back to localStorage:', error);
        // Fallback to localStorage
        loadFromLocalStorage();
      }
    } else {
      // Not authenticated - use localStorage
      loadFromLocalStorage();
    }
  }

  // Fallback function to load from localStorage
  function loadFromLocalStorage() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('purchasedItems');
      if (stored) {
        purchasedItems = JSON.parse(stored);
      }
    }
  }

  // Save purchased items to localStorage (fallback only)
  function savePurchasedItems() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('purchasedItems', JSON.stringify(purchasedItems));
    }
  }

  // Listen for purchase events from shop page
  async function handlePurchaseEvent(event) {
    if (event.detail && event.detail.itemId) {
      if (isAuthenticated) {
        // Reload from PocketBase to get updated inventory
        await loadPurchasedItems();
      } else {
        // Fallback to localStorage behavior
        purchasedItems = [...purchasedItems, event.detail.itemId];
        savePurchasedItems();
      }
    }
  }

  $: ownedItems = shopItems.filter(item => purchasedItems.includes(item.id));

  $: filteredItems = ownedItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function getCategoryIcon(category) {
    const icons = {
      powerups: '⚡',
      consumables: '💊',
      cosmetics: '🎨'
    };
    return icons[category] || '📦';
  }

  onMount(async () => {
    console.log('🛍️ Bag page loaded');
    await checkAuthState(); // Check auth first
    await loadPurchasedItems(); // Then load items

    // Listen for auth changes
    if (typeof window !== 'undefined') {
      window.addEventListener('pocketbase-auth-success', async () => {
        await checkAuthState();
        await loadPurchasedItems();
      });
      window.addEventListener('pocketbase-auth-logout', async () => {
        await checkAuthState();
        await loadPurchasedItems();
      });
      window.addEventListener('item-purchased', handlePurchaseEvent);
    }
  });

  async function checkAuthState() {
    try {
      const wasAuthenticated = isAuthenticated;
      isAuthenticated = pocketbaseService.isAuthenticated();
      currentUser = pocketbaseService.getCurrentUser();

      if (isAuthenticated) {
        // Load user energy
        userEnergy = await pocketbaseService.getUserEnergy();
      }

      // Reload items if auth state changed
      if (wasAuthenticated !== isAuthenticated) {
        await loadPurchasedItems();
      }
    } catch (error) {
      console.error('❌ Error checking auth state:', error);
    }
  }
</script>

<svelte:head>
  <title>ENEEGY Bag - Your Purchased Items</title>
  <meta name="description" content="View and manage your purchased items from ENEEGY shop" />
</svelte:head>

<div class="bag-page">
  {#if !isAuthenticated}
    <!-- Not Logged In Message -->
    <div class="auth-message">
      <div class="auth-icon">
        <ShoppingBag />
      </div>
      <h2>Vui lòng đăng nhập</h2>
      <p>Đăng nhập để xem túi đồ của bạn</p>
    </div>
  {:else}
    <!-- Bag Header -->
    <div class="bag-header">
      <div class="header-left">
        <h1>Your Bag</h1>
        <div class="items-count">
          <span class="count-icon">📦</span>
          <span class="count-text">{ownedItems.length} items</span>
        </div>
      </div>
    </div>

    {#if ownedItems.length > 0}
      <!-- Filters -->
      <div class="bag-filters">
        <input
          type="text"
          placeholder="Tìm kiếm items..."
          bind:value={searchQuery}
          class="search-input"
        />

        <div class="category-buttons">
          <button
            class="filter-btn"
            class:active={selectedCategory === 'all'}
            on:click={() => selectedCategory = 'all'}
          >
            Tất cả
          </button>
          <button
            class="filter-btn"
            class:active={selectedCategory === 'powerups'}
            on:click={() => selectedCategory = 'powerups'}
          >
            Power-ups
          </button>
          <button
            class="filter-btn"
            class:active={selectedCategory === 'consumables'}
            on:click={() => selectedCategory = 'consumables'}
          >
            Consumables
          </button>
          <button
            class="filter-btn"
            class:active={selectedCategory === 'cosmetics'}
            on:click={() => selectedCategory = 'cosmetics'}
          >
            Cosmetics
          </button>
        </div>
      </div>

      <!-- Bag Items -->
      {#if filteredItems.length > 0}
        <div class="bag-grid">
          {#each filteredItems as item}
            <div class="bag-item">
              <div class="item-icon">{item.icon}</div>

              <div class="item-info">
                <h3 class="item-name">{item.name}</h3>
                <p class="item-description">{item.description}</p>
                <div class="item-category">
                  <span class="category-icon">{getCategoryIcon(item.category)}</span>
                  <span class="category-name">{item.category}</span>
                </div>
              </div>

              <div class="item-actions">
                <button class="use-btn">Sử dụng</button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <h3>Không tìm thấy items</h3>
          <button class="reset-btn" on:click={() => { selectedCategory = 'all'; searchQuery = ''; }}>
            Đặt lại
          </button>
        </div>
      {/if}
    {:else}
      <!-- Empty Bag -->
      <div class="empty-bag">
        <div class="empty-icon">
          <ShoppingBag />
        </div>
        <h2>Túi đồ trống</h2>
        <p>Bạn chưa mua item nào. Hãy ghé thăm cửa hàng để mua sắm!</p>
        <a href="/shop" class="shop-link">Đi đến Shop</a>
      </div>
    {/if}
  {/if}
</div>

<style>
  .bag-page {
    min-height: 100vh;
    background: #000000;
    font-family: 'Poppins', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #ffffff;
    padding: 1rem;
  }

  /* Auth Message */
  .auth-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }

  .auth-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .auth-message h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #ffffff;
  }

  .auth-message p {
    color: #b0b0b0;
  }

  /* Bag Header */
  .bag-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 1rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 1rem;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  .bag-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: #ffffff;
    line-height: 1;
  }

  .items-count {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .count-icon {
    font-size: 1.2rem;
  }

  .count-text {
    font-weight: 600;
    color: #ffffff;
    line-height: 1;
  }

  /* Filters */
  .bag-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .search-input {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #ffffff;
    font-size: 1rem;
    min-width: 200px;
    flex: 1;
  }

  .search-input:focus {
    outline: none;
    border-color: #446bff;
  }

  .search-input::placeholder {
    color: #808080;
  }

  .category-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #b0b0b0;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .filter-btn.active {
    background: #ffffff;
    color: #000000;
    font-weight: 600;
  }

  /* Bag Grid */
  .bag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .bag-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .bag-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .item-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: #ffffff;
  }

  .item-description {
    color: #b0b0b0;
    font-size: 0.85rem;
    line-height: 1.3;
    margin-bottom: 0.5rem;
  }

  .item-category {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: #808080;
  }

  .category-icon {
    font-size: 0.9rem;
  }

  .item-actions {
    flex-shrink: 0;
  }

  .use-btn {
    padding: 0.5rem 1rem;
    background: #446bff;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .use-btn:hover {
    background: #3658cc;
    transform: translateY(-1px);
  }

  /* Empty Bag */
  .empty-bag {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    text-align: center;
    padding: 2rem;
  }

  .empty-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .empty-bag h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #ffffff;
  }

  .empty-bag p {
    color: #b0b0b0;
    margin-bottom: 1.5rem;
    max-width: 400px;
  }

  .shop-link {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #ffffff;
    color: #000000;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .shop-link:hover {
    background: #f0f0f0;
    transform: translateY(-1px);
  }

  /* No Results */
  .no-results {
    text-align: center;
    padding: 3rem 1rem;
    color: #b0b0b0;
  }

  .no-results-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .no-results h3 {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: #ffffff;
  }

  .reset-btn {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .bag-page {
      padding: 0.5rem;
    }

    .bag-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .header-left {
      gap: 0.75rem;
      align-items: baseline;
    }

    .bag-header h1 {
      font-size: 1.5rem;
    }

    .bag-filters {
      flex-direction: column;
      gap: 1rem;
    }

    .search-input {
      min-width: auto;
    }

    .category-buttons {
      justify-content: center;
    }

    .bag-grid {
      grid-template-columns: 1fr;
    }

    .bag-item {
      flex-direction: column;
      text-align: center;
      gap: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .bag-header h1 {
      font-size: 1.25rem;
    }

    .header-left {
      gap: 0.5rem;
      align-items: baseline;
    }

    .items-count {
      padding: 0.4rem 0.75rem;
    }

    .category-buttons {
      flex-direction: column;
      width: 100%;
    }

    .filter-btn {
      flex: 1;
      text-align: center;
    }

    .empty-bag {
      padding: 1rem;
    }

    .empty-icon {
      font-size: 3rem;
    }
  }
</style>
