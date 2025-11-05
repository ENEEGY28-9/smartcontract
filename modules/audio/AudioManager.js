/**
 * AudioManager - Handles all audio functionality
 * Manages background music, sound effects, and audio settings
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.5;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;

        this.sounds = new Map();
        this.music = null;
        this.isMusicPlaying = false;

        this.settings = {
            musicEnabled: true,
            sfxEnabled: true,
            masterMuted: false
        };

        this.loadSettings();
    }

    initialize() {
        try {
            // Create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume context if needed (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            console.log('AudioManager initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
            return false;
        }
    }

    loadSettings() {
        const savedSettings = Utils.loadFromLocalStorage('audioSettings', {});
        this.settings = { ...this.settings, ...savedSettings };
    }

    saveSettings() {
        Utils.saveToLocalStorage('audioSettings', this.settings);
    }

    // Volume control methods
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.applyVolumeSettings();

        if (this.music) {
            this.music.volume = this.getEffectiveMusicVolume();
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.applyVolumeSettings();

        if (this.music) {
            this.music.volume = this.getEffectiveMusicVolume();
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.applyVolumeSettings();
    }

    getEffectiveMusicVolume() {
        return this.masterVolume * this.musicVolume * (this.settings.musicEnabled ? 1 : 0);
    }

    getEffectiveSFXVolume() {
        return this.masterVolume * this.sfxVolume * (this.settings.sfxEnabled ? 1 : 0);
    }

    applyVolumeSettings() {
        // Apply to all currently playing sounds
        this.sounds.forEach(sound => {
            if (sound.source && sound.gainNode) {
                sound.gainNode.gain.value = this.getEffectiveSFXVolume();
            }
        });
    }

    // Music control methods
    async loadMusic(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.music = {
                buffer: audioBuffer,
                source: null,
                gainNode: this.audioContext.createGain(),
                isLooping: false
            };

            this.music.gainNode.connect(this.audioContext.destination);
            console.log('Music loaded successfully');

        } catch (error) {
            console.error('Failed to load music:', error);
        }
    }

    playBackgroundMusic() {
        if (!this.music || !this.settings.musicEnabled) return;

        try {
            // Stop current music if playing
            this.stopBackgroundMusic();

            const source = this.audioContext.createBufferSource();
            source.buffer = this.music.buffer;
            source.loop = true;

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.getEffectiveMusicVolume();

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start(0);
            this.music.source = source;
            this.music.gainNode = gainNode;
            this.isMusicPlaying = true;

            console.log('Background music started');

        } catch (error) {
            console.error('Failed to play background music:', error);
        }
    }

    stopBackgroundMusic() {
        if (this.music && this.music.source) {
            try {
                this.music.source.stop();
                this.music.source = null;
                this.isMusicPlaying = false;
                console.log('Background music stopped');
            } catch (error) {
                console.error('Failed to stop background music:', error);
            }
        }
    }

    pauseBackgroundMusic() {
        if (this.music && this.music.source) {
            this.music.source.playbackRate.value = 0;
        }
    }

    resumeBackgroundMusic() {
        if (this.music && this.music.source) {
            this.music.source.playbackRate.value = 1;
        }
    }

    // Sound effect methods
    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.sounds.set(name, {
                buffer: audioBuffer,
                gainNode: this.audioContext.createGain()
            });

            console.log(`Sound '${name}' loaded successfully`);

        } catch (error) {
            console.error(`Failed to load sound '${name}':`, error);
        }
    }

    playSound(name, volume = 1.0) {
        if (!this.settings.sfxEnabled) return;

        const sound = this.sounds.get(name);
        if (!sound) {
            console.warn(`Sound '${name}' not found`);
            return;
        }

        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = sound.buffer;

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.getEffectiveSFXVolume() * volume;

            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            source.start(0);

            // Clean up after playback
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };

        } catch (error) {
            console.error(`Failed to play sound '${name}':`, error);
        }
    }

    playSoundAt(name, position, volume = 1.0) {
        // 3D positional audio (for future enhancement)
        this.playSound(name, volume);
    }

    // Preset sound effects (can be called directly)
    playJumpSound() {
        this.playSound('jump', 0.8);
    }

    playSlideSound() {
        this.playSound('slide', 0.7);
    }

    playCoinSound() {
        this.playSound('coin', 0.6);
    }

    playPowerUpSound() {
        this.playSound('powerup', 0.9);
    }

    playCrashSound() {
        this.playSound('crash', 1.0);
    }

    playAchievementSound() {
        this.playSound('achievement', 0.8);
    }

    playButtonSound() {
        this.playSound('button', 0.5);
    }

    // Batch sound loading
    async loadSoundPack(sounds) {
        const promises = sounds.map(sound =>
            this.loadSound(sound.name, sound.url)
        );

        try {
            await Promise.all(promises);
            console.log('Sound pack loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load sound pack:', error);
            return false;
        }
    }

    // Audio context management
    suspend() {
        if (this.audioContext && this.audioContext.state !== 'suspended') {
            this.audioContext.suspend();
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Settings management
    toggleMusic() {
        this.settings.musicEnabled = !this.settings.musicEnabled;

        if (this.settings.musicEnabled) {
            if (!this.isMusicPlaying) {
                this.playBackgroundMusic();
            }
        } else {
            this.stopBackgroundMusic();
        }

        this.saveSettings();
    }

    toggleSFX() {
        this.settings.sfxEnabled = !this.settings.sfxEnabled;
        this.saveSettings();
    }

    toggleMasterMute() {
        this.settings.masterMuted = !this.settings.masterMuted;

        if (this.settings.masterMuted) {
            this.setMasterVolume(0);
        } else {
            this.setMasterVolume(this.masterVolume);
        }

        this.saveSettings();
    }

    // Audio analysis for gameplay (rhythm-based features)
    async analyzeAudioFrequency() {
        if (!this.music || !this.music.source) return null;

        try {
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            this.music.source.connect(analyser);

            analyser.getByteFrequencyData(dataArray);

            // Calculate average frequency for gameplay effects
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;

            return {
                average: average,
                data: dataArray,
                dominant: Math.max(...dataArray.slice(0, bufferLength / 4)) // Low frequencies
            };

        } catch (error) {
            console.error('Audio analysis failed:', error);
            return null;
        }
    }

    // Accessibility methods
    describeSound(soundName) {
        const descriptions = {
            jump: 'Player jumps over obstacle',
            slide: 'Player slides under barrier',
            coin: 'Coin collected',
            powerup: 'Power-up activated',
            crash: 'Player crashed into obstacle',
            achievement: 'Achievement unlocked',
            button: 'Button pressed'
        };

        return descriptions[soundName] || `Sound: ${soundName}`;
    }

    // Debug methods
    getDebugInfo() {
        return {
            contextState: this.audioContext ? this.audioContext.state : 'not initialized',
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            settings: this.settings,
            loadedSounds: this.sounds.size,
            musicPlaying: this.isMusicPlaying,
            contextLatency: this.audioContext ? this.audioContext.baseLatency : 0
        };
    }

    // Cleanup methods
    dispose() {
        this.stopBackgroundMusic();

        // Disconnect all sound nodes
        this.sounds.forEach(sound => {
            if (sound.gainNode) {
                sound.gainNode.disconnect();
            }
        });

        this.sounds.clear();

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        console.log('AudioManager disposed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}

// Make AudioManager available globally
if (typeof window !== 'undefined') {
    window.AudioManager = AudioManager;
}
