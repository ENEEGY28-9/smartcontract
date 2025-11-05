<script>
  import { onMount } from 'svelte';
  import { pocketbaseService } from '$lib/services/pocketbaseService';

  // Authentication state
  let isAuthenticated = false;
  let currentUser = null;
  let isAdmin = false;

  // Shop items data
  let shopItems = [];
  let isLoading = true;
  let error = null;

  // Modal states
  let showCreateModal = false;
  let showEditModal = false;
  let editingItem = null;

  // Form data
  let formData = {
    item_id: '',
    name: '',
    description: '',
    price: 0,
    icon: '',
    category: 'powerups',
    is_enabled: true,
    sort_order: 0
  };

  // Reset form
  function resetForm() {
    formData = {
      item_id: '',
      name: '',
      description: '',
      price: 0,
      icon: '',
      category: 'powerups',
      is_enabled: true,
      sort_order: 0
    };
  }

  // Load shop items
  async function loadShopItems() {
    try {
      isLoading = true;
      error = null;
      shopItems = await pocketbaseService.getAllShopItems();
      console.log('✅ Loaded', shopItems.length, 'shop items');
    } catch (err) {
      error = err.message;
      console.error('❌ Failed to load shop items:', err);
    } finally {
      isLoading = false;
    }
  }

  // Create new shop item
  async function createShopItem() {
    try {
      await pocketbaseService.createShopItem(formData);
      console.log('✅ Created shop item:', formData.name);
      showCreateModal = false;
      resetForm();
      await loadShopItems();
    } catch (err) {
      error = err.message;
      console.error('❌ Failed to create shop item:', err);
    }
  }

  // Edit shop item
  async function editShopItem(item) {
    editingItem = item;
    formData = {
      item_id: item.item_id,
      name: item.name,
      description: item.description,
      price: item.price,
      icon: item.icon,
      category: item.category,
      is_enabled: item.is_enabled,
      sort_order: item.sort_order
    };
    showEditModal = true;
  }

  // Update shop item
  async function updateShopItem() {
    try {
      await pocketbaseService.updateShopItem(editingItem.item_id, formData);
      console.log('✅ Updated shop item:', formData.name);
      showEditModal = false;
      resetForm();
      editingItem = null;
      await loadShopItems();
    } catch (err) {
      error = err.message;
      console.error('❌ Failed to update shop item:', err);
    }
  }

  // Delete shop item
  async function deleteShopItem(itemId) {
    if (!confirm('Bạn có chắc chắn muốn xóa item này?')) return;

    try {
      await pocketbaseService.deleteShopItem(itemId);
      console.log('✅ Deleted shop item');
      await loadShopItems();
    } catch (err) {
      error = err.message;
      console.error('❌ Failed to delete shop item:', err);
    }
  }

  // Toggle item enabled status
  async function toggleItemStatus(item) {
    try {
      await pocketbaseService.updateShopItem(item.item_id, {
        is_enabled: !item.is_enabled
      });
      console.log('✅ Toggled item status');
      await loadShopItems();
    } catch (err) {
      error = err.message;
      console.error('❌ Failed to toggle item status:', err);
    }
  }

  // Check authentication and admin status
  async function checkAuth() {
    try {
      isAuthenticated = pocketbaseService.isAuthenticated();
      currentUser = pocketbaseService.getCurrentUser();

      if (currentUser) {
        // Check if user is admin (you may need to adjust this based on your user model)
        isAdmin = true; // For now, allow all logged in users to access
      }
    } catch (err) {
      console.error('❌ Auth check failed:', err);
    }
  }

  onMount(async () => {
    console.log('🔧 Admin Shop Items page loaded');
    await checkAuth();

    if (isAuthenticated && isAdmin) {
      await loadShopItems();
    }
  });
</script>

<svelte:head>
  <title>Admin - Shop Items Management</title>
</svelte:head>

<div class="admin-page">
  {#if !isAuthenticated}
    <div class="auth-message">
      <h2>Không được phép truy cập</h2>
      <p>Vui lòng đăng nhập để truy cập trang admin</p>
    </div>
  {:else if !isAdmin}
    <div class="auth-message">
      <h2>Không đủ quyền</h2>
      <p>Bạn không có quyền truy cập trang quản lý shop items</p>
    </div>
  {:else}
    <!-- Header -->
    <div class="admin-header">
      <div class="header-left">
        <h1>Shop Items Management</h1>
        <p>Quản lý các item trong cửa hàng</p>
      </div>
      <button class="create-btn" on:click={() => { resetForm(); showCreateModal = true; }}>
        + Thêm Item Mới
      </button>
    </div>

    <!-- Error Message -->
    {#if error}
      <div class="error-message">
        <p>❌ {error}</p>
        <button on:click={() => error = null}>×</button>
      </div>
    {/if}

    <!-- Loading -->
    {#if isLoading}
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    {:else}
      <!-- Shop Items Table -->
      <div class="items-table">
        <table>
          <thead>
            <tr>
              <th>Icon</th>
              <th>Tên</th>
              <th>Mô tả</th>
              <th>Giá</th>
              <th>Danh mục</th>
              <th>Thứ tự</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {#each shopItems as item}
              <tr>
                <td class="icon-cell">{item.icon}</td>
                <td class="name-cell">{item.name}</td>
                <td class="desc-cell">{item.description}</td>
                <td class="price-cell">{item.price} E</td>
                <td class="category-cell">{item.category}</td>
                <td class="sort-cell">{item.sort_order}</td>
                <td class="status-cell">
                  <button
                    class="status-btn {item.is_enabled ? 'enabled' : 'disabled'}"
                    on:click={() => toggleItemStatus(item)}
                  >
                    {item.is_enabled ? '✅ Enabled' : '❌ Disabled'}
                  </button>
                </td>
                <td class="actions-cell">
                  <button class="edit-btn" on:click={() => editShopItem(item)}>✏️</button>
                  <button class="delete-btn" on:click={() => deleteShopItem(item.item_id)}>🗑️</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if shopItems.length === 0}
        <div class="empty-state">
          <h3>Chưa có item nào</h3>
          <p>Nhấn nút "Thêm Item Mới" để tạo item đầu tiên</p>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<!-- Create Modal -->
{#if showCreateModal}
  <div class="modal-overlay" on:click={() => showCreateModal = false}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Thêm Item Mới</h3>
        <button class="close-btn" on:click={() => showCreateModal = false}>×</button>
      </div>

      <form on:submit|preventDefault={createShopItem}>
        <div class="form-row">
          <label>Item ID:</label>
          <input type="text" bind:value={formData.item_id} required placeholder="boost_pack" />
        </div>

        <div class="form-row">
          <label>Tên:</label>
          <input type="text" bind:value={formData.name} required placeholder="Boost Pack" />
        </div>

        <div class="form-row">
          <label>Mô tả:</label>
          <textarea bind:value={formData.description} required placeholder="Mô tả item"></textarea>
        </div>

        <div class="form-row">
          <label>Icon:</label>
          <input type="text" bind:value={formData.icon} required placeholder="🚀" />
        </div>

        <div class="form-row">
          <label>Giá:</label>
          <input type="number" bind:value={formData.price} required min="0" />
        </div>

        <div class="form-row">
          <label>Danh mục:</label>
          <select bind:value={formData.category} required>
            <option value="powerups">Power-ups</option>
            <option value="consumables">Consumables</option>
            <option value="cosmetics">Cosmetics</option>
          </select>
        </div>

        <div class="form-row">
          <label>Thứ tự sắp xếp:</label>
          <input type="number" bind:value={formData.sort_order} min="0" />
        </div>

        <div class="form-row checkbox-row">
          <label>
            <input type="checkbox" bind:checked={formData.is_enabled} />
            Kích hoạt
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="cancel-btn" on:click={() => showCreateModal = false}>Hủy</button>
          <button type="submit" class="submit-btn">Tạo Item</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal-overlay" on:click={() => showEditModal = false}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Chỉnh sửa Item</h3>
        <button class="close-btn" on:click={() => showEditModal = false}>×</button>
      </div>

      <form on:submit|preventDefault={updateShopItem}>
        <div class="form-row">
          <label>Item ID:</label>
          <input type="text" bind:value={formData.item_id} required disabled />
        </div>

        <div class="form-row">
          <label>Tên:</label>
          <input type="text" bind:value={formData.name} required />
        </div>

        <div class="form-row">
          <label>Mô tả:</label>
          <textarea bind:value={formData.description} required></textarea>
        </div>

        <div class="form-row">
          <label>Icon:</label>
          <input type="text" bind:value={formData.icon} required />
        </div>

        <div class="form-row">
          <label>Giá:</label>
          <input type="number" bind:value={formData.price} required min="0" />
        </div>

        <div class="form-row">
          <label>Danh mục:</label>
          <select bind:value={formData.category} required>
            <option value="powerups">Power-ups</option>
            <option value="consumables">Consumables</option>
            <option value="cosmetics">Cosmetics</option>
          </select>
        </div>

        <div class="form-row">
          <label>Thứ tự sắp xếp:</label>
          <input type="number" bind:value={formData.sort_order} min="0" />
        </div>

        <div class="form-row checkbox-row">
          <label>
            <input type="checkbox" bind:checked={formData.is_enabled} />
            Kích hoạt
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="cancel-btn" on:click={() => showEditModal = false}>Hủy</button>
          <button type="submit" class="submit-btn">Cập nhật</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .admin-page {
    min-height: 100vh;
    background: #000000;
    color: #ffffff;
    padding: 2rem;
    font-family: 'Poppins', sans-serif;
  }

  .auth-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-left h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    color: #ffffff;
  }

  .header-left p {
    color: #b0b0b0;
    margin: 0;
  }

  .create-btn {
    background: #446bff;
    color: #ffffff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-btn:hover {
    background: #3658cc;
    transform: translateY(-1px);
  }

  .error-message {
    background: #ff4757;
    color: #ffffff;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-message button {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .loading {
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

  .items-table {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  th {
    background: rgba(255, 255, 255, 0.1);
    font-weight: 600;
    color: #ffffff;
  }

  .icon-cell {
    font-size: 1.5rem;
    text-align: center;
    width: 60px;
  }

  .name-cell {
    font-weight: 600;
    color: #ffffff;
  }

  .desc-cell {
    color: #b0b0b0;
    max-width: 300px;
  }

  .price-cell {
    font-weight: 600;
    color: #446bff;
  }

  .category-cell {
    text-transform: capitalize;
  }

  .status-btn {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .status-btn.enabled {
    background: #2ed573;
    color: #ffffff;
  }

  .status-btn.disabled {
    background: #ff4757;
    color: #ffffff;
  }

  .actions-cell {
    white-space: nowrap;
  }

  .edit-btn, .delete-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    margin-right: 0.5rem;
    padding: 0.25rem;
    border-radius: 4px;
  }

  .edit-btn:hover {
    background: rgba(68, 107, 255, 0.2);
  }

  .delete-btn:hover {
    background: rgba(255, 71, 87, 0.2);
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #b0b0b0;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #1a1a1a;
    border-radius: 12px;
    padding: 0;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h3 {
    margin: 0;
    color: #ffffff;
  }

  .close-btn {
    background: none;
    border: none;
    color: #b0b0b0;
    font-size: 1.5rem;
    cursor: pointer;
  }

  .form-row {
    padding: 1rem 1.5rem;
  }

  .form-row label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #ffffff;
  }

  .form-row input,
  .form-row select,
  .form-row textarea {
    width: 100%;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #ffffff;
    font-size: 1rem;
  }

  .form-row textarea {
    resize: vertical;
    min-height: 80px;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
  }

  .checkbox-row label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    cursor: pointer;
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    justify-content: flex-end;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.1);
    color: #b0b0b0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .submit-btn {
    background: #446bff;
    color: #ffffff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .submit-btn:hover {
    background: #3658cc;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .admin-page {
      padding: 1rem;
    }

    .admin-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .items-table {
      overflow-x: auto;
    }

    table {
      min-width: 800px;
    }

    .modal {
      width: 95%;
      margin: 1rem;
    }
  }
</style>

