import { writable } from 'svelte/store';

// Game mode store to track when we're in game
export const gameMode = writable<'menu' | 'game'>('menu');

// Game state store for token balance and session tracking
export interface GameState {
  score: number;
  distance: number;
  tokenBalance: number;        // Current token balance
  sessionTokenEarned: number;  // Tokens earned in current session
  isConnected: boolean;
}

export const gameState = writable<GameState>({
  score: 0,
  distance: 0,
  tokenBalance: 0,             // Initialize
  sessionTokenEarned: 0,       // Initialize
  isConnected: false,
});

export const gameActions = {
  updateTokenBalance(balance: number) {
    gameState.update(state => ({
      ...state,
      tokenBalance: balance,
    }));
  },

  addTokenEarned(amount: number) {
    gameState.update(state => ({
      ...state,
      sessionTokenEarned: state.sessionTokenEarned + amount,
    }));
  },

  updateScore(score: number) {
    gameState.update(state => ({
      ...state,
      score,
    }));
  },

  updateDistance(distance: number) {
    gameState.update(state => ({
      ...state,
      distance,
    }));
  },

  setConnected(connected: boolean) {
    gameState.update(state => ({
      ...state,
      isConnected: connected,
    }));
  },

  resetSession() {
    gameState.update(state => ({
      ...state,
      sessionTokenEarned: 0,
      score: 0,
      distance: 0,
    }));
  }
};





