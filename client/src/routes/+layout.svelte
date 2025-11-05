<script>
  import '../app.css';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import PageTransition from '$lib/components/PageTransition.svelte';
  import { gameMode } from '$lib/stores/gameStore';

  // Only import Login component on client-side to avoid SSR issues
  let LoginComponent = null;
  let WalletComponent = null;

  // Language settings
  let currentLanguage = 'vi'; // 'vi' for Vietnamese, 'en' for English
  const languages = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  onMount(async () => {
    console.log('🚀 Layout mounted, loading components...');
    
    try {
      const loginModule = await import('$lib/components/Login.svelte');
      LoginComponent = loginModule.default;
      console.log('✅ Login component loaded in layout');
    } catch (error) {
      console.error('❌ Failed to load Login component:', error);
    }

    try {
      const walletModule = await import('$lib/components/wallet/WalletConnect.svelte');
      WalletComponent = walletModule.default;
      console.log('✅ Wallet component loaded in layout');
    } catch (error) {
      console.error('❌ Failed to load Wallet component:', error);
    }
  });

  const navigateTo = (path) => {
    goto(path);
    currentPath = path;
  };

  let currentPath = $page.url.pathname;

  function setLanguage(langCode) {
    currentLanguage = langCode;
    // Here you would implement actual language switching logic
    console.log('Language changed to:', langCode);
  }
</script>

<svelte:head>
    <title>GameV1 - Multiplayer Gaming Platform</title>
</svelte:head>

<div class="app">
  <PageTransition />

  {#if $gameMode !== 'game'}
  <header class="app-header">
    <div class="header-content">
      <div class="header-left">
        <h1 class="brand-logo">ENEEGY</h1>
        <nav class="main-nav">
          <button class="nav-link" class:active={currentPath === '/'} on:click={() => navigateTo('/')}>
            Home
          </button>
          <button class="nav-link" class:active={currentPath === '/rooms'} on:click={() => navigateTo('/rooms')}>
            Rooms
          </button>
          <button class="nav-link" class:active={currentPath === '/wallet'} on:click={() => navigateTo('/wallet')}>
            Wallet
          </button>
          <button class="nav-link" class:active={currentPath === '/shop'} on:click={() => navigateTo('/shop')}>
            Shop
          </button>
          <button class="nav-link" class:active={currentPath === '/bag'} on:click={() => navigateTo('/bag')}>
            Bag
          </button>
        </nav>
      </div>

      <div class="header-right">
        <!-- Language Selector -->
        <div class="language-selector">
          <button class="lang-btn" on:click={() => setLanguage(currentLanguage === 'vi' ? 'en' : 'vi')}>
            <span class="lang-flag">{languages.find(l => l.code === currentLanguage)?.flag}</span>
          </button>
        </div>

        {#if WalletComponent}
          <svelte:component this={WalletComponent} />
        {/if}
        {#if LoginComponent}
          <svelte:component this={LoginComponent} />
        {:else}
          <div class="login-placeholder">Loading...</div>
        {/if}
      </div>
    </div>
  </header>
  {/if}

  <main class="app-main">
    <slot />
  </main>
</div>

<style>
  /* Minimalist Tech Layout - Black Background, White Text */

  .app {
    min-height: 100vh;
    background: #000000;
    color: #ffffff;
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
    background: rgba(0, 0, 0, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.875rem 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 2.5rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .brand-logo {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #b0b0b0 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .main-nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .nav-link {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: #a0a0a0;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.01em;
    position: relative;
    overflow: hidden;
  }

  .nav-link::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  .nav-link:hover::before {
    left: 100%;
  }

  .nav-link:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .nav-link:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .nav-link.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
  }

  .nav-link:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }

  .status {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #ffffff;
    color: #ffffff;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .app-main {
    padding: 0;
    min-height: calc(100vh - 80px);
  }

  .login-placeholder {
    color: #b0b0b0;
    font-size: 0.9rem;
    font-weight: 400;
  }

  /* Language Selector */
  .language-selector {
    margin-right: 0.5rem;
  }

  .lang-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: #ffffff;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 40px;
    height: 40px;
  }

  .lang-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .lang-flag {
    font-size: 1.5rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .header-content {
      padding: 0.75rem 1.25rem;
    }

    .header-left {
      gap: 2rem;
    }

    .brand-logo {
      font-size: 1.15rem;
    }

    .nav-link {
      padding: 0.45rem 0.875rem;
      font-size: 0.825rem;
    }

    .app-main {
      min-height: calc(100vh - 60px);
    }
  }

  @media (max-width: 768px) {
    .header-content {
      padding: 0.75rem 1rem;
      flex-direction: column;
      gap: 0.875rem;
    }

    .header-left {
      flex-direction: column;
      gap: 0.875rem;
      width: 100%;
    }

    .brand-logo {
      text-align: center;
      font-size: 1.1rem;
    }

    .main-nav {
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.125rem;
    }

    .nav-link {
      padding: 0.45rem 0.75rem;
      font-size: 0.8rem;
      min-width: 80px;
    }

    .header-right {
      justify-content: center;
      width: 100%;
      order: -1; /* Move to top on mobile */
    }

    .language-selector {
      order: 2; /* Move language selector to end */
    }

    .app-main {
      min-height: calc(100vh - 55px);
    }
  }

  @media (max-width: 480px) {
    .header-content {
      padding: 0.625rem 0.875rem;
      gap: 0.75rem;
    }

    .header-left {
      gap: 0.75rem;
    }

    .brand-logo {
      font-size: 1rem;
    }

    .main-nav {
      gap: 0.125rem;
    }

    .nav-link {
      padding: 0.4rem 0.625rem;
      font-size: 0.75rem;
      min-width: 70px;
      border-radius: 6px;
    }

    .header-right {
      flex-direction: row;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .language-selector {
      margin-right: 0;
    }

    .lang-btn {
      width: 36px;
      height: 36px;
      padding: 0;
    }

    .lang-flag {
      font-size: 1.3rem;
    }

    .app-main {
      min-height: calc(100vh - 50px);
    }
  }

  @media (max-width: 360px) {
    .header-content {
      padding: 0.5rem 0.75rem;
    }

    .brand-logo {
      font-size: 0.95rem;
    }

    .nav-link {
      padding: 0.35rem 0.5rem;
      font-size: 0.7rem;
      min-width: 60px;
      border-radius: 4px;
    }

    .app-main {
      min-height: calc(100vh - 45px);
    }
  }
</style>
