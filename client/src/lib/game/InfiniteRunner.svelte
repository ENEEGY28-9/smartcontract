<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  // Static imports for core types and constants
  import { InputAction, GAME_CONFIG, PHYSICS_CONFIG, Vector3 } from './core/utils/Constants';

  // Auth and game stores
  import { authStore, authActions } from '$lib/stores/auth';
  import { gameState, gameActions } from '$lib/stores/gameStore';

  // Subscribe to auth store for conditional rendering
  let isAuthenticated = false;
  const unsubscribeAuth = authStore.subscribe(state => {
    isAuthenticated = state.isAuthenticated;
  });

  // Token components
  import TokenBalance from '$lib/components/TokenBalance.svelte';
  import TokenHistory from '$lib/components/TokenHistory.svelte';

  // Token service
  import { TokenService } from '$lib/services/tokenService';

  // Static imports for game engine components
  import { GameLoop } from './core/engine/GameLoop';
  import { InputManager } from './core/engine/InputManager';
  import { PhysicsManager } from './core/engine/PhysicsManager';
  import { CameraController, CameraMode } from './core/engine/CameraController';
  import { CollectibleManager } from './core/engine/CollectibleManager';
  import { Player, Collectible, CollectibleType, Pet } from './core/entities';

  // Game state
  let isGameRunning = false;
  let isGameStarted = false;
  let score = 0;
  let fps = 0;

  // Energy tracking simplified - just log changes
  let lastKnownEnergyBalance = 0;
  $: {
    const currentBalance = $gameState.tokenBalance || 0;
    if (lastKnownEnergyBalance !== 0 && currentBalance !== lastKnownEnergyBalance) {
      const change = currentBalance - lastKnownEnergyBalance;
      console.log(`📈 Energy balance changed: ${lastKnownEnergyBalance} → ${currentBalance} (${change > 0 ? '+' : ''}${change} point${Math.abs(change) > 1 ? 's' : ''})`);
    }
    lastKnownEnergyBalance = currentBalance;
  }
  
  // Debug input state
  let debugInputState = {
    jump: false,
    slide: false,
    grounded: true,
    lastKeyPressed: 'none',
    playerY: 0,
    groundLevel: 2,
    hasPhysicsBody: false
  };

  // Debug panel
  let showDebugPanel = false;

  // Three.js components (will be initialized in onMount)
  let scene = null;
  let camera = null;
  let renderer = null;
  let canvas = null;

  // Game engine components (will be initialized in initializeGameEngine)
  let gameLoop = null;
  let inputManager = null;
  let physicsManager = null;
  let cameraController = null;
  let collectibleManager = null;
  let player = null;
  let pet = null; // Player's companion pet

  // Debug state
  let canvasReady = false;
  let isBoostActive = false; // Track boost state for reactive UI
  let debugCollision = false; // Debug collision distances

  // Ground plane for reference
  let groundMesh = null;

  // Tooltip observer
  let tooltipObserver = null;

  // Collectible management now handled by CollectibleManager

  // Removed particle spawning system - simplified gameplay

  // Minimap data
  let minimapData = {
    playerPos: { x: 0, z: 0 },
    collectibles: [] as Array<{ x: number; z: number; type: string }>
  };

  // Simple callback for collectibles - just increase energy balance
  const collectibleCallbacks = {
    onCollect: (points: number) => {
      // Simply increase energy balance locally
      gameActions.addTokenEarned(points);
      console.log(`⚡ Energy increased by ${points} point${points > 1 ? 's' : ''}!`);
    }
  };

  // Removed pool balance monitoring - collectibles spawn automatically




  onMount(async () => {
    try {
      console.log('🎮 Starting Infinite Runner initialization...');

      // Hide browser tooltips and notifications
      hideBrowserTooltips();

      // Setup observer to continuously hide tooltips
      tooltipObserver = setupTooltipObserver();

      // Initialize Three.js components first
      await initializeThreeJS();
      console.log('✅ Three.js initialized');

      // Then initialize the game
      await initializeGame();
      console.log('✅ Game initialization complete');

      // Add global mouse event listener (no boost logic - boost moved to keyboard)
      console.log('✅ Global mouse event listener added');

      // Ensure canvas is focused after initialization
      setTimeout(() => {
        if (canvas && canvas.focus) {
          canvas.focus();
          console.log('🎯 Canvas focused after initialization');

          // Hide tooltips again after focus
          hideBrowserTooltips();
        }
      }, 100);

      // Removed token WebSocket and particle spawning - simplified gameplay

    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      console.error('Error details:', error);
    }
  });

  onDestroy(() => {
    // Cleanup auth subscription
    unsubscribeAuth();

    cleanup();
  });

  /**
   * Hide browser tooltips and notifications
   */
  function hideBrowserTooltips() {
    // Hide common tooltip selectors
    const tooltipSelectors = [
      '[role="tooltip"]',
      '.tooltip',
      '#tooltip',
      '.browser-tooltip',
      '.cursor-tooltip',
      '[data-tooltip]',
      '.toast',
      '.notification'
    ];

    tooltipSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      Array.from(elements).forEach(el => {
        const element = el;
        element.style.display = 'none';
        element.style.visibility = 'hidden';
        element.style.opacity = '0';
      });
    });

    // Override browser tooltip property
    try {
      document.body.style.setProperty('--tooltip-display', 'none');
    } catch (e) {
      console.warn('Could not set tooltip display property:', e);
    }

    console.log('🔕 Browser tooltips hidden');
  }

  /**
   * Setup mutation observer to continuously hide tooltips
   */
  function setupTooltipObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node;
          if (element && element.matches && (
            element.matches('[role="tooltip"]') ||
            element.matches('.tooltip') ||
            element.matches('#tooltip') ||
            element.matches('.browser-tooltip') ||
            element.matches('.cursor-tooltip') ||
            element.hasAttribute('data-tooltip') ||
            element.classList?.contains('toast') ||
            element.classList?.contains('notification')
          )) {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
            element.style.opacity = '0';
            console.log('🚫 Hidden new tooltip:', element);
          }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('👁️ Tooltip observer setup');
    return observer;
  }

  /**
   * Initialize the game
   */
  async function initializeGame() {
    try {
      console.log('🎮 Initializing Infinite Runner Game...');

      // Initialize game engine components first
      await initializeGameEngine();
      console.log('✅ Game engine initialized');

      // Setup scene
      setupScene();
      console.log('✅ Scene setup complete');

      // Start game loop
      startGame();
      console.log('✅ Game started');

    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Initialize Three.js scene, camera, and renderer
   */
  async function initializeThreeJS() {
    console.log('🔍 Looking for canvas element...');

    // Wait for canvas to be rendered in DOM
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    // Wait for Svelte to render the canvas
    while (attempts < maxAttempts) {
      // Check if canvas is already bound by Svelte
      if (canvas) {
        console.log('✅ Canvas already bound by Svelte:', {
          tagName: canvas.tagName || 'CANVAS',
          className: canvas.className || 'no class',
          id: canvas.id || 'no id',
          width: canvas.width || 0,
          height: canvas.height || 0,
          style: canvas.style ? canvas.style.cssText : 'no style',
          parentElement: canvas.parentElement ? canvas.parentElement.tagName : 'unknown'
        });
        break;
      }

      // Fallback: try to find canvas in DOM
      let canvasElement = document.querySelector && document.querySelector('canvas');
      if (!canvasElement) {
        canvasElement = document.querySelector && document.querySelector('.game-canvas');
      }

      if (canvasElement) {
        canvas = canvasElement;
        console.log('✅ Canvas element found in DOM:', {
          tagName: canvas.tagName || 'CANVAS',
          className: canvas.className || 'no class',
          id: canvas.id || 'no id',
          width: canvas.width || 0,
          height: canvas.height || 0,
          style: canvas.style ? canvas.style.cssText : 'no style',
          parentElement: canvas.parentElement ? canvas.parentElement.tagName : 'unknown'
        });
        break;
      }

      console.log(`🔍 Canvas search attempt ${attempts + 1}/${maxAttempts} - Canvas found:`, !!canvasElement);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!canvas) {
      throw new Error('Canvas element not found after waiting - make sure the canvas is rendered first');
    }

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200); // Add fog for depth
    console.log('✅ Scene created');

    // Create camera
    const aspectRatio = (window.innerWidth || 800) / (window.innerHeight || 600);
    camera = new THREE.PerspectiveCamera(
      75, // FOV
      aspectRatio, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    console.log('✅ Camera created');

    // Create renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false
    });
    renderer.setSize(window.innerWidth || 800, window.innerHeight || 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    console.log('✅ Renderer created');
  }

  /**
   * Initialize game engine components
   */
  async function initializeGameEngine() {
    try {
      console.log('🔧 Initializing game engine components...');

      // Initialize physics manager first (async)
      console.log('🔄 Initializing physics manager...');
      physicsManager = new PhysicsManager();
      await physicsManager.init();
      console.log('✅ Physics manager initialized');

      // Initialize input manager AFTER canvas is available
      console.log('🔄 Initializing input manager...');

      // Wait for canvas to be ready
      let canvasCheckAttempts = 0;
      while (!canvas && canvasCheckAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        canvasCheckAttempts++;
      }

      console.log('📋 Canvas debug:', {
        canvasExists: !!canvas,
        canvasElement: canvas,
        canvasTagName: canvas?.tagName,
        canvasId: canvas?.id,
        canvasClass: canvas?.className,
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
        canvasStyle: canvas?.style.cssText
      });

      if (canvas) {
        canvasReady = true;

        // Verify canvas is properly in DOM
        console.log('🔍 DOM verification:', {
          canvasInDocument: document.contains ? document.contains(canvas) : true,
          canvasParent: canvas.parentElement ? canvas.parentElement.tagName : 'unknown',
          canvasVisible: (canvas.offsetWidth || 0) > 0 && (canvas.offsetHeight || 0) > 0
        });

        inputManager = new InputManager();
        inputManager.setCanvas(canvas);
        console.log('✅ Input manager initialized with canvas');

        // Verify canvas is properly set
        console.log('🔍 Canvas verification:', {
          inputManagerCanvas: inputManager.canvas,
          canvasIsSame: inputManager.canvas === canvas,
          canvasOnMouseMove: canvas.onmousemove !== null && canvas.onmousemove !== undefined,
          canvasHasListeners: canvas.addEventListener && typeof canvas.addEventListener === 'function'
        });

        // Force refresh event listeners and verify setup
        if (inputManager.canvas) {
          console.log('🔄 Forcing event listener setup...');
          inputManager.setupEventListeners();

          // Verify mouse event listeners are attached
          setTimeout(() => {
            console.log('🔍 Mouse event verification after setup:', {
              mousemove: canvas.onmousemove !== null && canvas.onmousemove !== undefined,
              mousedown: canvas.onmousedown !== null && canvas.onmousedown !== undefined,
              mouseup: canvas.onmouseup !== null && canvas.onmouseup !== undefined
            });
          }, 100);
        }
      } else {
        throw new Error('Canvas not available for input manager');
      }

      // Initialize player
      console.log('🔄 Initializing player...');
      if (physicsManager && inputManager) {
        player = new Player(physicsManager, inputManager);
        player.initializePhysics();

        // Set camera for third-person movement
        if (camera) {
          player.setCamera(camera);
        }

        console.log('✅ Player initialized');
      } else {
        throw new Error('Cannot initialize player: missing physics or input manager');
      }

      // Initialize pet
      console.log('🔄 Initializing pet...');
      if (scene) {
        pet = new Pet({
          position: new THREE.Vector3(0.6, 1.8, 0), // Start near player's shoulder
          size: 0.3,
          color: 0xff6b6b
        });
        pet.initialize(scene);
        console.log('🐾 Pet initialized successfully');
      }

      // Initialize camera controller
      console.log('🔄 Initializing camera controller...');
      if (camera && player && inputManager) {
        cameraController = new CameraController(
          camera,
          player,
          inputManager,
          {
            mode: CameraMode.THIRD_PERSON,
            distance: GAME_CONFIG.CAMERA_DISTANCE,
            height: GAME_CONFIG.CAMERA_HEIGHT,
            mouseSensitivity: GAME_CONFIG.MOUSE_SENSITIVITY
          }
        );
        console.log('✅ Camera controller initialized');
      } else {
        throw new Error('Cannot initialize camera controller: missing camera, player, or input manager');
      }

      // Initialize collectible manager with simple callbacks
      console.log('🔄 Initializing collectible manager...');
      if (physicsManager) {
        const collectibleConfig = {
          spawnDistance: 30,      // Spawn 30 units trước player (xa hơn để player thấy rõ)
          despawnDistance: 40,    // Despawn 40 units sau player
          spawnInterval: 300,     // Spawn mỗi 300ms để không quá dày đặc
          maxCollectibles: 15,    // Tối đa 15 collectibles cùng lúc
          laneWidth: 2.8         // Lane width
        };
        try {
          collectibleManager = new CollectibleManager(physicsManager, collectibleConfig, collectibleCallbacks);
          console.log('✅ Collectible manager initialized with config:', collectibleConfig);

          // Force spawn initial collectibles for immediate gameplay
          console.log('🎯 Force spawning initial collectibles for gameplay...');
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              if (collectibleManager) {
                (collectibleManager as any).trySpawnCollectible();
              }
            }, i * 150);
          }
        } catch (error) {
          console.error('❌ Failed to initialize CollectibleManager:', error);
          collectibleManager = null;
        }
      } else {
        throw new Error('Cannot initialize collectible manager: missing physics manager');
      }

      // Initialize game loop
      console.log('🔄 Initializing game loop...');
      gameLoop = new GameLoop();
      gameLoop.setUpdateCallback(update);
      gameLoop.setRenderCallback(render);
      console.log('✅ Game loop initialized');

    } catch (error) {
      console.error('❌ Failed to initialize game engine:', error);
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Setup the 3D scene
   */
    function setupScene() {
    if (!scene) return;

    try {
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(10, 20, 10);
      directionalLight.castShadow = true;

      // Configure shadow properties
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 50;
      directionalLight.shadow.camera.left = -20;
      directionalLight.shadow.camera.right = 20;
      directionalLight.shadow.camera.top = 20;
      directionalLight.shadow.camera.bottom = -20;

      scene.add(directionalLight);

      // Create ground plane - MUST match player's starting Y position!
      const GROUND_Y = 0; // Ground is at Y=0
      const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
      const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green
      groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
      groundMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
      groundMesh.position.y = GROUND_Y;
      groundMesh.receiveShadow = true;
      scene.add(groundMesh);

      // Create ground physics body (static collider for player to land on)
      // IMPORTANT: Physics body must be at same Y as visual ground
      if (physicsManager.isReady()) {
        const groundBody = physicsManager.createStaticBody(
          { x: 0, y: GROUND_Y, z: 0 }, // position - SAME as visual ground
          { x: 1000, y: 0.2, z: 1000 } // size (full extents, method divides by 2)
        );
        console.log(`✅ Ground physics body created at Y=${GROUND_Y}`);
      }

      // Add player mesh to scene
      if (player) {
        const playerMesh = player.getMesh();
        if (playerMesh) {
          scene.add(playerMesh);
        }
      }

      // Create some basic environment (placeholder)
      createEnvironment();

      // Collectibles will be spawned and synced with scene during gameplay

      console.log('🏗️ Scene setup complete - collectibles will be managed dynamically');
    } catch (error) {
      console.error('❌ Scene setup error:', error);
    }
  }

  /**
   * Create basic environment elements
   */
  function createEnvironment() {
    // Add some simple trees/structures for visual reference
    const treeGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4);
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown

    for (let i = 0; i < 10; i++) {
      const tree = new THREE.Mesh(treeGeometry, treeMaterial);
      tree.position.set(
        (Math.random() - 0.5) * 50,
        2,
        -20 - Math.random() * 100
      );
      tree.castShadow = true;
      scene.add(tree);
    }
  }

  // Removed generateInitialCollectibles - now handled by CollectibleManager

  // Removed generateCollectibles - now handled by CollectibleManager

  /**
   * Start the game
   */
  function startGame() {
    console.log('🎮 Starting game...');

    if (isGameRunning) {
      console.log('⚠️ Game already running');
      return;
    }

    if (!gameLoop) {
      console.error('❌ Cannot start game: gameLoop not initialized');
      return;
    }

    isGameRunning = true;
    isGameStarted = true;
    
    // Check initial input state
    if (inputManager) {
      const initialInputState = inputManager.getInputState();
      const initialJustPressed = inputManager.getJustPressedState();
      console.log('📊 Initial input state on game start:', {
        jump: initialInputState[InputAction.JUMP],
        justPressedJump: initialJustPressed.jump
      });
      
      if (initialJustPressed.jump) {
        console.error('⚠️⚠️⚠️ WARNING: justPressed.jump is TRUE on game start! This will cause auto-jump!');
      }
    }

      // Focus the canvas to enable keyboard inputs
    setTimeout(() => {
      if (canvas && canvas.focus) {
        canvas.focus();
        console.log('🎯 Canvas focused automatically on game start');
      }

      // Auto-request pointer lock when game starts
      if (inputManager) {
        console.log('🔒 Auto-requesting pointer lock on game start...');
        inputManager.requestPointerLock();
      }
    }, 100);

    gameLoop.start();
    console.log('🚀 Game started successfully');
  }

  /**
   * Pause the game
   */
  function pauseGame() {
    isGameRunning = false;
    if (gameLoop) {
      gameLoop.stop();
    }

    console.log('⏸️ Game paused');
  }

  /**
   * Resume the game
   */
  function resumeGame() {
    if (isGameRunning) return;

    isGameRunning = true;
    if (gameLoop) {
      gameLoop.start();
    }

    console.log('▶️ Game resumed');
  }

  async function exitToMainMenu() {
    console.log('🏠 Exiting to main menu...');

    // Sync earned energy to PocketBase before exiting
    if ($gameState.sessionTokenEarned > 0) {
      console.log(`💰 Syncing ${$gameState.sessionTokenEarned} earned energy point${$gameState.sessionTokenEarned > 1 ? 's' : ''} to PocketBase...`);
      try {
        const { pocketbaseService } = await import('$lib/services/pocketbaseService');
        const updatedEnergy = await pocketbaseService.addEnergyPoints($gameState.sessionTokenEarned);
        console.log('✅ Energy synced to PocketBase successfully!');

        // Update local tokenBalance and reset session earned
        gameState.update(state => ({
          ...state,
          tokenBalance: updatedEnergy.points,
          sessionTokenEarned: 0
        }));
      } catch (error) {
        console.error('❌ Failed to sync energy to PocketBase:', error);
      }
    }

    // Stop game loop
    if (gameLoop) {
      gameLoop.stop();
    }

    // Reset game state
    isGameRunning = false;

    // Navigate to main page
    window.location.href = '/';

    console.log('✅ Exited to main menu');
  }

  /**
   * Reset the game
   */
  async function resetGame() {
    console.log('🔄 Resetting game...');

    // Sync earned energy to PocketBase before resetting
    if ($gameState.sessionTokenEarned > 0) {
      console.log(`💰 Syncing ${$gameState.sessionTokenEarned} earned energy point${$gameState.sessionTokenEarned > 1 ? 's' : ''} to PocketBase...`);
      try {
        const { pocketbaseService } = await import('$lib/services/pocketbaseService');
        const updatedEnergy = await pocketbaseService.addEnergyPoints($gameState.sessionTokenEarned);
        console.log('✅ Energy synced to PocketBase successfully!');

        // Update local tokenBalance and reset session earned
        gameState.update(state => ({
          ...state,
          tokenBalance: updatedEnergy.points,
          sessionTokenEarned: 0
        }));
      } catch (error) {
        console.error('❌ Failed to sync energy to PocketBase:', error);
      }
    }

    // Stop game if running
    if (isGameRunning) {
      isGameRunning = false;
      if (gameLoop) {
        gameLoop.stop();
      }
    }

    // Reset game state
    isGameStarted = false;
    score = 0;

    // CollectibleManager will handle resetting collectibles

    // Reset player position (if player has reset method)
    if (player && typeof player.reset === 'function') {
      player.reset();
    }

    // Reset pet position
    if (pet && player) {
      const playerPos = player.getPosition();
      pet.setPosition(new THREE.Vector3(playerPos.x + 0.6, playerPos.y + 0.8, playerPos.z));
    }

    // Reset minimap data
    minimapData.collectibles = [];
    minimapData.playerPos = { x: 0, z: 0 };

    // Reset camera position (if camera controller has reset method)
    if (cameraController && typeof cameraController.reset === 'function') {
      cameraController.reset();
    }

    console.log('✅ Game reset complete');
  }

  /**
   * Game update logic
   */
  async function update(deltaTime) {
    if (!isGameRunning) return;

    try {
      // Update input first to capture current frame's input
      if (inputManager) {
        inputManager.update();

        // Handle pause with ESC
        const justPressed = inputManager.getJustPressedState();
        if (inputManager.getInputState()[InputAction.PAUSE]) {
          console.log('⏸️ PAUSE triggered from ESC key');
          isGameRunning = false;
          gameLoop.stop();
        }

        // Handle boost with W key (always available)
        if (justPressed.moveForward && player && isGameRunning) {
          console.log('🚀 TRIGGERING BOOST from W key...');
          player.startBoost();
          // Force update UI
          isBoostActive = player.getIsBoosting();
          console.log('🚀 Boost state updated:', isBoostActive);
        }
      }

      // Update physics
      if (physicsManager) {
        physicsManager.update(deltaTime);
      }

      // Update player
      if (player) {
        player.update(deltaTime);
        // Update boost state for reactive UI
        isBoostActive = player.getIsBoosting();

        // Debug log current speed and position
        if (isBoostActive) {
          if (Math.random() < 0.05) { // Log 5% of frames when boosting
            const pos = player.getPosition();
            console.log('🏃‍♂️ BOOSTING: Speed=', player.getSpeed(), 'Position Z=', pos.z.toFixed(2));
          }
        }
      }

      // Update pet to follow player
      if (pet && player) {
        const playerPos = player.getPosition();
        const playerMesh = player.getMesh(); // Need to get player's mesh for rotation
        if (playerMesh) {
          pet.update(playerPos, playerMesh.rotation);
        }
      }

      // Update camera with current input
      if (cameraController) {
        cameraController.update(deltaTime);
      }

      // Update game state
      await updateGameState(deltaTime);

      // Update FPS counter
      fps = Math.round(1 / deltaTime);

      // Update debug input state AFTER player update
      if (inputManager && player) {
        const inputState = inputManager.getInputState();
        const playerPos = player.getPosition();
        const physicsBody = player.getPhysicsBody();

        debugInputState = {
          jump: inputState[InputAction.JUMP],
          slide: inputState[InputAction.SLIDE],
          grounded: player.getIsGrounded(),
          lastKeyPressed: inputState[InputAction.JUMP] ? 'SPACE' : (inputState[InputAction.SLIDE] ? 'SHIFT' : debugInputState.lastKeyPressed),
          playerY: playerPos.y,
          groundLevel: 0.5,
          hasPhysicsBody: !!physicsBody
        };
      }

      // Clear justPressed state at end of frame
      if (inputManager) {
        inputManager.clearJustPressed();
      }
    } catch (error) {
      console.error('❌ Update error:', error);
    }
  }

  /**
   * Update game state
   */
  async function updateGameState(deltaTime) {
    // Collectibles are spawned automatically by CollectibleManager

    console.log(`🎮 Game update: deltaTime=${deltaTime.toFixed(3)}s, player exists=${!!player}`);

    if (!player) return;

    try {
      // Update score based on distance traveled
      const playerPosition = player.getPosition();
      const distanceScore = Math.floor(Math.abs(playerPosition.z));

      console.log(`📍 Player position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);

      // Update collectible manager (spawning and collision detection)
      console.log(`🎯 CollectibleManager status: ${collectibleManager ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
      if (collectibleManager) {
        // Set player reference for collision detection
        collectibleManager.setPlayer(player, debugCollision);
        console.log('🎯 Collectible manager update starting...');

        // Update collectibles (energy updated via callbacks when collisions occur)
        const collectiblePoints = collectibleManager.update(deltaTime);
        console.log(`🎯 CollectibleManager earned ${collectiblePoints} point${collectiblePoints > 1 ? 's' : ''} this frame`);

        // Sync collectible meshes with scene (add new ones, remove old ones)
        syncCollectibleMeshes();

        // Update total score (distance + collectibles)
        score = distanceScore + collectiblePoints;

        // Check for game over conditions (placeholder)
        if (playerPosition.y < -10) {
          // Game over logic would go here
          console.log('💀 Player fell off the world!');
        }

        // Update minimap data
        updateMinimapData(playerPosition);
      } else {
        console.error('❌ CollectibleManager not available - collectibles disabled');
      }

    } catch (error) {
      console.error('❌ Game state update error:', error);
    }
  }

  /**
   * Sync collectible meshes with scene
   */
  function syncCollectibleMeshes() {
    if (!scene || !collectibleManager) return;

    // Get current meshes from CollectibleManager
    const currentMeshes = collectibleManager.getMeshes();

    // Get meshes currently in scene
    const sceneCollectibles = scene.children.filter(child =>
      child.userData && child.userData.isCollectible
    );

    // Add new meshes to scene
    let addedCount = 0;
    currentMeshes.forEach(mesh => {
      if (!scene.children.includes(mesh)) {
        mesh.userData = { isCollectible: true };
        scene.add(mesh);
        addedCount++;
      }
    });

    // Remove old meshes from scene
    let removedCount = 0;
    sceneCollectibles.forEach(mesh => {
      if (!currentMeshes.includes(mesh)) {
        scene.remove(mesh);
        removedCount++;
      }
    });

    // Log collectible status
    if (addedCount > 0 || removedCount > 0 || currentMeshes.length > 0) {
      console.log(`🔄 Collectible meshes: +${addedCount} added, -${removedCount} removed, total active: ${currentMeshes.length}`);
    }
  }

  /**
   * Update minimap data with current player and collectible positions
   */
  function updateMinimapData(playerPosition: THREE.Vector3) {
    try {
      // Player is always at center (0, 0) on minimap
      minimapData.playerPos = { x: 0, z: 0 };

      // Update collectibles positions (relative to player)
      minimapData.collectibles = [];

      // Get all collectibles from scene
      if (scene) {
        scene.children.forEach(child => {
          if (child.userData && child.userData.isCollectible) {
            const collectibleMesh = child as THREE.Mesh;
            const collectiblePos = collectibleMesh.position;

            // Calculate relative position to player
            const relativeX = collectiblePos.x - playerPosition.x;
            const relativeZ = collectiblePos.z - playerPosition.z;

            // Only show collectibles within minimap range (15 units for better accuracy)
            if (Math.abs(relativeX) <= 15 && Math.abs(relativeZ) <= 15) {
              minimapData.collectibles.push({
                x: relativeX,
                z: relativeZ,
                type: child.userData.collectibleType || 'energy'
              });

              // Debug: log first few collectibles
              if (minimapData.collectibles.length <= 3) {
                console.log(`📍 Collectible at (${collectiblePos.x.toFixed(1)}, ${collectiblePos.z.toFixed(1)}), relative: (${relativeX.toFixed(1)}, ${relativeZ.toFixed(1)})`);
              }
            }
          }
        });
      }

      // Limit to maximum 15 collectibles for performance
      if (minimapData.collectibles.length > 15) {
        minimapData.collectibles = minimapData.collectibles.slice(0, 15);
      }
    } catch (error) {
      console.error('❌ Minimap update error:', error);
    }
  }

  /**
   * Render the scene
   */
  function render(deltaTime) {
    if (!renderer || !scene || !camera) return;

    try {
      // Update collectible meshes in scene
      updateSceneMeshes();

      // Render the scene
      renderer.render(scene, camera);
    } catch (error) {
      console.error('❌ Render error:', error);
    }
  }

  /**
   * Update collectible meshes in scene (simplified - collectibles are now static)
   */
  function updateSceneMeshes() {
    // Collectibles are now added directly to scene and don't need updating
    // This function is kept for compatibility but does minimal work
    if (!scene) return;

    try {
      // Count collectibles in scene for debugging
      const collectiblesInScene = scene.children.filter(child =>
        child.userData && child.userData.isCollectible
      ).length;

      if (collectiblesInScene > 0) {
        console.log(`🎮 Scene has ${collectiblesInScene} collectibles`);
      }
    } catch (error) {
      console.error('❌ Scene mesh update error:', error);
    }
  }

  /**
   * Handle window resize
   */
  function handleResize() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Removed all particle spawning and blockchain-related functions - simplified gameplay

  /**
   * Cleanup resources
   */
  function cleanup() {
    try {
      if (gameLoop) {
        gameLoop.stop();
        gameLoop = null;
      }

      if (inputManager) {
        inputManager.destroy();
        inputManager = null;
      }

      if (cameraController) {
        cameraController.destroy();
        cameraController = null;
      }

      if (player) {
        player.destroy();
        player = null;
      }

      // Destroy pet
      if (pet && scene) {
        pet.destroy(scene);
        pet = null;
      }

      // Disconnect particle spawning WebSocket
      if (particleSpawnWebSocket) {
        particleSpawnWebSocket.close();
        particleSpawnWebSocket = null;
      }

      // Collectibles are now managed directly in scene, no manager to destroy

      if (physicsManager) {
        physicsManager.destroy();
        physicsManager = null;
      }

      if (renderer) {
        renderer.dispose();
      }

      if (tooltipObserver) {
        tooltipObserver.disconnect();
        tooltipObserver = null;
      }

      console.log('🧹 Game cleanup complete');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }

  // Keyboard shortcuts for testing
  function handleKeyPress(event) {
    switch (event.key.toLowerCase()) {
      case 'p':
        if (isGameRunning) {
          pauseGame();
        } else {
          resumeGame();
        }
        break;
      case 'r':
        resetGame();
        break;
      case 'c':
        // Manual collectible spawn for testing (disabled)
        console.log('🎮 Manual collectible spawn disabled - collectibles are now auto-generated');
        break;
      case 'e':
        // Debug energy balance
        console.log('🔍 Energy balance debug:');
        console.log(`  Game state tokenBalance: ${$gameState.tokenBalance || 0} point${($gameState.tokenBalance || 0) !== 1 ? 's' : ''}`);
        console.log(`  Session earned: ${$gameState.sessionTokenEarned || 0} point${($gameState.sessionTokenEarned || 0) !== 1 ? 's' : ''}`);
        console.log(`  Last known balance: ${lastKnownEnergyBalance} point${lastKnownEnergyBalance !== 1 ? 's' : ''}`);
        break;
      case 's':
        // Force spawn collectibles for testing
        console.log('🎯 Force spawning collectibles for testing...');
        if (collectibleManager) {
          // Force spawn by resetting spawn timer and calling spawn method
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              if (collectibleManager) {
                (collectibleManager as any)._lastSpawnTime = 0; // Reset spawn timer
                (collectibleManager as any).trySpawnCollectible();
                console.log(`✅ Forced spawn attempt ${i + 1}`);
              }
            }, i * 200);
          }
        } else {
          console.error('❌ CollectibleManager not available for force spawn');
        }
        break;
      case 'd':
        // Toggle collision debug mode
        debugCollision = !debugCollision;
        console.log(`🔍 Collision debug ${debugCollision ? 'ENABLED' : 'DISABLED'}`);
        if (debugCollision) {
          console.log('📏 Collision threshold: 2.5 units');
          console.log('💡 Press D again to disable collision debug');
        }
        break;
    }
  }

  // Removed updateEnergyBalance - energy is now updated locally via collectibleCallbacks
</script>

<svelte:window on:resize={handleResize} on:keydown={handleKeyPress} />

<div class="game-container" on:click={() => {
    if (canvas && canvas.focus) {
      canvas.focus();
      console.log('🎯 Game container clicked, focusing canvas:', document.activeElement === canvas);
    }
  }}>
  <!-- Three.js Canvas -->
  <canvas
    bind:this={canvas}
    class="game-canvas"
    tabindex="0"
    title=""
    on:mousedown={(e) => {
      console.log('🖱️ SVELTE mousedown event triggered!', e.button, 'at', e.clientX, e.clientY);
      e.preventDefault && e.preventDefault();
      e.stopPropagation && e.stopPropagation();
      canvas?.focus();

      console.log('🖱️ Canvas mousedown, focused:', document.activeElement === canvas);
    }}
    on:click={(e) => {
      e.preventDefault && e.preventDefault();
      e.stopPropagation && e.stopPropagation();
      canvas?.focus();
      console.log('🖱️ Canvas click, focused:', document.activeElement === canvas);
    }}
    on:mouseup={(e) => {
      e.preventDefault && e.preventDefault();
      e.stopPropagation && e.stopPropagation();
    }}
    on:focus={() => console.log('🎯 Canvas focused')}
    on:blur={() => console.log('😵 Canvas blurred')}
    on:contextmenu={(e) => e.preventDefault && e.preventDefault()}
  ></canvas>

  <!-- HUD Overlay -->
  <div class="hud">
    <div class="hud-top">
      <!-- Token Balance Component - Only show when authenticated -->
      {#if isAuthenticated}
        <TokenBalance />
      {:else}
        <div class="auth-message">
          <p>🔐 Đăng nhập để xem token balance</p>
        </div>
      {/if}

      <!-- Token History Component - Only show when authenticated -->
      {#if isAuthenticated}
        <TokenHistory />
      {/if}

      <div class="score">Score: {score}</div>
      <div class="fps">FPS: {fps}</div>
      {#if isBoostActive}
        <div class="boost-indicator">🚀 BOOST ACTIVE!</div>
      {/if}
    </div>

    <!-- Minimap -->
    <div class="minimap-container">
      <div class="minimap">
        <!-- Player indicator (always at center) -->
        <div class="minimap-player" style="left: 50%; top: 50%;"></div>

        <!-- Collectible indicators (relative to player) -->
        {#each minimapData.collectibles as collectible}
          <div
            class="minimap-collectible"
            style="left: {50 + collectible.x * 2.5}px; top: {50 + collectible.z * 2.5}px;"
          ></div>
        {/each}
      </div>
    </div>

    <div class="hud-center">
      {#if !isGameStarted}
        <div class="start-screen">
          <h1>Infinite Runner 3D</h1>
          <p><strong>Third-Person Mode:</strong></p>
          <p>• <strong>Click on the game area first</strong> to enable keyboard controls</p>
          <p>• Move mouse to rotate camera (ultra-sensitive up/down/left/right control)</p>
          <p>• W/↑ or A/D/←/→ to move (relative to camera direction)</p>
          <p>• Space to jump, Shift/↓ to slide</p>
          <p>• <strong>Click anywhere to BOOST (5 seconds, 4x speed!)</strong></p>
          <p>• <strong>Your pet companion follows you on your shoulder!</strong></p>
          <p>• <strong>Minimap shows your position and energy collectibles</strong></p>
          <p>• <strong>Collect energy orbs ahead for +1 point each!</strong></p>
          <p>• Character faces movement direction</p>
          <br>
          <p><em>Camera always follows player smoothly. Ultra-sensitive mouse rotation (full up/down/left/right control), ultra-fast zoom, perfect tracking!</em></p>
          <button on:click={startGame}>Start Game</button>
        </div>
      {:else if !isGameRunning}
        <div class="pause-screen">
          <h2>Game Paused</h2>
          <button on:click={resumeGame}>Resume</button>
          <button on:click={exitToMainMenu} style="background: #e74c3c; margin-left: 10px;">Exit to Main Menu</button>
        </div>
      {/if}
    </div>

    <div class="hud-bottom">
      <div class="controls">
        <div class="control-hint">
          <span>P</span> - Pause/Resume |
          <span>R</span> - Reset |
          <span>D</span> - Debug Collision |
          <span class="focus-indicator" class:focused={document.activeElement === canvas}>🎯 {document.activeElement === canvas ? 'Focused' : 'Click to Focus'}</span>
        </div>
      </div>
    </div>

    <!-- Debug Panel for Authentication Status -->
    {#if showDebugPanel}
      <div class="debug-panel" style="position: absolute; top: 10px; left: 10px; z-index: 1000;">
        <div class="debug-title">🔐 Auth Debug</div>
        <div class="debug-item">
          <span>Authenticated:</span>
          <span class="active">{$authStore.isAuthenticated ? '✅ Yes' : '❌ No'}</span>
        </div>
        <div class="debug-item">
          <span>Access Token:</span>
          <span class="active">{!!$authStore.tokens?.access_token ? '✅ Yes' : '❌ No'}</span>
        </div>
        <div class="debug-item">
          <span>User:</span>
          <span class="active">{$authStore.user?.email || 'None'}</span>
        </div>
        <div class="debug-item">
          <span>User ID:</span>
          <span class="active">{$authStore.user?.id || 'None'}</span>
        </div>
      </div>
    {/if}

    <!-- Debug Toggle Button - HIDDEN -->
    <!-- <button
      style="position: absolute; top: 10px; right: 10px; z-index: 1000; padding: 5px 10px; background: rgba(0,0,0,0.8); color: white; border: 1px solid #4a90e2; border-radius: 5px; cursor: pointer; display: none;"
      on:click={() => showDebugPanel = !showDebugPanel}
    >
      🔧 Debug
    </button> -->

    <!-- Test Spawn Collectibles Button - HIDDEN -->
    <!-- <button
      style="position: absolute; top: 40px; right: 10px; z-index: 1000; padding: 5px 10px; background: rgba(255,0,0,0.8); color: white; border: 1px solid #ff4444; border-radius: 5px; cursor: pointer; font-size: 12px; display: none;"
      on:click={() => {
        if (collectibleManager) {
          console.log('🧪 Force spawning collectibles...');
          // Force set pool tokens to allow spawning
          collectibleManager.updatePoolBalance(100);
          // Try to spawn immediately
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              if (collectibleManager) {
                // Force spawn by manipulating internal state
                collectibleManager['_lastSpawnTime'] = 0;
                collectibleManager['trySpawnCollectible']();
              }
            }, i * 100);
          }
        } else {
          console.error('❌ No collectible manager available');
        }
      }}
    >
      🧪 Spawn Test
    </button> -->
  </div>
</div>

<style>
  .game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000;
  }

  .game-container:focus-within {
    outline: 2px solid #4a90e2;
  }

  .game-canvas {
    display: block;
    width: 100%;
    height: 100%;
    outline: none;
    cursor: crosshair;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    touch-action: none;
    position: relative;
    z-index: 1;
    /* Hide browser tooltips and notifications */
    pointer-events: auto;
  }

  /* Hide browser cursor tooltip when in pointer lock */
  .game-canvas:-webkit-full-screen {
    cursor: none;
  }

  /* Hide any browser notifications or tooltips */
  .game-container * {
    pointer-events: auto !important;
  }

  /* Hide browser tooltips completely */
  [role="tooltip"],
  .tooltip,
  #tooltip,
  .browser-tooltip,
  .cursor-tooltip {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }

  /* Override any browser tooltip styles */
  * {
    pointer-events: none !important;
  }

  /* Hide cursor indicator when in pointer lock */
  body:not(.pointer-locked) .game-canvas {
    cursor: crosshair;
  }

  body.pointer-locked .game-canvas {
    cursor: none;
  }

  .game-canvas:focus {
    outline: 2px solid #4a90e2;
  }

  .hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: auto;
    font-family: 'Arial', sans-serif;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    z-index: 2;
  }

  .hud button {
    pointer-events: auto;
  }

  .hud-top {
    position: absolute;
    top: 20px;
    left: 20px;
    display: flex;
    gap: 30px;
    flex-wrap: wrap;
  }

  .score, .fps {
    font-size: 24px;
    font-weight: bold;
  }

  .boost-indicator {
    font-size: 28px;
    font-weight: bold;
    color: #ffcc00;
    text-shadow: 0 0 10px rgba(255, 204, 0, 0.8);
    animation: pulse-boost 0.5s infinite alternate;
  }

  @keyframes pulse-boost {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.1);
    }
  }

  .minimap-container {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1001;
  }

  .minimap {
    width: 120px;
    height: 120px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(4px);
  }

  .minimap-player {
    position: absolute;
    width: 8px;
    height: 8px;
    background: #4a90e2;
    border: 2px solid #ffffff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 6px rgba(74, 144, 226, 0.9);
    z-index: 3;
  }

  .minimap-collectible {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #f39c12;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 3px rgba(243, 156, 18, 0.6);
    z-index: 1;
  }

  /* Minimap grid overlay - adjusted for better scale */
  .minimap::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 16px 16px;
    pointer-events: none;
  }

  .debug-panel {
    background: rgba(0, 0, 0, 0.8);
    padding: 15px;
    border-radius: 8px;
    border: 2px solid #4a90e2;
    min-width: 300px;
  }

  .debug-title {
    font-size: 18px;
    font-weight: bold;
    color: #4a90e2;
    margin-bottom: 10px;
    text-align: center;
  }

  .debug-item {
    font-size: 14px;
    margin: 5px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .debug-item span {
    color: #888;
  }

  .debug-item span.active {
    color: #4ecdc4;
    font-weight: bold;
  }

  .debug-item strong {
    color: #ffa500;
  }

  .hud-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: auto;
  }

  .start-screen, .pause-screen {
    background: rgba(0, 0, 0, 0.8);
    padding: 40px;
    border-radius: 10px;
    border: 2px solid #4a90e2;
  }

  .start-screen h1 {
    font-size: 48px;
    margin-bottom: 20px;
    color: #4a90e2;
  }

  .start-screen p {
    font-size: 18px;
    margin-bottom: 10px;
  }

  .pause-screen h2 {
    font-size: 36px;
    margin-bottom: 20px;
    color: #ffa500;
  }

  button {
    background: #4a90e2;
    color: white;
    border: none;
    padding: 15px 30px;
    font-size: 18px;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 20px;
    transition: background-color 0.3s;
    pointer-events: auto;
  }

  button:hover {
    background: #357abd;
  }

  .hud-bottom {
    position: absolute;
    bottom: 20px;
    right: 20px;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .control-hint {
    font-size: 14px;
    background: rgba(0, 0, 0, 0.6);
    padding: 5px 10px;
    border-radius: 3px;
  }

  .focus-indicator {
    color: #ff6b6b;
    font-weight: bold;
  }

  .focus-indicator.focused {
    color: #4ecdc4;
  }

  /* Minimap responsive */
  @media (max-width: 768px) {
    .minimap-container {
      top: 15px;
      right: 15px;
    }

    .minimap {
      width: 100px;
      height: 100px;
    }

    .minimap::before {
      background-size: 16px 16px;
    }
  }

  @media (max-width: 480px) {
    .minimap-container {
      top: 10px;
      right: 10px;
    }

    .minimap {
      width: 80px;
      height: 80px;
    }

    .minimap::before {
      background-size: 12px 12px;
    }

    .minimap-player {
      width: 6px;
      height: 6px;
      border-width: 1px;
    }

    .minimap-collectible {
      width: 3px;
      height: 3px;
    }
  }

  /* Auth message styling */
  .auth-message {
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #ff6b35;
    border-radius: 8px;
    padding: 10px 15px;
    color: #fff;
    font-size: 14px;
    text-align: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .auth-message p {
    margin: 0;
    font-weight: bold;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .hud-top {
      font-size: 16px;
      gap: 15px;
    }

    .start-screen h1 {
      font-size: 32px;
    }

    .start-screen p {
      font-size: 14px;
    }
  }
</style>
