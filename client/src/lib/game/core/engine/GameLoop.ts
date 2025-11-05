import { GAME_CONFIG } from '../utils/Constants';

export class GameLoop {
  private lastTime = 0;
  private deltaTime = 0;
  private isRunning = false;
  private animationFrameId: number | null = null;

  // Callback functions
  private updateCallback?: (deltaTime: number) => void;
  private renderCallback?: (deltaTime: number) => void;

  constructor() {
    this.lastTime = performance.now();
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main game loop
   */
  private loop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30); // Cap at 30fps minimum
    this.lastTime = currentTime;

    // Call update and render callbacks
    if (this.updateCallback) {
      this.updateCallback(this.deltaTime);
    }

    if (this.renderCallback) {
      this.renderCallback(this.deltaTime);
    }

    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Set the update callback (game logic)
   */
  setUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Set the render callback (rendering)
   */
  setRenderCallback(callback: (deltaTime: number) => void): void {
    this.renderCallback = callback;
  }

  /**
   * Get current delta time
   */
  getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * Check if loop is running
   */
  isLoopRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.deltaTime > 0 ? 1 / this.deltaTime : 0;
  }
}
