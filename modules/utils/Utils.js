/**
 * Utility functions for Subway Surfers game
 * Common functions used across multiple modules
 */

class Utils {
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distance3D(v1, v2) {
        return Math.sqrt(
            Math.pow(v2.x - v1.x, 2) +
            Math.pow(v2.y - v1.y, 2) +
            Math.pow(v2.z - v1.z, 2)
        );
    }

    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    static loadJSON(url) {
        return fetch(url).then(response => response.json());
    }

    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }

    static clearLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }

    static getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenWidth: screen.width,
            screenHeight: screen.height,
            devicePixelRatio: window.devicePixelRatio || 1,
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            language: navigator.language || navigator.userLanguage
        };
    }

    static isHighPerformanceDevice() {
        const deviceInfo = this.getDeviceInfo();
        const memory = navigator.deviceMemory || 4; // Default to 4GB if not available

        // Simple heuristic for high-performance devices
        return memory >= 8 || (!deviceInfo.isMobile && deviceInfo.devicePixelRatio >= 2);
    }

    static getOptimalQualitySettings() {
        const isHighPerf = this.isHighPerformanceDevice();

        return {
            shadowQuality: isHighPerf ? 'high' : 'low',
            particleCount: isHighPerf ? 1000 : 500,
            renderDistance: isHighPerf ? 150 : 100,
            antialiasing: isHighPerf ? true : false,
            bloom: isHighPerf ? true : false,
            targetFPS: isHighPerf ? 60 : 30
        };
    }

    static createElement(tag, attributes = {}, innerHTML = '') {
        const element = document.createElement(tag);

        Object.keys(attributes).forEach(attr => {
            element.setAttribute(attr, attributes[attr]);
        });

        if (innerHTML) {
            element.innerHTML = innerHTML;
        }

        return element;
    }

    static removeElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.remove();
            return true;
        }
        return false;
    }

    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';

        let start = null;
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.min(progress / duration, 1);
            element.style.opacity = opacity;

            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        }
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        let start = null;
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.max(1 - (progress / duration), 0);
            element.style.opacity = opacity;

            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        }
        requestAnimationFrame(animate);
    }

    static animateNumber(element, start, end, duration = 1000, prefix = '', suffix = '') {
        const startTime = performance.now();
        const difference = end - start;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = start + (difference * easeProgress);

            element.textContent = prefix + Math.floor(current) + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    static copyToClipboard(text) {
        if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve();
        }
    }

    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    static getQueryParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    static setQueryParameter(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.replaceState({}, '', url);
    }

    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }

        return items[items.length - 1];
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));

        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
        }
        return clonedObj;
    }

    static isObjectEmpty(obj) {
        return Object.keys(obj).length === 0 && obj.constructor === Object;
    }

    static getObjectSize(obj) {
        return new Blob([JSON.stringify(obj)]).size;
    }

    static compressData(data) {
        // Simple compression using run-length encoding for strings
        if (typeof data !== 'string') return data;

        let compressed = '';
        let count = 1;
        let current = data[0];

        for (let i = 1; i < data.length; i++) {
            if (data[i] === current && count < 255) {
                count++;
            } else {
                if (count > 3 || current === '~') {
                    compressed += `~${current}${String.fromCharCode(count)}`;
                } else {
                    compressed += current.repeat(count);
                }
                current = data[i];
                count = 1;
            }
        }

        if (count > 3 || current === '~') {
            compressed += `~${current}${String.fromCharCode(count)}`;
        } else {
            compressed += current.repeat(count);
        }

        return compressed;
    }

    static decompressData(compressed) {
        if (typeof compressed !== 'string') return compressed;

        let decompressed = '';
        let i = 0;

        while (i < compressed.length) {
            if (compressed[i] === '~') {
                const char = compressed[i + 1];
                const count = compressed.charCodeAt(i + 2);
                decompressed += char.repeat(count);
                i += 3;
            } else {
                decompressed += compressed[i];
                i++;
            }
        }

        return decompressed;
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }

    static sanitizeString(str) {
        return str.replace(/[<>]/g, '').trim();
    }

    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    static unescapeHtml(safe) {
        return safe
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
    }

    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static retry(fn, maxAttempts = 3, delay = 1000) {
        return new Promise(async (resolve, reject) => {
            for (let i = 0; i < maxAttempts; i++) {
                try {
                    const result = await fn();
                    resolve(result);
                    return;
                } catch (error) {
                    if (i === maxAttempts - 1) {
                        reject(error);
                    } else {
                        await this.sleep(delay);
                    }
                }
            }
        });
    }

    static measurePerformance(fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        return {
            result,
            duration: end - start
        };
    }

    static async measureAsyncPerformance(fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        return {
            result,
            duration: end - start
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}

// Make Utils available globally
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}
