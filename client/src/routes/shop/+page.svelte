<script>
  import { onMount } from 'svelte';
  import { ShoppingCart, Zap } from 'lucide-svelte';
  import { pocketbaseService } from '$lib/services/pocketbaseService';

  // Authentication state
  let isAuthenticated = false;
  let currentUser = null;
  let userEnergy = null;


  // Shop items data - loaded from PocketBase
  let shopItems = [];
  let isLoadingShopItems = true;

  // Player currency (mock data - in real app this would come from server)
  let playerCurrency = 500;
  let playerScore = 1250;

  // Filter and search
  let selectedCategory = 'all';
  let searchQuery = '';

  // Purchase modal
  let showPurchaseModal = false;
  let selectedItem = null;

  // Purchased items - load from database
  let purchasedItems = [];

  // Load purchased items from database
  async function loadPurchasedItems() {
    if (isAuthenticated && currentUser) {
      try {
        // Load from database
        const inventoryItems = await pocketbaseService.getUserInventory();
        // Extract item IDs for compatibility
        purchasedItems = inventoryItems.map(item => item.item_id);
        console.log('✅ Loaded purchased items from database:', purchasedItems.length, 'items');
      } catch (error) {
        console.error('❌ Failed to load purchased items from database, falling back to localStorage:', error);
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

  // Save purchased items to localStorage
  function savePurchasedItems() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('purchasedItems', JSON.stringify(purchasedItems));
    }
  }

  $: filteredItems = shopItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function buyItem(item) {
    selectedItem = item;
    showPurchaseModal = true;
  }

  async function confirmPurchase() {
    if (selectedItem && playerCurrency >= selectedItem.price) {
      try {
        // Deduct energy points from database
        if (isAuthenticated && userEnergy) {
          await pocketbaseService.subtractEnergyPoints(selectedItem.price);
          console.log(`✅ Deducted ${selectedItem.price} energy points`);

          // Update local currency
          playerCurrency -= selectedItem.price;

          // Reload energy to sync
          userEnergy = await pocketbaseService.getUserEnergy();
          if (userEnergy) {
            playerCurrency = userEnergy.points || 0;
          }
        } else {
          // Offline mode
          playerCurrency -= selectedItem.price;
        }

        // Save item to PocketBase inventory (if authenticated)
        if (isAuthenticated) {
          try {
            await pocketbaseService.addItemToInventory({
              item_id: selectedItem.id,
              item_name: selectedItem.name,
              category: selectedItem.category,
              icon: selectedItem.icon,
              quantity: 1,
              purchase_price: selectedItem.price
            });
            console.log('✅ Item saved to PocketBase inventory');
          } catch (error) {
            console.error('❌ Failed to save item to inventory:', error);
            // Fallback to localStorage if PocketBase fails
            purchasedItems.push(selectedItem.id);
            savePurchasedItems();
          }
        } else {
          // Offline mode - use localStorage
          purchasedItems.push(selectedItem.id);
          savePurchasedItems();
        }

        // Dispatch event to notify bag page
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('item-purchased', {
            detail: { itemId: selectedItem.id, item: selectedItem }
          }));
        }

        console.log(`✅ Purchased ${selectedItem.name} for ${selectedItem.price} E`);
        showPurchaseModal = false;
        selectedItem = null;
      } catch (error) {
        console.error('❌ Purchase failed:', error);
        alert('Mua hàng thất bại. Vui lòng thử lại.');
      }
    }
  }

  function cancelPurchase() {
    showPurchaseModal = false;
    selectedItem = null;
  }

  // Listen for purchase events (from bag page or other sources)
  async function handlePurchaseEvent(event) {
    if (event.detail && event.detail.itemId) {
      if (isAuthenticated) {
        // Reload from database to get updated inventory
        await loadPurchasedItems();
      } else {
        // Fallback to localStorage behavior
        purchasedItems = [...purchasedItems, event.detail.itemId];
        savePurchasedItems();
      }
    }
  }

  function isItemPurchased(itemId) {
    return purchasedItems.includes(itemId);
  }


  // Load shop items from PocketBase
  async function loadShopItems() {
    try {
      isLoadingShopItems = true;
      console.log('📦 Loading shop items from PocketBase...');

      const items = await pocketbaseService.getShopItems();
      shopItems = items.map(item => ({
        id: item.item_id,
        name: item.name,
        description: item.description,
        price: item.price,
        icon: item.icon,
        category: item.category
      }));

      console.log('✅ Loaded', shopItems.length, 'shop items from database');
    } catch (error) {
      console.error('❌ Failed to load shop items from database:', error);
      // Fallback to hardcoded items if database fails
      console.log('🔄 Falling back to hardcoded shop items...');
      shopItems = [
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
        }
      ];
      console.log('✅ Loaded fallback shop items');
    } finally {
      isLoadingShopItems = false;
    }
  }

  onMount(async () => {
    console.log('🛒 Shop page loaded');
    await loadShopItems(); // Load shop items first
    await checkAuthState(); // Check auth first
    await loadPurchasedItems(); // Then load purchased items

    // Listen for auth changes and purchase events
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
        if (userEnergy) {
          playerCurrency = userEnergy.points || 0;
          console.log('💰 User energy points:', playerCurrency);
        }
      }

      // Reload purchased items if auth state changed
      if (wasAuthenticated !== isAuthenticated) {
        await loadPurchasedItems();
      }
    } catch (error) {
      console.error('❌ Error checking auth state:', error);
    }
  }
</script>

<svelte:head>
  <title>ENEEGY Shop - Upgrade Your Gaming Experience</title>
  <meta name="description" content="Buy power-ups, cosmetics, and consumables for ENEEGY games" />
</svelte:head>

<div class="shop-page">
  {#if !isAuthenticated}
    <!-- Not Logged In Message -->
    <div class="auth-message">
      <div class="auth-icon">
        <ShoppingCart />
      </div>
      <h2>Vui lòng đăng nhập</h2>
      <p>Bạn cần đăng nhập để mua items trong shop</p>
    </div>
  {:else}
    <!-- Shop Header -->
    <div class="shop-header">
      <div class="header-left">
        <h1>Shop</h1>

        <!-- Player Currency -->
        <div class="player-currency">
          <Zap class="currency-icon" />
          <span class="currency-amount">{playerCurrency} E</span>
        </div>
      </div>

    </div>

    <!-- Filters -->
    <div class="shop-filters">
      <input
        type="text"
        placeholder="Tìm kiếm..."
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

    <!-- Loading Shop Items -->
    {#if isLoadingShopItems}
      <div class="loading-shop">
        <div class="loading-spinner"></div>
        <p>Đang tải cửa hàng...</p>
      </div>
    {:else if filteredItems.length > 0}
      <div class="shop-grid">
        {#each filteredItems as item}
          <div class="shop-item" class:purchased={isItemPurchased(item.id)}>
            <div class="item-icon">{item.icon}</div>

            <div class="item-info">
              <h3 class="item-name">{item.name}</h3>
              <p class="item-description">{item.description}</p>
              <div class="item-price">{item.price} E</div>
            </div>

            {#if isItemPurchased(item.id)}
              <div class="owned-badge">✓ Owned</div>
            {:else}
              <button
                class="buy-button"
                disabled={playerCurrency < item.price}
                on:click={() => buyItem(item)}
              >
                {playerCurrency >= item.price ? 'Mua' : 'Không đủ'}
              </button>
            {/if}
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
  {/if}

  <!-- Purchase Modal -->
  {#if showPurchaseModal && selectedItem}
    <div class="modal-overlay" on:click={cancelPurchase}>
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h2>Xác nhận mua hàng</h2>
          <button class="close-btn" on:click={cancelPurchase}>✕</button>
        </div>

        <div class="modal-body">
          <div class="purchase-item">
            <div class="purchase-icon">{selectedItem.icon}</div>
            <div class="purchase-details">
              <h3>{selectedItem.name}</h3>
              <p>{selectedItem.description}</p>
              <div class="purchase-price">{selectedItem.price} E</div>
            </div>
          </div>

          <div class="purchase-summary">
            <div class="summary-row">
              <span>Your Energy:</span>
              <span>{playerCurrency} E</span>
            </div>
            <div class="summary-row">
              <span>Item Price:</span>
              <span>-{selectedItem.price} E</span>
            </div>
            <div class="summary-row total">
              <span>After Purchase:</span>
              <span>{playerCurrency - selectedItem.price} E</span>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="cancel-btn" on:click={cancelPurchase}>Hủy</button>
          <button
            class="confirm-btn"
            on:click={confirmPurchase}
            disabled={playerCurrency < selectedItem.price}
          >
            Xác nhận mua
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .shop-page {
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

  /* Shop Header */
  .shop-header {
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

  .shop-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: #ffffff;
    line-height: 1;
  }

  .player-currency {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .currency-icon {
    font-size: 1.2rem;
  }

  .currency-amount {
    font-weight: 600;
    color: #ffffff;
    line-height: 1;
  }


  /* Filters */
  .shop-filters {
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

  /* Shop Grid */
  .shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .shop-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .shop-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .shop-item.purchased {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.3);
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

  .item-price {
    font-size: 0.9rem;
    font-weight: 600;
    color: #ffffff;
  }

  .buy-button {
    padding: 0.5rem 1rem;
    background: #ffffff;
    border: none;
    border-radius: 6px;
    color: #000000;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .buy-button:hover:not(:disabled) {
    background: #f0f0f0;
    transform: translateY(-1px);
  }

  .buy-button:disabled {
    background: rgba(255, 255, 255, 0.2);
    color: #666666;
    cursor: not-allowed;
  }

  .owned-badge {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.85rem;
    font-weight: 600;
    flex-shrink: 0;
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

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #000000;
    border: 2px solid #ffffff;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    padding: 1.5rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #ffffff;
  }

  .close-btn {
    background: none;
    border: none;
    color: #b0b0b0;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .close-btn:hover {
    color: #ffffff;
  }

  .purchase-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .purchase-icon {
    font-size: 2rem;
  }

  .purchase-details h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffffff;
  }

  .purchase-details p {
    margin: 0 0 0.25rem 0;
    color: #b0b0b0;
    font-size: 0.8rem;
  }

  .purchase-price {
    font-size: 0.9rem;
    font-weight: 600;
    color: #ffffff;
  }

  .purchase-summary {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
    font-size: 0.9rem;
  }

  .summary-row.total {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 0.5rem;
    margin-top: 0.5rem;
    font-weight: 600;
    color: #ffffff;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
  }

  .cancel-btn {
    flex: 1;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .confirm-btn {
    flex: 1;
    padding: 0.75rem;
    background: #ffffff;
    border: none;
    border-radius: 6px;
    color: #000000;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }

  .confirm-btn:hover:not(:disabled) {
    background: #f0f0f0;
  }

  .confirm-btn:disabled {
    background: rgba(255, 255, 255, 0.2);
    color: #666666;
    cursor: not-allowed;
  }

  /* Loading Shop */
  .loading-shop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    gap: 1rem;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333333;
    border-top: 3px solid #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-shop p {
    color: #b0b0b0;
    font-size: 1rem;
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .shop-page {
      padding: 0.5rem;
    }

    .shop-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .header-left {
      gap: 0.75rem;
      align-items: baseline;
    }


    .shop-header h1 {
      font-size: 1.5rem;
    }

    .shop-filters {
      flex-direction: column;
      gap: 1rem;
    }

    .search-input {
      min-width: auto;
    }

    .category-buttons {
      justify-content: center;
    }

    .shop-grid {
      grid-template-columns: 1fr;
    }

    .shop-item {
      flex-direction: column;
      text-align: center;
      gap: 0.75rem;
    }

    .modal-content {
      margin: 1rem;
      padding: 1rem;
    }
  }

  @media (max-width: 480px) {
    .shop-header h1 {
      font-size: 1.25rem;
    }

    .header-left {
      gap: 0.5rem;
      align-items: baseline;
    }

    .player-currency {
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

    .modal-actions {
      flex-direction: column;
    }
  }
</style>