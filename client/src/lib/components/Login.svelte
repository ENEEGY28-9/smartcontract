<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, authActions } from '$lib/stores/auth';
  import { pocketbaseService } from '$lib/services/pocketbaseService';
  import { POCKETBASE_URL } from '$lib/config/pocketbase-config';

  let email = '';
  let password = '';
  let confirmPassword = '';

  // Authentication variables
  let isLoginMode = true;
  let error = '';
  let success = '';

  // PocketBase integration
  let isAuthenticated = false;
  let currentUser = null;

  // Authentication loading state
  let isLoading = false;

  // Auto-hide success messages
  let successTimeout = null;

  // User menu state
  let showUserMenu = false;

  // Modal states
  let showLoginModal = false;
  let showRegisterModal = false;

  // Update authentication state
  async function updateAuthState() {
    try {
      console.log('🔄 Updating auth state...');
      const authState = await new Promise(resolve => {
        const unsubscribe = authStore.subscribe(state => resolve(state));
        unsubscribe();
      });

      isAuthenticated = authState.isAuthenticated;
      currentUser = authState.user ? {
        id: authState.user.id,
        email: authState.user.email,
        name: authState.user.email // Use email as name for now
      } : null;

      console.log('✅ Auth state updated:', {
        isAuthenticated,
        userEmail: currentUser?.email || 'no user',
        shouldShowButtons: !isAuthenticated
      });

    } catch (error) {
      console.error('❌ Error updating auth state:', error);
      isAuthenticated = false;
      currentUser = null;
    }
  }

  onMount(async () => {
    console.log('✅ Login component mounted');
    await updateAuthState();

    // Close user menu when clicking outside
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-profile-compact')) {
        showUserMenu = false;
      }
    };

    // Close modals when pressing ESC key
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && (showLoginModal || showRegisterModal)) {
        console.log('🚪 Closing modal from ESC key');
        closeModals();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Clear any pending timeouts on cleanup
      if (successTimeout) {
        clearTimeout(successTimeout);
        successTimeout = null;
      }
    };
  });

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password) {
    return password.length >= 6;
  }

  async function handleAuth() {
    // Clear previous messages
    error = '';
    success = '';

    if (!email.trim() || !password.trim()) {
      error = 'Vui lòng điền đầy đủ thông tin';
      return;
    }

    if (!validateEmail(email.trim())) {
      error = 'Vui lòng nhập địa chỉ email hợp lệ';
      return;
    }

    if (!validatePassword(password)) {
      error = 'Mật khẩu phải có ít nhất 6 ký tự';
      return;
    }

    if (!isLoginMode) {
      if (password !== confirmPassword) {
        error = 'Mật khẩu xác nhận không khớp';
        return;
      }
    }

    isLoading = true;
    error = '';
    success = '';

    // Clear any existing timeout
    if (successTimeout) {
      clearTimeout(successTimeout);
      successTimeout = null;
    }

    try {
      if (isLoginMode) {
        const result = await authActions.login(email.trim(), password);
        if (result.success) {
          success = 'Đăng nhập thành công!';
          error = '';
          // Clear form after successful login
          email = '';
          password = '';
          confirmPassword = '';
          // Update authentication state immediately
          updateAuthState();

          // Close modal after 1 second to show success message
          successTimeout = setTimeout(() => {
            console.log('✅ Đăng nhập thành công, đóng modal...');
            success = '';
            showLoginModal = false;
            showRegisterModal = false;
          }, 1000);
        } else {
          error = result.error || 'Đăng nhập thất bại';
          success = '';
        }
      } else {
        const result = await authActions.register(email.split('@')[0], email.trim(), password);
        if (result.success) {
          success = 'Đăng ký thành công! Đang tạo Energy...';
          error = '';
        } else {
          error = result.error || 'Đăng ký thất bại';
          success = '';
          isLoading = false;
          return;
        }

        // Auto-create energy for new user immediately after registration
        try {
          console.log('🎯 Auto-creating energy for newly registered user...');

          // Small delay to ensure authentication is complete
          await new Promise(resolve => setTimeout(resolve, 200));

          // Create energy record
          console.log('⚡ Creating energy record...');
          await pocketbaseService.getOrCreateUserEnergy();
          console.log('✅ Energy record created for new user');

          success = 'Đăng ký thành công! Energy đã được tạo.';
        } catch (setupError) {
          console.error('⚠️ Failed to auto-create energy:', setupError);
          console.error('Setup error details:', setupError.message);
          success = 'Đăng ký thành công!';
        }

        // Clear form
        email = '';
        password = '';
        confirmPassword = '';

        // Close modal after 1.5 seconds to show success message
        successTimeout = setTimeout(() => {
          console.log('✅ Đăng ký thành công, đóng modal...');
          success = '';
          showLoginModal = false;
          showRegisterModal = false;
          isLoginMode = true; // Reset to login mode for next time
        }, 1500);
      }

    } catch (err) {
      error = 'Lỗi mạng. Vui lòng thử lại sau.';
    }

    isLoading = false;
  }

  function toggleMode() {
    isLoginMode = !isLoginMode;
    error = '';
    success = '';
    confirmPassword = '';
  }

  function openLoginModal(event) {
    if (event) event.stopPropagation();
    console.log('🔓 Opening login modal');
    showLoginModal = true;
    showRegisterModal = false;
    isLoginMode = true;
    error = '';
    success = '';
    email = '';
    password = '';
    confirmPassword = '';
  }

  function openRegisterModal(event) {
    if (event) event.stopPropagation();
    console.log('📝 Opening register modal');
    showRegisterModal = true;
    showLoginModal = false;
    isLoginMode = false;
    error = '';
    success = '';
    email = '';
    password = '';
    confirmPassword = '';
  }

  function closeModals(event) {
    if (event) event.stopPropagation();
    console.log('🚪 Closing modals');
    showLoginModal = false;
    showRegisterModal = false;
    error = '';
    success = '';
  }

  function handleOverlayClick(event) {
    // Only close if clicking directly on the overlay, not the modal content
    if (event.target === event.currentTarget) {
      console.log('🚪 Closing modal from overlay click');
      closeModals(event);
    }
  }

</script>

<div class="login-container">
  {#if isAuthenticated && currentUser}
    <!-- Logged in state - Compact User Profile -->
    <div class="user-profile-compact">
      <button class="user-trigger" on:click={() => showUserMenu = !showUserMenu}>
        <div class="user-avatar">
          <span class="avatar-letter">{currentUser.email.charAt(0).toUpperCase()}</span>
        </div>
        <div class="user-summary">
          <div class="user-email">{currentUser.email}</div>
          <div class="user-status">ID: {currentUser.id.slice(0, 8)}...</div>
        </div>
        <div class="dropdown-arrow" class:open={showUserMenu}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </button>

      {#if showUserMenu}
        <div class="user-menu">
          <div class="menu-header">
            <div class="full-avatar">
              <span class="full-avatar-letter">{currentUser.email.charAt(0).toUpperCase()}</span>
            </div>
            <div class="full-user-info">
              <div class="full-email">{currentUser.email}</div>
              <div class="full-user-id">ID: {currentUser.id}</div>
            </div>
          </div>
          <div class="menu-divider"></div>
          <button class="menu-item logout-item" on:click={async () => { authActions.logout(); await updateAuthState(); showUserMenu = false; if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('pocketbase-auth-logout')); } }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="menu-icon">
              <path d="M12 4.5V3.5C12 2.67157 11.3284 2 10.5 2H5.5C4.67157 2 4 2.67157 4 3.5V12.5C4 13.3284 4.67157 14 5.5 14H10.5C11.3284 14 12 13.3284 12 12.5V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M8 10L10 12L8 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Login/Register Buttons -->
    <div class="auth-buttons">
      <button class="auth-btn login-btn" on:click={openLoginModal}>
        Đăng nhập
      </button>
      <button class="auth-btn register-btn" on:click={openRegisterModal}>
        Đăng ký
      </button>
    </div>
  {/if}

  <!-- Login Modal -->
  {#if showLoginModal}
    <div class="auth-modal-overlay" on:click={handleOverlayClick}>
      <div class="auth-modal" on:click={(e) => e.stopPropagation()}>
        <button class="modal-close" on:click={closeModals}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="auth-modal-header">
          <div class="auth-modal-text">
            <h3 class="auth-modal-title">Chào mừng trở lại</h3>
            <p class="auth-modal-subtitle">Truy cập nền tảng game của bạn</p>
          </div>
        </div>

        <form class="auth-modal-form" on:submit|preventDefault={handleAuth}>
          <div class="modal-form-row">
            <div class="modal-input-group">
              <label for="modal-login-email" class="modal-input-label">Email</label>
              <div class="modal-input-field">
                <svg class="modal-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
                </svg>
                <input
                  id="modal-login-email"
                  type="email"
                  bind:value={email}
                  placeholder="your@email.com"
                  class="modal-form-input"
                  required
                />
              </div>
            </div>

            <div class="modal-input-group">
              <label for="modal-login-password" class="modal-input-label">Mật khẩu</label>
              <div class="modal-input-field">
                <svg class="modal-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13 14 13.9 14 15 13.1 17 12 17ZM9 8V6C9 4.34 10.34 3 12 3S15 4.34 15 6V8H9Z" fill="currentColor"/>
                </svg>
                <input
                  id="modal-login-password"
                  type="password"
                  bind:value={password}
                  placeholder="••••••••"
                  class="modal-form-input"
                  required
                />
              </div>
            </div>
          </div>

          <div class="modal-form-actions">
            <button type="submit" class="modal-auth-button" disabled={isLoading}>
              {#if isLoading}
                <div class="modal-loading-spinner"></div>
                Đang đăng nhập...
              {:else}
                Đăng nhập
              {/if}
            </button>

            <button type="button" class="modal-auth-toggle" on:click={openRegisterModal} disabled={isLoading}>
              Tạo tài khoản
            </button>
          </div>
        </form>

        {#if error}
          <div class="modal-auth-message error-message">
            <svg class="modal-message-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
            {error}
          </div>
        {/if}

        {#if success}
          <div class="modal-auth-message success-message">
            <svg class="modal-message-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
            </svg>
            {success}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Register Modal -->
  {#if showRegisterModal}
    <div class="auth-modal-overlay" on:click={handleOverlayClick}>
      <div class="auth-modal" on:click={(e) => e.stopPropagation()}>
        <button class="modal-close" on:click={closeModals}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="auth-modal-header">
          <div class="auth-modal-text">
            <h3 class="auth-modal-title">Tham gia ENEEGY</h3>
            <p class="auth-modal-subtitle">Tạo tài khoản của bạn</p>
          </div>
        </div>

        <form class="auth-modal-form" on:submit|preventDefault={handleAuth}>
          <div class="modal-form-row">
            <div class="modal-input-group">
              <label for="modal-register-email" class="modal-input-label">Email</label>
              <div class="modal-input-field">
                <svg class="modal-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
                </svg>
                <input
                  id="modal-register-email"
                  type="email"
                  bind:value={email}
                  placeholder="your@email.com"
                  class="modal-form-input"
                  required
                />
              </div>
            </div>

            <div class="modal-input-group">
              <label for="modal-register-password" class="modal-input-label">Mật khẩu</label>
              <div class="modal-input-field">
                <svg class="modal-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13 14 13.9 14 15 13.1 17 12 17ZM9 8V6C9 4.34 10.34 3 12 3S15 4.34 15 6V8H9Z" fill="currentColor"/>
                </svg>
                <input
                  id="modal-register-password"
                  type="password"
                  bind:value={password}
                  placeholder="••••••••"
                  class="modal-form-input"
                  required
                />
              </div>
            </div>

            <div class="modal-input-group">
              <label for="modal-confirm-password" class="modal-input-label">Xác nhận mật khẩu</label>
              <div class="modal-input-field">
                <svg class="modal-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8H17V6C17 3.24 14.76 1 12 1S7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15S10.9 13 12 13 14 13.9 14 15 13.1 17 12 17ZM9 8V6C9 4.34 10.34 3 12 3S15 4.34 15 6V8H9Z" fill="currentColor"/>
                </svg>
                <input
                  id="modal-confirm-password"
                  type="password"
                  bind:value={confirmPassword}
                  placeholder="••••••••"
                  class="modal-form-input"
                  required
                />
              </div>
            </div>
          </div>

          <div class="modal-form-actions">
            <button type="submit" class="modal-auth-button" disabled={isLoading}>
              {#if isLoading}
                <div class="modal-loading-spinner"></div>
                Đang tạo...
              {:else}
                Tạo tài khoản
              {/if}
            </button>

            <button type="button" class="modal-auth-toggle" on:click={openLoginModal} disabled={isLoading}>
              Đăng nhập
            </button>
          </div>

          <div class="modal-password-hint">
            <span class="modal-hint-icon">🛡️</span>
            <span class="modal-hint-text">Tối thiểu 6 ký tự cho bảo mật</span>
          </div>
        </form>

        {#if error}
          <div class="modal-auth-message error-message">
            <svg class="modal-message-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
            {error}
          </div>
        {/if}

        {#if success}
          <div class="modal-auth-message success-message">
            <svg class="modal-message-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
            </svg>
            {success}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Compact Modern Authentication Card */
  .auth-compact {
    max-width: 480px;
    margin: 0 auto;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: cardSlideInCompact 0.4s ease-out;
  }

  @keyframes cardSlideInCompact {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .auth-header-compact {
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    text-align: center;
  }


  .auth-title-compact {
    margin: 0 0 0.125rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: -0.005em;
  }

  .auth-subtitle-compact {
    margin: 0;
    font-size: 0.75rem;
    color: #a0a0a0;
    font-weight: 400;
    line-height: 1.2;
  }

  .auth-form-compact {
    padding: 1.125rem;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.875rem;
  }

  .input-group-compact {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .input-label-compact {
    min-width: 3.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #ffffff;
    letter-spacing: 0.005em;
    text-align: right;
  }

  .input-field-compact {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
  }

  .input-icon-compact {
    position: absolute;
    left: 0.625rem;
    color: #a0a0a0;
    z-index: 1;
    pointer-events: none;
  }

  .form-input-compact {
    width: 100%;
    padding: 0.5rem 0.75rem 0.5rem 1.875rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.775rem;
    font-weight: 400;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(4px);
  }

  .form-input-compact:focus {
    outline: none;
    border-color: #446bff;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2), 0 0 0 4px rgba(68, 107, 255, 0.08);
    transform: translateY(-1px);
  }

  .form-input-compact::placeholder {
    color: #808080;
    font-weight: 400;
  }

  .form-input-compact:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .form-actions-compact {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.625rem;
  }

  .auth-button-compact {
    flex: 1;
    padding: 0.5rem 0.875rem;
    background: linear-gradient(135deg, #446bff, #6b73ff);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #ffffff;
    font-size: 0.775rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    box-shadow: 0 2px 8px rgba(68, 107, 255, 0.25);
  }

  .auth-button-compact:focus:not(:disabled) {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(68, 107, 255, 0.35);
  }

  .auth-button-compact:hover:not(:disabled) {
    background: linear-gradient(135deg, #3359e0, #5a67ff);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(68, 107, 255, 0.35);
  }

  .auth-button-compact:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(68, 107, 255, 0.25);
  }

  .auth-button-compact:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .auth-toggle-compact {
    padding: 0.4rem 0.625rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 5px;
    color: #a0a0a0;
    font-size: 0.7rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
  }

  .auth-toggle-compact:focus:not(:disabled) {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }

  .auth-toggle-compact:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  .auth-toggle-compact:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-spinner-compact {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .password-hint-compact {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4rem 0.625rem;
    background: rgba(255, 193, 7, 0.05);
    border: 1px solid rgba(255, 193, 7, 0.15);
    border-radius: 5px;
    font-size: 0.675rem;
    color: #ffc107;
  }

  .hint-icon {
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .hint-text {
    font-weight: 500;
  }

  .auth-message {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.4;
    margin: 0 2rem 1rem;
    animation: messageSlideIn 0.3s ease-out;
  }

  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .error-message {
    background: rgba(255, 71, 87, 0.1);
    border: 1px solid rgba(255, 71, 87, 0.2);
    color: #ff6b6b;
  }

  .success-message {
    background: rgba(46, 204, 113, 0.1);
    border: 1px solid rgba(46, 204, 113, 0.2);
    color: #51cf66;
  }

  .message-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  /* Compact User Profile */
  .user-profile-compact {
    position: relative;
    display: inline-block;
  }

  .user-trigger {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.875rem;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(12px);
    font-family: inherit;
    position: relative;
    overflow: hidden;
  }

  .user-trigger::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
    transition: left 0.5s;
  }

  .user-trigger:hover::before {
    left: 100%;
  }

  .user-trigger:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
  }

  .user-trigger:hover {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.25s ease;
  }

  .user-trigger:hover .user-avatar {
    box-shadow: 0 3px 12px rgba(99, 102, 241, 0.5);
    transform: scale(1.05);
  }

  .avatar-letter {
    font-weight: 700;
    font-size: 0.875rem;
    color: #ffffff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    letter-spacing: -0.01em;
  }

  .user-summary {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .user-email {
    font-weight: 600;
    font-size: 0.875rem;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .user-status {
    font-size: 0.75rem;
    color: #9ca3af;
    font-weight: 500;
    font-family: 'Monaco', 'Menlo', monospace;
    letter-spacing: 0.01em;
    opacity: 0.9;
  }

  .dropdown-arrow {
    margin-left: 0.25rem;
    transition: transform 0.2s ease;
    color: #a0a0a0;
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .user-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    min-width: 280px;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    animation: menuSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  @keyframes menuSlideIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .menu-header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 1.25rem 1rem 0.875rem;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .full-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .full-avatar-letter {
    font-weight: 700;
    font-size: 1.25rem;
    color: #ffffff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    letter-spacing: -0.02em;
  }

  .full-user-info {
    flex: 1;
    min-width: 0;
  }

  .full-email {
    font-weight: 600;
    font-size: 0.95rem;
    color: #ffffff;
    margin-bottom: 0.375rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .full-user-id {
    font-size: 0.8rem;
    color: #9ca3af;
    font-weight: 500;
    font-family: 'Monaco', 'Menlo', monospace;
    letter-spacing: 0.02em;
    opacity: 0.9;
  }

  .menu-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.875rem 1rem;
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0;
    position: relative;
    overflow: hidden;
  }

  .menu-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent);
    transition: left 0.4s;
  }

  .menu-item:hover::before {
    left: 100%;
  }

  .menu-item:first-child {
    border-radius: 0 0 12px 12px;
  }

  .menu-item:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.15);
  }

  .menu-item:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(2px);
  }

  .menu-item.logout-item:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    transform: translateX(2px);
  }

  .menu-icon {
    flex-shrink: 0;
    opacity: 0.85;
    transition: all 0.25s ease;
  }

  .menu-item:hover .menu-icon {
    opacity: 1;
    transform: scale(1.05);
  }

  .logout-item .menu-icon {
    color: #fca5a5;
  }

  /* Responsive Design - Ultra Compact */
  @media (max-width: 1024px) {
    .auth-compact {
      max-width: 400px;
    }

    .auth-header-compact {
      padding: 0.875rem 1.125rem 0.625rem;
    }

    .auth-title-compact {
      font-size: 0.95rem;
    }

    .auth-subtitle-compact {
      font-size: 0.725rem;
    }

    .auth-form-compact {
      padding: 1rem;
    }

    .input-group-compact {
      gap: 0.5rem;
    }

    .input-label-compact {
      min-width: 3rem;
      font-size: 0.725rem;
    }

    .form-input-compact {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 768px) {
    .auth-compact {
      max-width: 100%;
      margin: 0.375rem;
      border-radius: 12px;
    }

    .auth-header-compact {
      padding: 0.75rem 1rem 0.5rem;
    }

    .auth-title-compact {
      font-size: 0.9rem;
    }

    .auth-subtitle-compact {
      font-size: 0.7rem;
    }

    .auth-form-compact {
      padding: 0.875rem;
    }

    .form-row {
      gap: 0.5rem;
    }

    .input-group-compact {
      gap: 0.4rem;
    }

    .input-label-compact {
      min-width: 2.75rem;
      font-size: 0.7rem;
    }

    .form-input-compact {
      padding: 0.55rem 0.675rem 0.55rem 1.875rem;
      font-size: 0.725rem;
    }

    .form-actions-compact {
      gap: 0.4rem;
    }

    .auth-button-compact {
      padding: 0.55rem 0.75rem;
      font-size: 0.775rem;
    }

    .auth-toggle-compact {
      padding: 0.4rem 0.5rem;
      font-size: 0.7rem;
    }
  }

  @media (max-width: 480px) {
    .auth-compact {
      margin: 0.25rem;
      border-radius: 10px;
    }

    .auth-header-compact {
      padding: 0.625rem 0.875rem 0.5rem;
    }

    .auth-title-compact {
      font-size: 0.875rem;
    }

    .auth-subtitle-compact {
      font-size: 0.675rem;
    }

    .auth-form-compact {
      padding: 0.75rem;
    }

    .form-row {
      gap: 0.4rem;
    }

    .input-group-compact {
      gap: 0.35rem;
    }

    .input-label-compact {
      min-width: 2.5rem;
      font-size: 0.675rem;
    }

    .form-input-compact {
      padding: 0.5rem 0.6rem 0.5rem 1.75rem;
      font-size: 0.7rem;
    }

    .form-actions-compact {
      gap: 0.375rem;
    }

    .auth-button-compact {
      padding: 0.5rem 0.675rem;
      font-size: 0.75rem;
    }

    .auth-toggle-compact {
      padding: 0.35rem 0.45rem;
      font-size: 0.675rem;
    }

    .password-hint-compact {
      padding: 0.4rem 0.55rem;
      font-size: 0.65rem;
    }
  }

  @media (max-width: 360px) {
    .auth-compact {
      margin: 0.1875rem;
      border-radius: 8px;
    }

    .auth-header-compact {
      padding: 0.5625rem 0.75rem 0.4375rem;
    }

    .auth-title-compact {
      font-size: 0.825rem;
    }

    .auth-subtitle-compact {
      font-size: 0.65rem;
    }

    .auth-form-compact {
      padding: 0.6875rem;
    }

    .form-row {
      gap: 0.375rem;
    }

    .input-group-compact {
      gap: 0.3125rem;
    }

    .input-label-compact {
      min-width: 2.25rem;
      font-size: 0.65rem;
    }

    .form-input-compact {
      padding: 0.4375rem 0.5625rem 0.4375rem 1.625rem;
      font-size: 0.675rem;
    }

    .form-actions-compact {
      gap: 0.3125rem;
    }

    .auth-button-compact {
      padding: 0.4375rem 0.625rem;
      font-size: 0.7125rem;
    }

    .auth-toggle-compact {
      padding: 0.3125rem 0.4375rem;
      font-size: 0.6375rem;
    }

    .password-hint-compact {
      padding: 0.375rem 0.5rem;
      font-size: 0.625rem;
    }
  }

/* Auth Buttons */
.auth-buttons {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.auth-btn {
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
  position: relative;
  overflow: hidden;
}

.auth-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
  transition: left 0.5s;
}

.auth-btn:hover::before {
  left: 100%;
}

.auth-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
}

.auth-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.login-btn {
  background: linear-gradient(135deg, #ffffff, #e0e0e0);
  border: 2px solid #ffffff;
  color: #000000;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
}

.login-btn:hover {
  background: linear-gradient(135deg, #f0f0f0, #d0d0d0);
  border-color: #e0e0e0;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.3);
}

.register-btn {
  background: transparent;
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  font-weight: 500;
}

.register-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
}

/* Auth Modals */
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: modalFadeIn 0.25s ease-out;
  overflow-y: auto;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.auth-modal {
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 480px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  margin: auto;
}

/* Custom scrollbar for modal */
.auth-modal::-webkit-scrollbar {
  width: 8px;
}

.auth-modal::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0 16px 16px 0;
}

.auth-modal::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.auth-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 1;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.modal-close:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.auth-modal-header {
  padding: 2rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-align: center;
}

.auth-modal-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.025em;
}

.auth-modal-subtitle {
  margin: 0;
  font-size: 1rem;
  color: #a0a0a0;
  font-weight: 400;
  line-height: 1.4;
}

.auth-modal-form {
  padding: 1.5rem;
}

.modal-form-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.modal-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal-input-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.005em;
}

.modal-input-field {
  position: relative;
  display: flex;
  align-items: center;
}

.modal-input-icon {
  position: absolute;
  left: 0.75rem;
  color: #a0a0a0;
  z-index: 1;
  pointer-events: none;
}

.modal-form-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 400;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(4px);
}

.modal-form-input:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

.modal-form-input::placeholder {
  color: #808080;
  font-weight: 400;
}

.modal-form-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.modal-auth-button {
  width: 100%;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.modal-auth-button:focus:not(:disabled) {
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 16px rgba(99, 102, 241, 0.4);
}

.modal-auth-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #5855eb, #7c3aed);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.modal-auth-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.modal-auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.modal-auth-toggle {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #a0a0a0;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  backdrop-filter: blur(4px);
}

.modal-auth-toggle:focus:not(:disabled) {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.modal-auth-toggle:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.modal-auth-toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-password-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 193, 7, 0.05);
  border: 1px solid rgba(255, 193, 7, 0.15);
  border-radius: 8px;
  font-size: 0.8125rem;
  color: #ffc107;
  margin-top: 0.5rem;
}

.modal-hint-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.modal-hint-text {
  font-weight: 500;
}

.modal-auth-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
  margin: 0 1.5rem 1.5rem;
  animation: messageSlideIn 0.3s ease-out;
}

.modal-message-icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

/* Responsive Modal */
@media (max-width: 640px) {
  .auth-modal-overlay {
    padding: 1rem;
  }

  .auth-modal {
    width: 100%;
    max-width: 100%;
    max-height: 90vh;
    margin: 0;
  }

  .auth-modal-header {
    padding: 1.5rem 1.25rem 0.75rem;
  }

  .auth-modal-title {
    font-size: 1.25rem;
  }

  .auth-modal-form {
    padding: 1.25rem;
  }

  .modal-form-row {
    gap: 0.875rem;
    margin-bottom: 1.25rem;
  }

  .modal-form-actions {
    gap: 0.625rem;
    margin-bottom: 0.75rem;
  }

  .auth-buttons {
    gap: 0.5rem;
  }

  .auth-btn {
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
  }
}
</style>
