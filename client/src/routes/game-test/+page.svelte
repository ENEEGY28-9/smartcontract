<script lang="ts">
  import InfiniteRunner from '$lib/game/InfiniteRunner.svelte';
</script>

<svelte:head>
  <title>Infinite Runner 3D - Game Test</title>
</svelte:head>

<div class="page-wrapper">
  <div class="page-header">
    <h1>Game Test</h1>
    <p>Test infinite runner game mechanics</p>
  </div>

  <div class="test-container">
    <InfiniteRunner />
  </div>
</div>

<style>
  .page-wrapper {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 100%);
    color: #ffffff;
    font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .page-header {
    text-align: center;
    padding: 2rem 1rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.02em;
  }

  .page-header p {
    margin: 0;
    font-size: 1rem;
    color: #a0a0a0;
    line-height: 1.5;
  }

  .test-container {
    width: 100vw;
    height: calc(100vh - 200px);
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .page-header {
      padding: 1.5rem 1rem;
    }

    .page-header h1 {
      font-size: 1.75rem;
    }

    .page-header p {
      font-size: 0.9rem;
    }

    .test-container {
      height: calc(100vh - 180px);
    }
  }

  @media (max-width: 480px) {
    .page-header {
      padding: 1.25rem 0.875rem;
    }

    .page-header h1 {
      font-size: 1.5rem;
    }

    .page-header p {
      font-size: 0.875rem;
    }

    .test-container {
      height: calc(100vh - 160px);
    }
  }
</style>