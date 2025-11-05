<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { gameMode } from '$lib/stores/gameStore';
    import { TokenService } from '$lib/services/tokenService';

    // Use the global game mode store
    let currentGameMode = 'menu';
    $: $gameMode = currentGameMode === 'infinite-runner' ? 'game' : 'menu';

    // Import Login component only on client side
    let LoginComponent = null;
    if (browser) {
        import('$lib/components/Login.svelte').then(module => {
            LoginComponent = module.default;
        });
    }

    // Import game components only when needed and on client side
    let InfiniteRunnerComponent = null;

    function loadInfiniteRunner() {
        if (browser && !InfiniteRunnerComponent) {
            import('$lib/game/InfiniteRunner.svelte').then(module => {
                InfiniteRunnerComponent = module.default;
            }).catch(error => {
                console.error('Failed to load Infinite Runner component:', error);
            });
        }
    }

    onMount(async () => {
        console.log('🏠 Main page mounted, current mode:', currentGameMode);

        // Initialize token service with blockchain integration
        if (browser) {
            try {
                await TokenService.initialize();
                console.log('✅ Token service initialized successfully');
            } catch (error) {
                console.warn('⚠️ Token service initialization failed:', error);
            }

            // Listen for custom event to go back to menu from game
            window.addEventListener('game-back-to-menu', () => {
                console.log('🏠 Received game-back-to-menu event');
                returnToMenu();
            });
        }
    });

    function startInfiniteRunner() {
        console.log('🏃‍♂️ Starting Infinite Runner...');
        currentGameMode = 'infinite-runner';
        loadInfiniteRunner();
    }

    function returnToMenu() {
        console.log('🏠 Returning to menu...');
        currentGameMode = 'menu';
    }
</script>

<svelte:head>
    <title>Infinite Runner 3D - Physics-Based Endless Runner</title>
    <meta name="description" content="Advanced 3D endless runner game with physics simulation and immersive gameplay" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="game-container" class:in-game={currentGameMode === 'infinite-runner'}>
    {#if currentGameMode === 'menu'}
        <div class="main-menu">
            <div class="menu-content">
                <h1>RUN</h1>
                <p class="subtitle">Advanced 3D endless runner with physics simulation</p>

                <div class="game-modes">
                    <div class="mode-card featured">
                        
                        <button class="play-btn featured-btn" on:click={startInfiniteRunner}>
                            Play Infinite Runner
                        </button>
                    </div>
                </div>

            </div>
        </div>
    {/if}

    {#if currentGameMode === 'infinite-runner'}
        {#if InfiniteRunnerComponent}
            <svelte:component this={InfiniteRunnerComponent} />
        {:else}
            <div class="game-mode-indicator">
                <h2>Infinite Runner 3D</h2>
                <button onclick={returnToMenu}>← Back to Menu</button>
            </div>
            <div class="loading">Loading Infinite Runner...</div>
        {/if}
    {/if}
</div>

<style>
    /* Minimalist Tech Design - Black Background, White Text */

    .game-container {
        width: 100%;
        height: 100vh;
        position: relative;
        overflow: hidden;
        background: #000000;
        font-family: 'Poppins', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .main-menu {
        width: 100%;
        height: 100%;
        background: #000000;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        overflow: hidden;
    }

    .menu-content {
        text-align: center;
        padding: 4rem 2rem;
        max-width: 800px;
        width: 100%;
    }

    .menu-content h1 {
        font-size: 3rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        color: #ffffff;
        letter-spacing: -0.02em;
        line-height: 1.1;
        position: relative;
    }

    .menu-content h1::after {
        content: '';
        position: absolute;
        bottom: -0.5rem;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 1px;
        background: #ffffff;
        opacity: 0.3;
    }

    .subtitle {
        font-size: 1.2rem;
        font-weight: 500;
        color: #b0b0b0;
        margin-bottom: 4rem;
        line-height: 1.6;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }

    .game-modes {
        display: flex;
        justify-content: center;
        margin: 3rem 0;
    }

    .mode-card {
        background: transparent;
        border: 1px solid #333333;
        border-radius: 8px;
        padding: 2.5rem 3rem;
        transition: all 0.2s ease;
        cursor: pointer;
        text-align: center;
        min-width: 300px;
    }

    .mode-card:hover {
        border-color: #ffffff;
        background: rgba(255, 255, 255, 0.02);
    }

    .mode-card.featured {
        border-color: #ffffff;
        background: rgba(255, 255, 255, 0.01);
    }

    .mode-card h3 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #ffffff;
        letter-spacing: -0.01em;
    }

    .mode-card p {
        color: #b0b0b0;
        font-size: 1rem;
        margin-bottom: 2rem;
        line-height: 1.6;
        font-weight: 500;
    }

    .play-btn {
        background: transparent;
        color: #ffffff;
        border: 1px solid #ffffff;
        padding: 1rem 2rem;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        letter-spacing: 0.02em;
        margin-top: 1rem;
    }

    .play-btn:hover {
        background: #ffffff;
        color: #000000;
        transform: translateY(-1px);
    }

    .featured-btn {
        background: #ffffff;
        color: #000000;
        border: 1px solid #ffffff;
    }

    .featured-btn:hover {
        background: transparent;
        color: #ffffff;
    }


    .game-mode-indicator {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        background: #000000;
        border-bottom: 1px solid #333333;
        color: #ffffff;
        padding: 1.5rem 2rem;
        z-index: 1000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: 'Poppins', 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .game-mode-indicator h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: -0.01em;
    }

    .game-mode-indicator button {
        background: transparent;
        border: 1px solid #666666;
        color: #ffffff;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.2s ease;
        letter-spacing: 0.01em;
    }

    .game-mode-indicator button:hover {
        border-color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
    }

    .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        color: #ffffff;
        font-size: 1.2rem;
        font-weight: 500;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .menu-content {
            padding: 2rem 1rem;
        }

        .menu-content h1 {
            font-size: 2.2rem;
        }

        .subtitle {
            font-size: 1rem;
            margin-bottom: 3rem;
        }

        .game-modes {
            flex-direction: column;
            align-items: center;
        }

        .mode-card {
            padding: 2rem 2.5rem;
            min-width: 280px;
            margin-bottom: 1rem;
        }

        .mode-card h3 {
            font-size: 1.3rem;
        }

        .mode-card p {
            font-size: 0.95rem;
        }

        .play-btn {
            padding: 0.9rem 1.8rem;
            font-size: 0.95rem;
        }

        .game-mode-indicator {
            padding: 1rem 1.5rem;
        }

        .game-mode-indicator h2 {
            font-size: 1.1rem;
        }
    }

    @media (max-width: 480px) {
        .menu-content {
            padding: 1.5rem 1rem;
        }

        .menu-content h1 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
        }

        .subtitle {
            font-size: 0.95rem;
            margin-bottom: 2rem;
        }

        .mode-card {
            padding: 1.5rem 2rem;
            min-width: 260px;
        }

        .mode-card h3 {
            font-size: 1.2rem;
            margin-bottom: 0.8rem;
        }

        .mode-card p {
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
        }

        .play-btn {
            padding: 0.8rem 1.6rem;
            font-size: 0.9rem;
        }


        .game-mode-indicator {
            padding: 1rem 1.5rem;
        }

        .game-mode-indicator h2 {
            font-size: 1.1rem;
        }

        .game-mode-indicator button {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
        }
    }
</style>