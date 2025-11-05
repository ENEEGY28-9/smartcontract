import { InputAction, GAME_CONFIG, Vector3 } from '../utils/Constants';

// Re-export InputAction for other modules
export { InputAction };

interface InputBinding {
  keys: string[];
  mouse?: { button: number };
  touch?: { element?: string };
  gamepad?: { button: number };
}

interface InputState {
  [InputAction.MOVE_LEFT]: boolean;
  [InputAction.MOVE_RIGHT]: boolean;
  [InputAction.MOVE_FORWARD]: boolean;
  [InputAction.JUMP]: boolean;
  [InputAction.SLIDE]: boolean;
  [InputAction.PAUSE]: boolean;
  [InputAction.CAMERA_ROTATE]: boolean;
  [InputAction.MOUSE_MOVE_X]: number;  // Mouse X movement for strafing
  [InputAction.MOUSE_MOVE_Y]: number;  // Mouse Y movement for forward/backward
}

interface JustPressedState {
  [InputAction.JUMP]: boolean;
  [InputAction.SLIDE]: boolean;
  [InputAction.MOVE_FORWARD]: boolean;
}

interface MouseInput {
  movementX: number;
  movementY: number;
  accumulatedMovementX: number;
  accumulatedMovementY: number;
  buttons: { [key: number]: boolean };
}

export class InputManager {
  private inputBindings: Map<InputAction, InputBinding> = new Map();
  private inputState: InputState = {
    [InputAction.MOVE_LEFT]: false,
    [InputAction.MOVE_RIGHT]: false,
    [InputAction.MOVE_FORWARD]: false,
    [InputAction.JUMP]: false,
    [InputAction.SLIDE]: false,
    [InputAction.PAUSE]: false,
    [InputAction.CAMERA_ROTATE]: false,
    [InputAction.MOUSE_MOVE_X]: 0,  // Mouse X movement for strafing
    [InputAction.MOUSE_MOVE_Y]: 0,  // Mouse Y movement for forward/backward
  };

  private justPressedState: JustPressedState = {
    [InputAction.JUMP]: false,
    [InputAction.SLIDE]: false,
    [InputAction.MOVE_FORWARD]: false,
  };

  private mouseInput: MouseInput = {
    movementX: 0,
    movementY: 0,
    accumulatedMovementX: 0,
    accumulatedMovementY: 0,
    buttons: {},
  };

  // Fallback mouse position tracking for better compatibility
  private lastMousePosition = { x: 0, y: 0 };
  private isMouseTracking = false;
  private mousePositionInitialized = false;

  private touchStartPos = new Vector3(0, 0, 0);
  private touchCurrentPos = new Vector3(0, 0, 0);
  private isTouchActive = false;

  private canvas: HTMLCanvasElement | null = null;

  // Bound event handlers to preserve 'this' context
  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleKeyUp = this.handleKeyUp.bind(this);
  private boundHandlePointerLockChange = this.handlePointerLockChange.bind(this);
  private boundHandleGlobalMouseMove = this.handleGlobalMouseMove.bind(this);
  private boundHandleTouchStart = this.handleTouchStart.bind(this);
  private boundHandleTouchMove = this.handleTouchMove.bind(this);
  private boundHandleTouchEnd = this.handleTouchEnd.bind(this);

  constructor() {
    this.setupDefaultBindings();
    // Don't setup event listeners in constructor - wait for setCanvas to be called
  }

  /**
   * Setup default input bindings
   */
  private setupDefaultBindings(): void {
    // Keyboard bindings
    this.inputBindings.set(InputAction.MOVE_LEFT, { keys: ['a', 'A', 'ArrowLeft'] });
    this.inputBindings.set(InputAction.MOVE_RIGHT, { keys: ['d', 'D', 'ArrowRight'] });
    this.inputBindings.set(InputAction.MOVE_FORWARD, { keys: ['w', 'W', 'ArrowUp'] });
    this.inputBindings.set(InputAction.JUMP, { keys: [' ', 'Space'] }); // Support both space variants
    this.inputBindings.set(InputAction.SLIDE, { keys: ['Shift', 'ShiftLeft', 'ShiftRight', 'ArrowDown'] }); // Support multiple Shift variants
    this.inputBindings.set(InputAction.PAUSE, { keys: ['Escape'] }); // ESC for pause (replaced P)
    // Remove EXIT_POINTER_LOCK since ESC is now used for PAUSE

    // Mouse bindings
    this.inputBindings.set(InputAction.CAMERA_ROTATE, { keys: [], mouse: { button: 0 } }); // Left mouse button
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    console.log('🔧 Setting up event listeners...');
    
    // Remove existing event listeners first to avoid duplicates
    if (document.removeEventListener) {
      document.removeEventListener('keydown', this.boundHandleKeyDown);
      document.removeEventListener('keyup', this.boundHandleKeyUp);
    }
    
    // Keyboard events - attach to BOTH document and canvas for maximum compatibility
    if (document.addEventListener) {
      document.addEventListener('keydown', this.boundHandleKeyDown);
      document.addEventListener('keyup', this.boundHandleKeyUp);
      console.log('✅ Keyboard event listeners attached to document');
    } else {
      console.error('❌ document.addEventListener not available!');
    }

    // Also attach keyboard listeners to canvas for better focus handling
    if (this.canvas && this.canvas.addEventListener) {
      this.canvas.addEventListener('keydown', this.boundHandleKeyDown);
      this.canvas.addEventListener('keyup', this.boundHandleKeyUp);
      console.log('✅ Keyboard event listeners also attached to canvas');
    }

    // Pointer lock events
    if (document.addEventListener) {
      document.addEventListener('pointerlockchange', this.boundHandlePointerLockChange);

      // Global mouse move listener for fallback mouse tracking when outside canvas
      document.addEventListener('mousemove', this.boundHandleGlobalMouseMove);

      // Touch events for mobile
      document.addEventListener('touchstart', this.boundHandleTouchStart);
      document.addEventListener('touchmove', this.boundHandleTouchMove);
      document.addEventListener('touchend', this.boundHandleTouchEnd);
    }

    // Canvas-specific events - attach if canvas is available
    // Note: Mouse events are only attached to canvas, not document level
    // to avoid conflicts and ensure proper capture
    if (this.canvas) {
      this.setupCanvasEventListeners();
    }
  }

  /**
   * Setup canvas-specific event listeners
   */
  private setupCanvasEventListeners(): void {
    if (!this.canvas) return;

    // Remove existing canvas listeners first to prevent duplicates
    this.removeCanvasEventListeners();

    // Add all necessary mouse events to canvas
    // Note: These replace the document-level mouse events to avoid conflicts
    if (this.canvas.addEventListener) {
      this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
      this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
      this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
      this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
      this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      this.canvas.addEventListener('click', (event) => this.handleCanvasClick(event));
    }

    console.log('🖱️ Canvas event listeners attached successfully');

    // Debug: Check if event listeners are actually attached
    console.log('🔍 Event listener verification:', {
      mousedownAttached: this.canvas.onmousedown !== null,
      mouseupAttached: this.canvas.onmouseup !== null,
      mousemoveAttached: this.canvas.onmousemove !== null,
      mouseenterAttached: this.canvas.onmouseenter !== null,
      mouseleaveAttached: this.canvas.onmouseleave !== null,
      clickAttached: this.canvas.onclick !== null
    });
  }

  private removeCanvasEventListeners(): void {
    if (this.canvas) {
      if (this.canvas.removeEventListener) {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
        this.canvas.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.removeEventListener('click', (event) => this.handleCanvasClick(event));
      }
    }

    // Don't remove global mouse move listener - keep it for fallback mouse tracking
    // document.removeEventListener('mousemove', this.handleGlobalMouseMove.bind(this));
  }

  /**
   * Handle canvas click for pointer lock
   */
  private handleCanvasClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.doRequestPointerLock();
  }

  /**
   * Internal method to request pointer lock
   */
  private doRequestPointerLock(): void {
    if (this.canvas && (document.pointerLockElement !== this.canvas) && this.canvas.requestPointerLock) {
      const promise = this.canvas.requestPointerLock();
      if (promise && promise.then && promise.catch) {
        promise.then(() => {
          console.log('🖱️ Pointer lock acquired successfully');
          this.isMouseTracking = true;
        }).catch(err => {
          console.log('🖱️ Pointer lock request failed:', err.message);
          // Fallback to global mouse tracking
          this.isMouseTracking = true;
          console.log('🖱️ Falling back to global mouse tracking');
        });
      } else {
        // Fallback for browsers that don't return a promise
        console.log('🖱️ Pointer lock not supported or failed');
        this.isMouseTracking = true;
      }
    }
  }

  /**
   * Request pointer lock (called on game start)
   */
  requestPointerLock(): void {
    console.log('🔒 Requesting pointer lock on game start...');
    this.doRequestPointerLock();
  }

  /**
   * Exit pointer lock (called by ESC key)
   */
  exitPointerLock(): void {
    if (document.pointerLockElement && document.pointerLockElement === this.canvas) {
      console.log('🔓 Exiting pointer lock via ESC');
      document.exitPointerLock();
    } else {
      console.log('⚠️ No pointer lock active to exit');
    }
  }

  /**
   * Handle key down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key || '';
    const code = event.code || '';
    
    // Try to match action by key first, then by code (for special keys)
    let action = this.getActionFromKey(key);
    
    // Fallback: Try matching by code for special keys (Space, Shift, Arrow keys)
    if (!action) {
      action = this.getActionFromCode(code);
    }

    console.log(`⌨️ Key down: "${key}" (code: ${code}, keyCode: ${event.keyCode}), action: ${action || 'none'}`);

    if (action) {
      // Prevent repeated keydown events for jump, slide, and move forward
      if ((action === InputAction.JUMP || action === InputAction.SLIDE || action === InputAction.MOVE_FORWARD) && this.inputState[action]) {
        console.log(`⚠️ Ignoring repeated ${action} keydown (already pressed)`);
        event.preventDefault();
        return;
      }

      this.inputState[action] = true;

      // For jump, slide, and move forward, ONLY set justPressed if it wasn't already set
      if (action === InputAction.JUMP || action === InputAction.SLIDE || action === InputAction.MOVE_FORWARD) {
        if (!this.justPressedState[action]) {
          this.justPressedState[action] = true;
          console.log(`🎯 Just pressed state set for ${action}`);
        } else {
          console.log(`⚠️ justPressed already set for ${action} - ignoring`);
        }
      }

      console.log(`✅ Action activated: ${action}`);
      event.preventDefault();
    }
  }

  /**
   * Handle key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key || '';
    const code = event.code || '';
    
    // Try to match action by key first, then by code (for special keys)
    let action = this.getActionFromKey(key);
    
    // Fallback: Try matching by code for special keys (Space, Shift, Arrow keys)
    if (!action) {
      action = this.getActionFromCode(code);
    }

    console.log(`⌨️ Key up: "${key}" (code: ${code}, keyCode: ${event.keyCode}), action: ${action || 'none'}`);

    if (action) {
      this.inputState[action] = false;
      
      // Clear justPressed state on key up (not in clearJustPressed!)
      if (action === InputAction.JUMP) {
        this.justPressedState[InputAction.JUMP] = false;
        console.log(`🧹 Cleared justPressed.jump on keyup`);
      }
      if (action === InputAction.SLIDE) {
        this.justPressedState[InputAction.SLIDE] = false;
        console.log(`🧹 Cleared justPressed.slide on keyup`);
      }
      if (action === InputAction.MOVE_FORWARD) {
        this.justPressedState[InputAction.MOVE_FORWARD] = false;
        console.log(`🧹 Cleared justPressed.move_forward on keyup`);
      }
      
      console.log(`❌ Action deactivated: ${action}`);
      event.preventDefault();
    }
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    console.log('🖱️ Mouse down event captured:', {
      button: event.button || 0,
      target: event.target || null,
      currentTarget: event.currentTarget || null,
      canvas: this.canvas
    });

    const action = this.getActionFromMouseButton(event.button || 0);
    if (action) {
      this.inputState[action] = true;

      // Auto-request pointer lock when user starts camera rotation (right mouse button only)
      if (action === InputAction.CAMERA_ROTATE && (event.button || 0) === 2) {
        this.doRequestPointerLock();
      }
    }
    this.mouseInput.buttons[event.button || 0] = true;

    // Prevent default to ensure proper capture
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    const action = this.getActionFromMouseButton(event.button || 0);
    if (action) {
      this.inputState[action] = false;
    }
    this.mouseInput.buttons[event.button || 0] = false;

    // Prevent default to ensure proper capture
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle mouse move events (canvas-specific)
   */
  private handleCanvasMouseMove(event: MouseEvent): void {
    this.handleMouseMovement(event);
  }

  /**
   * Public method to handle mouse move events (for external calls)
   */
  public handleMouseMove(event: MouseEvent): void {
    this.handleMouseMovement(event);
  }

  /**
   * Handle global mouse move events (captures movement even when outside canvas)
   */
  private handleGlobalMouseMove(event: MouseEvent): void {
    // Process global mouse movement in multiple scenarios:
    // 1. When pointer lock is active (mouse movement is captured globally)
    // 2. When actively tracking (always capture mouse movement for camera rotation)
    // 3. When mouse is outside canvas but we still want to track movement
    const hasPointerLock = document.pointerLockElement && document.pointerLockElement === this.canvas;

    if (hasPointerLock) {
      // With pointer lock, all mouse movement is captured globally
      this.handleMouseMovement(event, false); // Use full sensitivity with pointer lock
    } else if (this.isMouseTracking) {
      // Always capture mouse movement when tracking is active
      // This ensures camera rotation works even when mouse moves outside canvas
      this.handleMouseMovement(event, true); // Global movement with reduced sensitivity
    }

    // Prevent default for global mouse events when pointer lock is active
    if (hasPointerLock) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Check if mouse is over the canvas
   */
  private isMouseOverCanvas(event: MouseEvent): boolean {
    if (!this.canvas) return false;

    const rect = this.canvas && this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { left: 0, right: 0, top: 0, bottom: 0 };
    return (event.clientX || 0) >= rect.left &&
           (event.clientX || 0) <= rect.right &&
           (event.clientY || 0) >= rect.top &&
           (event.clientY || 0) <= rect.bottom;
  }

  /**
   * Handle mouse movement (shared logic for both canvas and global events)
   */
  private handleMouseMovement(event: MouseEvent, isGlobal = false): void {
    // Debug: Log mouse move events for troubleshooting
    console.log('🖱️ Mouse move event captured:', {
      type: isGlobal ? 'global' : 'canvas',
      movementX: event.movementX || 0,
      movementY: event.movementY || 0,
      clientX: event.clientX || 0,
      clientY: event.clientY || 0,
      target: event.target || null,
      currentTarget: event.currentTarget || null,
      canvas: this.canvas,
      canvasRect: this.canvas && this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : null
    });

    let deltaX = 0;
    let deltaY = 0;

    // Use movementX/Y if available (modern browsers with pointer lock)
    if (event.movementX !== undefined && event.movementY !== undefined && event.movementX !== null && event.movementY !== null) {
      deltaX = event.movementX;
      deltaY = event.movementY; // Natural Y axis: positive when moving down
      if (!isGlobal) {
        console.log(`🖱️ Using pointer lock movement: deltaX=${deltaX}, deltaY=${deltaY}, pointerLock=${document.pointerLockElement !== null && document.pointerLockElement !== undefined}`);
      }
    } else {
      // Fallback: calculate movement from position change
      // This is more reliable for continuous mouse movement
      const currentX = event.clientX || 0;
      const currentY = event.clientY || 0;

      if (this.mousePositionInitialized && this.lastMousePosition.x !== 0 && this.lastMousePosition.y !== 0) {
        deltaX = currentX - this.lastMousePosition.x;
        deltaY = currentY - this.lastMousePosition.y; // Natural Y axis: positive when moving down
      } else {
        // Initialize tracking on first mouse move
        deltaX = 0;
        deltaY = 0;
        this.mousePositionInitialized = true;
      }

      this.lastMousePosition.x = currentX;
      this.lastMousePosition.y = currentY;

      if (deltaX !== 0 || deltaY !== 0 && !isGlobal) {
        console.log(`🖱️ Using position tracking: deltaX=${deltaX}, deltaY=${deltaY}`);
      }
    }

    // Apply reduced sensitivity for global mouse movement to prevent excessive rotation
    // But ensure minimum sensitivity for vertical movement even in global mode
    const sensitivityMultiplier = isGlobal ? 0.5 : 1.0; // Increased from 0.3 to 0.5 for better global sensitivity

    // Always accumulate movement for camera controller (if still needed)
    this.mouseInput.accumulatedMovementX += deltaX * sensitivityMultiplier;
    this.mouseInput.accumulatedMovementY += deltaY * sensitivityMultiplier;

    // Update input state with mouse movement for player movement control
    // Mouse X controls strafing (left/right), Mouse Y controls forward/backward
    this.inputState[InputAction.MOUSE_MOVE_X] = deltaX * sensitivityMultiplier;
    this.inputState[InputAction.MOUSE_MOVE_Y] = deltaY * sensitivityMultiplier;

    // Update current movement for compatibility
    this.mouseInput.movementX = deltaX * sensitivityMultiplier;
    this.mouseInput.movementY = deltaY * sensitivityMultiplier;

    // Enhanced debug logging for mouse movement
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      console.log(`🎯 Mouse movement captured: deltaX=${deltaX.toFixed(3)}, deltaY=${deltaY.toFixed(3)}, accumulatedX=${this.mouseInput.accumulatedMovementX.toFixed(3)}, accumulatedY=${this.mouseInput.accumulatedMovementY.toFixed(3)}, isGlobal=${isGlobal}, sensitivity=${sensitivityMultiplier}`);
    }

    // Prevent default behavior to ensure continuous mouse movement
    if (!isGlobal) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Handle mouse enter events
   */
  private handleMouseEnter(event: MouseEvent): void {
    console.log('🖱️ Mouse entered canvas');
    // Ensure canvas is focused when mouse enters
    if (this.canvas && document.activeElement !== this.canvas) {
      this.canvas.focus();
    }

    // Enable mouse tracking when entering canvas
    this.isMouseTracking = true;
    this.mousePositionInitialized = true;

    // Prevent default to ensure proper capture
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle mouse leave events
   */
  private handleMouseLeave(event: MouseEvent): void {
    console.log('🖱️ Mouse left canvas');
    // Reset current mouse movement but keep accumulated movement for camera rotation
    this.mouseInput.movementX = 0;
    this.mouseInput.movementY = 0;
    // Don't reset accumulated movement - let camera controller handle it
    // this.mouseInput.accumulatedMovementX = 0;
    // this.mouseInput.accumulatedMovementY = 0;

    // Keep mouse tracking active for global mouse capture
    this.isMouseTracking = true;
    this.mousePositionInitialized = true;

    // Prevent default to ensure proper capture
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle pointer lock change events
   */
  private handlePointerLockChange(): void {
    if (document.pointerLockElement && document.pointerLockElement === this.canvas) {
      console.log('🖱️ Pointer lock acquired');
      this.isMouseTracking = true;
      this.mousePositionInitialized = true;
    } else {
      console.log('🖱️ Pointer lock lost');
      // When pointer lock is lost, continue with global mouse tracking
      this.isMouseTracking = true;

      // Don't reset accumulated movement when pointer lock is lost
      // Let camera controller handle reset timing to prevent jumps
      // this.mouseInput.accumulatedMovementX = 0;
      // this.mouseInput.accumulatedMovementY = 0;
    }
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches && event.touches.length > 0) {
      const touch = event.touches[0];
      this.touchStartPos = new Vector3(touch.clientX || 0, touch.clientY || 0, 0);
      this.touchCurrentPos = new Vector3(touch.clientX || 0, touch.clientY || 0, 0);
      this.isTouchActive = true;

      // Always enable camera rotation for touch on canvas
      const target = event.target as HTMLElement;
      if (target && target.tagName === 'CANVAS') {
        this.inputState[InputAction.CAMERA_ROTATE] = true;
      }
    }
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    if (event.touches && event.touches.length > 0 && this.isTouchActive) {
      const touch = event.touches[0];
      this.touchCurrentPos = new Vector3(touch.clientX || 0, touch.clientY || 0, 0);

      const deltaX = this.touchCurrentPos.x - this.touchStartPos.x;
      const deltaY = this.touchCurrentPos.y - this.touchStartPos.y;

      // Update mouse input for camera rotation (always active during touch)
      // Natural Y axis: positive when swiping down
      this.mouseInput.movementX = deltaX * GAME_CONFIG.TOUCH_SENSITIVITY;
      this.mouseInput.movementY = deltaY * GAME_CONFIG.TOUCH_SENSITIVITY; // Natural direction: positive when swiping down

      // Reset touch start position for next delta calculation
      this.touchStartPos.copy(this.touchCurrentPos);
    }
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    this.isTouchActive = false;
    this.inputState[InputAction.CAMERA_ROTATE] = false;
    this.mouseInput.movementX = 0;
    this.mouseInput.movementY = 0;
    // Don't reset accumulated movement - let camera controller handle it
    // this.mouseInput.accumulatedMovementX = 0;
    // this.mouseInput.accumulatedMovementY = 0;
    this.touchStartPos.set(0, 0, 0);
    this.touchCurrentPos.set(0, 0, 0);
  }

  /**
   * Get action from key press
   */
  private getActionFromKey(key: string): InputAction | null {
    for (const [action, binding] of this.inputBindings.entries()) {
      if (binding.keys && binding.keys.includes(key)) {
        return action;
      }
    }
    return null;
  }

  /**
   * Get action from key code (fallback for special keys)
   */
  private getActionFromCode(code: string): InputAction | null {
    // Map event.code to actions (more reliable for special keys)
    const codeMap: { [key: string]: InputAction } = {
      'Space': InputAction.JUMP,
      'ShiftLeft': InputAction.SLIDE,
      'ShiftRight': InputAction.SLIDE,
      'ArrowLeft': InputAction.MOVE_LEFT,
      'ArrowRight': InputAction.MOVE_RIGHT,
      'ArrowUp': InputAction.MOVE_FORWARD,
      'ArrowDown': InputAction.SLIDE,
      'KeyA': InputAction.MOVE_LEFT,
      'KeyD': InputAction.MOVE_RIGHT,
      'KeyW': InputAction.MOVE_FORWARD,
      'Escape': InputAction.PAUSE,
    };

    return codeMap[code] || null;
  }

  /**
   * Get action from mouse button
   */
  private getActionFromMouseButton(button: number): InputAction | null {
    for (const [action, binding] of this.inputBindings.entries()) {
      if (binding.mouse && binding.mouse.button === button) {
        return action;
      }
    }
    return null;
  }

  /**
   * Get current input state
   */
  getInputState(): InputState {
    // Create a copy of the input state with proper typing
    return {
      [InputAction.MOVE_LEFT]: this.inputState[InputAction.MOVE_LEFT],
      [InputAction.MOVE_RIGHT]: this.inputState[InputAction.MOVE_RIGHT],
      [InputAction.MOVE_FORWARD]: this.inputState[InputAction.MOVE_FORWARD],
      [InputAction.JUMP]: this.inputState[InputAction.JUMP],
      [InputAction.SLIDE]: this.inputState[InputAction.SLIDE],
      [InputAction.PAUSE]: this.inputState[InputAction.PAUSE],
      [InputAction.CAMERA_ROTATE]: this.inputState[InputAction.CAMERA_ROTATE],
      [InputAction.MOUSE_MOVE_X]: this.inputState[InputAction.MOUSE_MOVE_X],
      [InputAction.MOUSE_MOVE_Y]: this.inputState[InputAction.MOUSE_MOVE_Y],
    };
  }

  /**
   * Get just-pressed state for actions that should only trigger once per press
   * NOTE: State is NOT cleared here - it will be cleared at end of frame in update()
   */
  getJustPressedState(): { jump: boolean; slide: boolean; moveForward: boolean } {
    const jumpPressed = this.justPressedState[InputAction.JUMP];
    const slidePressed = this.justPressedState[InputAction.SLIDE];
    const moveForwardPressed = this.justPressedState[InputAction.MOVE_FORWARD];

    // DON'T clear here - let update() clear at end of frame
    // This allows multiple systems to read the same frame's input

    console.log(`📊 getJustPressedState called: jump=${jumpPressed}, slide=${slidePressed}, moveForward=${moveForwardPressed}`);

    return {
      jump: jumpPressed,
      slide: slidePressed,
      moveForward: moveForwardPressed,
    };
  }

  /**
   * Get mouse input (for camera rotation)
   */
  getMouseInput(): MouseInput {
    // Debug logging for mouse input state
    if (Math.abs(this.mouseInput.accumulatedMovementX) > 0 || Math.abs(this.mouseInput.accumulatedMovementY) > 0) {
      console.log(`🔄 getMouseInput called: accumulatedMovementX=${this.mouseInput.accumulatedMovementX.toFixed(3)}, accumulatedMovementY=${this.mouseInput.accumulatedMovementY.toFixed(3)}`);
    }
    return { ...this.mouseInput };
  }

  /**
   * Get touch delta for swipe gestures
   */
  getTouchDelta() {
    return new Vector3(
      this.touchCurrentPos.x - this.touchStartPos.x,
      this.touchCurrentPos.y - this.touchStartPos.y,
      0
    );
  }

  /**
   * Check if specific action is pressed
   */
  isActionPressed(action: InputAction): boolean {
    return this.inputState[action];
  }

  /**
   * Check if specific action was just pressed (for single actions like jump)
   */
  wasActionJustPressed(action: InputAction): boolean {
    // This would need to track previous state for proper "just pressed" detection
    // For now, return current state
    return this.inputState[action];
  }

  /**
   * Set canvas reference for proper mouse capture
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    console.log('🎯 setCanvas called with canvas:', canvas);
    
    // Remove existing listeners from old canvas
    if (this.canvas && this.canvas !== canvas) {
      if (this.canvas.removeEventListener) {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
      }
    }

    // Remove existing listeners from old canvas first
    if (this.canvas && this.canvas !== canvas) {
      this.removeCanvasEventListeners();
    }

    this.canvas = canvas;
    if (canvas) {
      if (canvas.addEventListener) {
        canvas.addEventListener('contextmenu', (e) => e.preventDefault && e.preventDefault());
      }
      // Setup all event listeners now that canvas is available
      this.setupEventListeners();
      console.log('✅ InputManager setup complete for canvas');
      
      // DISABLED: Don't auto-test - it triggers unwanted jumps!
      // this.testEventListeners();
    }
  }

  /**
   * Test if event listeners are properly attached (debug helper)
   * DISABLED: Causes unwanted auto-jumps
   */
  private testEventListeners(): void {
    console.log('🧪 Event listener test DISABLED (was causing auto-jumps)');
    // Don't dispatch test events
  }

  /**
   * Update input state (call this every frame)
   * IMPORTANT: Called at START of frame, before game logic
   */
  update(): void {
    // Debug logging for mouse input state during update
    if (Math.abs(this.mouseInput.accumulatedMovementX) > 0 || Math.abs(this.mouseInput.accumulatedMovementY) > 0) {
      console.log(`🔄 InputManager update: accumulatedMovementX=${this.mouseInput.accumulatedMovementX.toFixed(3)}, accumulatedMovementY=${this.mouseInput.accumulatedMovementY.toFixed(3)}`);
    }

    // Debug keyboard input state (only log if something is pressed)
    const inputState = this.getInputState();
    const pressedKeys = Object.entries(inputState)
      .filter(([key, value]) => typeof value === 'boolean' && value === true)
      .map(([key]) => key);

    if (pressedKeys.length > 0) {
      console.log(`⌨️ Active keyboard inputs: ${pressedKeys.join(', ')}`);
    }

    // Reset current movement values, but keep accumulated movement for camera rotation
    // The accumulated movement will be consumed by the camera controller each frame
    this.mouseInput.movementX = 0;
    this.mouseInput.movementY = 0;

    // Don't reset mouse movement input state here - let player controller handle it
    // This ensures continuous mouse input for player movement
    // this.inputState[InputAction.MOUSE_MOVE_X] = 0;
    // this.inputState[InputAction.MOUSE_MOVE_Y] = 0;

    // Just ensure touch delta is handled properly
    if (!this.isTouchActive) {
      this.touchStartPos.copy(this.touchCurrentPos);
    }

    // Ensure mouse tracking is maintained if canvas is available
    if (this.canvas && !this.isMouseTracking) {
      // Re-enable mouse tracking if it was accidentally disabled
      this.isMouseTracking = true;
    }
  }

  /**
   * Clear just-pressed state at END of frame
   * Call this AFTER all game logic has processed input
   */
  clearJustPressed(): void {
    console.log('🧹 Clearing justPressed state at end of frame');
    this.justPressedState[InputAction.JUMP] = false;
    this.justPressedState[InputAction.SLIDE] = false;
    this.justPressedState[InputAction.MOVE_FORWARD] = false;
  }

  /**
   * Reset accumulated mouse movement (called by camera controller after consuming input)
   */
  resetAccumulatedMovement(): void {
    this.mouseInput.accumulatedMovementX = 0;
    this.mouseInput.accumulatedMovementY = 0;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    // Remove document-level listeners - use bound methods
    if (document.removeEventListener) {
      document.removeEventListener('keydown', this.boundHandleKeyDown);
      document.removeEventListener('keyup', this.boundHandleKeyUp);
      document.removeEventListener('pointerlockchange', this.boundHandlePointerLockChange);
      document.removeEventListener('mousemove', this.boundHandleGlobalMouseMove);
      document.removeEventListener('touchstart', this.boundHandleTouchStart);
      document.removeEventListener('touchmove', this.boundHandleTouchMove);
      document.removeEventListener('touchend', this.boundHandleTouchEnd);
    }

    // Remove canvas keyboard listeners
    if (this.canvas && this.canvas.removeEventListener) {
      this.canvas.removeEventListener('keydown', this.boundHandleKeyDown);
      this.canvas.removeEventListener('keyup', this.boundHandleKeyUp);
    }

    // Remove canvas-specific listeners
    this.removeCanvasEventListeners();

    console.log('🧹 InputManager event listeners cleaned up');
  }
}
