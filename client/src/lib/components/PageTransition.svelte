<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let isTransitioning = false;
  let transitionDirection = 'forward';
  let currentPath = '';
  let transitionStage = 'entering'; // entering, logo, exiting
  let hidePageContent = false; // Hide page content during transition

  // Track page changes for transition direction
  page.subscribe(($page) => {
    const newPath = $page.url.pathname;
    if (currentPath && currentPath !== newPath) {
      transitionDirection = getTransitionDirection(currentPath, newPath);
      isTransitioning = true;
      hidePageContent = true; // Hide page content immediately
      transitionStage = 'entering';

      // Check if transitioning to wallet page (slower transition)
      const isToWallet = newPath.includes('wallet');

      // Stage 1: Page slide in (250ms for wallet, 200ms for others)
      setTimeout(() => {
        transitionStage = 'logo';
      }, isToWallet ? 250 : 200);

      // Stage 2: Logo reveal (1000ms for wallet, 600ms for others) and reveal content
      setTimeout(() => {
        transitionStage = 'exiting';
        hidePageContent = false; // Reveal page content when slide out starts
      }, isToWallet ? 1250 : 800);

      // Stage 3: Page slide out completes (400ms)
      setTimeout(() => {
        isTransitioning = false;
        currentPath = newPath;
      }, isToWallet ? 1650 : 1200);
    } else {
      currentPath = newPath;
    }
  });

  function getTransitionDirection(from, to) {
    const routes = ['/', '/rooms', '/wallet-test', '/spectator'];
    const fromIndex = routes.indexOf(from);
    const toIndex = routes.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) return 'forward';
    return toIndex > fromIndex ? 'forward' : 'backward';
  }
</script>

<!-- Page content hider during transition -->
{#if hidePageContent}
  <div class="page-content-hider"></div>
{/if}

{#if isTransitioning}
  <div class="page-transition {transitionDirection} {transitionStage}" class:active={isTransitioning} class:wallet-transition={$page.url.pathname.includes('wallet')}>
    <!-- Page slide overlay -->
    <div class="page-overlay"></div>

    <!-- ENEEGY logo reveal (show from entering stage) -->
    {#if transitionStage === 'entering' || transitionStage === 'logo'}
      <div class="brand-reveal">
        <div class="logo-text" class:delayed={transitionStage === 'entering'}>ENEEGY</div>
      </div>
    {/if}

    <!-- Main transition bar (only show during logo stage) -->
    {#if transitionStage === 'logo'}
      <div class="transition-bar">
        <div class="progress-line"></div>
      </div>
    {/if}
  </div>
{/if}

<style>
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@700&display=swap');
  
  .page-transition {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    pointer-events: none;
    will-change: transform;
  }

  .page-transition.active {
    opacity: 1;
  }

  .page-transition.wallet-transition .page-overlay {
    animation-duration: 0.25s, 0.4s;
  }

  .page-transition.wallet-transition .transition-bar {
    animation-duration: 1.2s;
  }

  .page-transition.wallet-transition .progress-line {
    animation-duration: 1.2s;
  }

  /* Page content hider - covers page content during transition */
  .page-content-hider {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000000;
    z-index: 9998;
    pointer-events: none;
  }

  /* Page overlay for slide transitions */
  .page-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0a0a0a;
    will-change: transform;
  }

  /* Entering stage - slide in from side */
  .page-transition.entering .page-overlay {
    animation: slideIn 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  .page-transition.forward.entering .page-overlay {
    --start-x: 100%;
  }

  .page-transition.backward.entering .page-overlay {
    --start-x: -100%;
  }

  /* Logo stage - overlay stays in place */
  .page-transition.logo .page-overlay {
    transform: translateX(0);
    transition: transform 0.2s ease;
  }

  /* Exiting stage - slide out to reveal new page */
  .page-transition.exiting .page-overlay {
    animation: slideOut 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  }

  .page-transition.forward.exiting .page-overlay {
    --end-x: -100%;
  }

  .page-transition.backward.exiting .page-overlay {
    --end-x: 100%;
  }

  .page-transition.forward .transition-bar {
    transform: translateX(-100%);
    animation: slideForward 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .page-transition.backward .transition-bar {
    transform: translateX(100%);
    animation: slideBackward 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .transition-bar {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 2px;
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-50%);
    overflow: hidden;
  }

  .progress-line {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.9) 100%);
    transform: scaleX(0);
    transform-origin: left;
    filter: blur(0.5px);
    animation: progressFill 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    will-change: transform, filter;
  }

  @keyframes slideIn {
    0% {
      transform: translateX(var(--start-x, 100%));
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes slideOut {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(var(--end-x, -100%));
    }
  }

  @keyframes progressFill {
    0% {
      transform: scaleX(0);
      opacity: 1;
      filter: blur(0.5px);
    }
    80% {
      opacity: 1;
      filter: blur(0.5px);
    }
    100% {
      transform: scaleX(1);
      opacity: 0.8;
      filter: blur(1px);
    }
  }

  .brand-reveal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    font-family: 'Anton', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .logo-text {
    font-size: 5rem;
    font-weight: 400;
    font-family: 'Anton', sans-serif;
    color: #ffffff;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin: 0;
    line-height: 1;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.1);
    animation: logoReveal 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s both;
    will-change: transform, opacity;
  }

  .logo-text.delayed {
    animation-delay: 0.15s;
  }

  @keyframes logoReveal {
    0% {
      opacity: 0;
      transform: scale(0.7);
    }
    60% {
      opacity: 1;
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .logo-text {
      font-size: 3.5rem;
    }
  }

  @media (max-width: 480px) {
    .logo-text {
      font-size: 2.8rem;
    }
  }

  /* Accessibility: Reduce motion for users who prefer it */
  @media (prefers-reduced-motion: reduce) {
    .page-transition.entering .page-overlay,
    .page-transition.exiting .page-overlay {
      animation: none;
    }

    .page-transition.entering .page-overlay {
      transform: translateX(0);
    }

    .progress-line {
      animation: none;
      transform: scaleX(1);
      opacity: 0.8;
      filter: blur(1px);
    }

    .logo-text,
    .logo-text.delayed {
      animation: none;
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
