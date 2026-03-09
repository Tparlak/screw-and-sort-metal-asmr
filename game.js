// GD_OPTIONS moved to index.html for standard implementation

// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    COLORS: {
        RED: '#ff3b3b',
        BLUE: '#3b9eff',
        YELLOW: '#ffd93b',
        GREEN: '#4CAF50',
        PURPLE: '#9C27B0',
        ORANGE: '#FF9800',
        PINK: '#E91E63'
    },
    SCREW_RADIUS: 20,
    SLOT_SIZE: 50,
    SLOT_COUNT: 5,
    LERP_SPEED: 0.15,
    GRAVITY: 0.5,
    PLATE_WIDTH: 200,
    PLATE_HEIGHT: 80,
    MATCH_COUNT: 3
};

// ============================================
// PARTICLE CLASS (for VFX)
// ============================================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 2;
        this.life = 1.0;
        this.decay = 0.02;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3; // gravity
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}


// ============================================
// AUDIO MANAGER CLASS
// ============================================
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isMuted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.initialized = true;
            console.log("Audio initialized");
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    // Ensure audio context is running (needed after user interaction)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Unscrew sound - short metallic click with high frequency
    playUnscrewSound() {
        if (!this.initialized || this.isMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Oscillator for metallic click
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Match-3 sound - bubbly pop with descending pitch
    playMatchSound() {
        if (!this.initialized || this.isMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Create a satisfying "pop" sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(600, now);
        osc1.frequency.exponentialRampToValueAtTime(200, now + 0.2);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(900, now);
        osc2.frequency.exponentialRampToValueAtTime(300, now + 0.2);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
    }

    // Plate fall sound - deep metallic impact
    playPlateFallSound() {
        if (!this.initialized || this.isMuted) return;
        this.resume();

        const now = this.audioContext.currentTime;

        // Low frequency thud with metallic resonance
        const osc = this.audioContext.createOscillator();
        const noise = this.createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const noiseGain = this.audioContext.createGain();

        // Low metallic tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

        // Noise for impact
        noiseSource.buffer = noise;
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        // Main impact envelope
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        noiseSource.connect(noiseGain);
        gain.connect(this.masterGain);
        noiseGain.connect(this.masterGain);

        osc.start(now);
        noiseSource.start(now);
        osc.stop(now + 0.4);
        noiseSource.stop(now + 0.1);
    }

    // Create white noise buffer for impact effect
    createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    mute() {
        this.isMuted = true;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
    }

    unmute() {
        this.isMuted = false;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(1, this.audioContext.currentTime);
        }
    }
}


// ============================================
// SCREW CLASS
// ============================================
class Screw {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.color = color;
        this.isMoving = false;
        this.isInSlot = false;
        this.radius = CONFIG.SCREW_RADIUS;
        this.glintPhase = Math.random() * Math.PI * 2; // Random start phase for glint
    }

    update() {
        if (this.isMoving) {
            // Lerp animation to target position
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;

            this.x += dx * CONFIG.LERP_SPEED;
            this.y += dy * CONFIG.LERP_SPEED;

            // Stop moving when close enough
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.isMoving = false;
                return true; // Animation complete
            }
        }
        return false;
    }

    draw(ctx) {
        // Outer circle (screw body)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Metallic rim
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Screw head detail (cross pattern)
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 2;
        const crossSize = this.radius * 0.5;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(this.x - crossSize, this.y);
        ctx.lineTo(this.x + crossSize, this.y);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - crossSize);
        ctx.lineTo(this.x, this.y + crossSize);
        ctx.stroke();

        // Highlight for 3D effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Glint effect (periodic shine)
        const glintIntensity = (Math.sin(Date.now() / 1000 + this.glintPhase) + 1) * 0.5;
        if (glintIntensity > 0.7) {
            const gradient = ctx.createRadialGradient(
                this.x - this.radius * 0.4, this.y - this.radius * 0.4, 0,
                this.x - this.radius * 0.4, this.y - this.radius * 0.4, this.radius * 0.6
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${(glintIntensity - 0.7) * 2})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.isMoving = true;
    }

    contains(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    }
}

// ============================================
// PLATE CLASS
// ============================================
class Plate {
    constructor(x, y, screws, rotation = 0) {
        this.x = x;
        this.y = y;
        this.baseX = x; // For swaying
        this.baseY = y;
        this.width = CONFIG.PLATE_WIDTH;
        this.height = CONFIG.PLATE_HEIGHT;
        this.screws = screws;
        this.velocityY = 0;
        this.isFalling = false;
        this.isOffscreen = false;
        this.rotation = rotation; // Diagonal placement
        this.swayPhase = Math.random() * Math.PI * 2; // Random sway start
        this.swaySpeed = 0.5 + Math.random() * 0.5;
        this.swayAmount = 5;
    }

    update(canvasHeight) {
        // Apply swaying effect if not falling
        if (!this.isFalling) {
            this.swayPhase += 0.02 * this.swaySpeed;
            const swayOffset = Math.sin(this.swayPhase) * this.swayAmount;
            this.x = this.baseX + swayOffset;

            // Update screws with plate sway
            this.screws.forEach((screw, index) => {
                if (!screw.isInSlot) {
                    const screwBaseX = this.baseX + 40 + (index * 60);
                    screw.x = screwBaseX + swayOffset;
                    screw.targetX = screw.x;
                }
            });
        }

        if (this.isFalling) {
            this.velocityY += CONFIG.GRAVITY;
            this.y += this.velocityY;

            // Update screws positions with plate
            this.screws.forEach(screw => {
                if (!screw.isInSlot) {
                    screw.y += this.velocityY;
                    screw.targetY = screw.y;
                }
            });

            // Check if offscreen
            if (this.y > canvasHeight + this.height) {
                this.isOffscreen = true;
            }
        }
    }

    draw(ctx) {
        if (this.isOffscreen) return;

        // Main plate body (metallic)
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#5a5a5a');
        gradient.addColorStop(0.5, '#3a3a3a');
        gradient.addColorStop(1, '#2a2a2a');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Plate border
        ctx.strokeStyle = '#7a7a7a';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Metallic shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(this.x, this.y, this.width, this.height * 0.3);

        // Bolt details in corners
        const boltRadius = 4;
        const boltOffset = 10;
        ctx.fillStyle = '#1a1a1a';

        // Top-left bolt
        ctx.beginPath();
        ctx.arc(this.x + boltOffset, this.y + boltOffset, boltRadius, 0, Math.PI * 2);
        ctx.fill();

        // Top-right bolt
        ctx.beginPath();
        ctx.arc(this.x + this.width - boltOffset, this.y + boltOffset, boltRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bottom-left bolt
        ctx.beginPath();
        ctx.arc(this.x + boltOffset, this.y + this.height - boltOffset, boltRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bottom-right bolt
        ctx.beginPath();
        ctx.arc(this.x + this.width - boltOffset, this.y + this.height - boltOffset, boltRadius, 0, Math.PI * 2);
        ctx.fill();

        // Glint effect on plate surface
        const glintPhase = (Date.now() / 2000) % (Math.PI * 2);
        const glintX = this.x + (Math.sin(glintPhase) + 1) * this.width / 2;
        const glintGradient = ctx.createLinearGradient(glintX - 30, this.y, glintX + 30, this.y);
        glintGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        glintGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        glintGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glintGradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    checkEmpty() {
        const attachedScrews = this.screws.filter(s => !s.isInSlot);
        if (attachedScrews.length === 0 && !this.isFalling) {
            this.startFalling();
        }
    }

    startFalling() {
        this.isFalling = true;
        this.velocityY = 0;

        // Play plate fall sound via game instance
        if (window.game && window.game.audioManager) {
            window.game.audioManager.playPlateFallSound();
        }

        // Trigger screen shake
        if (window.game && window.game.screenShake) {
            window.game.screenShake();
        }
    }
}

// ============================================
// SLOT MANAGER CLASS
// ============================================
class SlotManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.slots = [];
        this.slotY = 40; // Y position for slots (canvas starts at top: 110px, so slots appear at screen Y: 150)
        this.spacing = 60;
        this.initSlots();
    }

    initSlots() {
        this.slots = [];
        const logicalWidth = this.canvas.clientWidth;

        // Responsive Spacing Logic
        // Ensure slots fit within 90% of screen width
        const baseSpacing = 60;
        const maxAvailableWidth = logicalWidth * 0.95;
        const requiredWidth = CONFIG.SLOT_COUNT * baseSpacing;

        if (requiredWidth > maxAvailableWidth) {
            this.spacing = maxAvailableWidth / CONFIG.SLOT_COUNT;
        } else {
            this.spacing = baseSpacing;
        }

        const totalWidth = CONFIG.SLOT_COUNT * this.spacing;
        const startX = (logicalWidth - totalWidth) / 2 + this.spacing / 2;

        for (let i = 0; i < CONFIG.SLOT_COUNT; i++) {
            this.slots.push({
                x: startX + i * this.spacing,
                y: this.slotY,
                screw: null
            });
        }
    }

    draw(ctx) {
        this.slots.forEach(slot => {
            if (!slot.screw) {
                // Empty Slot: Metallic Screw Head Appearance
                const x = slot.x;
                const y = slot.y;
                const r = CONFIG.SCREW_RADIUS + 5;

                // Metallic Base Gradient
                const gradient = ctx.createRadialGradient(x - r / 3, y - r / 3, r / 5, x, y, r);
                gradient.addColorStop(0, '#aaa');
                gradient.addColorStop(0.5, '#666');
                gradient.addColorStop(1, '#444');

                ctx.fillStyle = gradient;
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Inner Rim/Groove
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(x, y, r - 5, 0, Math.PI * 2);
                ctx.stroke();

                // Phillips Head Cross
                ctx.fillStyle = '#222';
                // Horizontal
                this.drawRoundRect(ctx, x - r / 2, y - 2, r, 4, 2);
                // Vertical
                this.drawRoundRect(ctx, x - 2, y - r / 2, 4, r, 2);

                // Highlight inside cross
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                this.drawRoundRect(ctx, x - r / 2 + 2, y, r - 4, 1, 0);
            }
        });
    }

    drawRoundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    addScrew(screw) {
        // Find first empty slot
        for (let slot of this.slots) {
            if (!slot.screw) {
                slot.screw = screw;
                screw.moveTo(slot.x, slot.y);
                screw.isInSlot = true;
                return true;
            }
        }
        return false; // No empty slots
    }

    checkMatch() {
        const screwsInSlots = this.slots.filter(s => s.screw).map(s => s.screw);

        if (screwsInSlots.length < CONFIG.MATCH_COUNT) return null;

        // Count colors
        const colorCounts = {};
        screwsInSlots.forEach(screw => {
            colorCounts[screw.color] = (colorCounts[screw.color] || 0) + 1;
        });

        // Check for match
        for (let color in colorCounts) {
            if (colorCounts[color] >= CONFIG.MATCH_COUNT) {
                return color;
            }
        }

        return null;
    }

    removeMatchedScrews(color) {
        let removed = 0;
        const screwsToRemove = [];

        // Find screws to remove
        this.slots.forEach(slot => {
            if (slot.screw && slot.screw.color === color && removed < CONFIG.MATCH_COUNT) {
                screwsToRemove.push(slot.screw);
                slot.screw = null;
                removed++;
            }
        });

        // Shift remaining screws to fill gaps
        this.compactSlots();

        return screwsToRemove;
    }

    compactSlots() {
        const screws = this.slots.filter(s => s.screw).map(s => s.screw);

        // Clear all slots
        this.slots.forEach(slot => slot.screw = null);

        // Reassign screws to first available slots
        screws.forEach((screw, index) => {
            this.slots[index].screw = screw;
            screw.moveTo(this.slots[index].x, this.slots[index].y);
        });
    }

    isFull() {
        return this.slots.every(slot => slot.screw !== null);
    }

    clear() {
        this.slots.forEach(slot => slot.screw = null);
    }
}

// ============================================
// MAIN GAME CLASS
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.levelHUD = document.getElementById('level-hud');
        this.levelNumber = document.getElementById('level-number');
        this.gameOverUI = document.getElementById('game-over');
        this.levelCompleteUI = document.getElementById('level-complete');
        this.finalLevelSpan = document.getElementById('final-level');
        this.restartBtn = document.getElementById('restart-btn');
        this.nextLevelBtn = document.getElementById('next-level-btn');
        this.startScreen = document.getElementById('start-screen');
        this.playBtn = document.getElementById('play-btn');
        this.statusBar = document.getElementById('status-panel'); // Updated ref
        this.timerBar = document.getElementById('timer-bar');
        this.timerDisplay = document.getElementById('timer-display'); // New ref
        this.healthHearts = [
            document.getElementById('heart-1'),
            document.getElementById('heart-2'),
            document.getElementById('heart-3')
        ];
        this.comboText = document.getElementById('combo-text');
        this.comboText = document.getElementById('combo-text');
        this.extraSlotsBtnGO = document.getElementById('extra-slots-btn-go'); // Updated ref
        this.rewardPopup = document.getElementById('reward-popup');
        this.rewardTitle = document.getElementById('reward-title');
        this.rewardDesc = document.getElementById('reward-desc');
        this.watchAdBtn = document.getElementById('watch-ad-btn');
        this.closeRewardBtn = document.getElementById('close-reward-btn');
        this.doubleCoinsBtn = document.getElementById('double-coins-btn');

        this.headerRow = document.getElementById('header-row'); // New ref for global HUD toggling

        this.pendingRewardType = null;
        this.coins = 0; // Placeholder for currency

        this.isPaused = false;
        this.isGameOver = false;
        this.isPlaying = false;
        this.level = 1;
        this.screws = [];
        this.plates = [];
        this.particles = [];
        this.slotManager = null;
        this.audioManager = new AudioManager();
        this.dpr = 1; // Device pixel ratio for high-DPI displays

        // Phase 2: Timer & Health
        this.timeRemaining = 60; // seconds
        this.maxTime = 60;
        this.health = 3;
        this.maxHealth = 3;

        // Phase 2: Combo System
        this.lastMatchTime = 0;
        this.comboCount = 0;
        this.comboWindow = 5000; // 5 seconds

        // Input Handling State
        this.lastTouchTime = 0;

        this.init();
    }

    init() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.slotManager = new SlotManager(this.canvas);

        // Event listeners
        // Event listeners
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Touch events with ghost click prevention
        this.canvas.addEventListener('touchstart', (e) => {
            // Prevent default behavior (scrolling/zooming) only if necessary
            // For games, usually we want to control everything
            if (e.cancelable) e.preventDefault();
            this.lastTouchTime = Date.now();
            this.handleTouch(e);
        }, { passive: false });

        // Prevent scrolling while dragging
        this.canvas.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        // Cursor interactions
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseout', () => this.canvas.classList.remove('screwdriver-hover'));

        // UI buttons
        // Using pointerup to cover both mouseUp and touch interactions as requested
        this.playBtn.addEventListener('pointerup', () => this.startGameWithTransition());

        // Hover sound effect for Play button
        this.playBtn.addEventListener('mouseenter', () => {
            if (this.audioManager && this.audioManager.initialized) {
                this.playHoverSound();
            }
        });

        // Game Control Overlay Buttons
        this.pauseBtn = document.getElementById('btn-pause-toggle');
        this.muteBtn = document.getElementById('btn-mute-toggle');

        const bindButton = (btn, action) => {
            if (!btn) return;

            // Remove existing listeners if any (safety)
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Re-assign to class property
            if (btn.id === 'btn-pause-toggle') this.pauseBtn = newBtn;
            if (btn.id === 'btn-mute-toggle') this.muteBtn = newBtn;

            // Add robust listeners
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`${newBtn.id} clicked (mouse)`);
                action();
            });

            newBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Prevent ghost click
                e.stopPropagation();
                console.log(`${newBtn.id} touched (mobile)`);
                action();
            }, { passive: false });
        };

        bindButton(this.pauseBtn, () => this.togglePause());
        bindButton(this.muteBtn, () => this.toggleMute());

        // Restart
        this.restartBtn.addEventListener('click', () => {
            this.restart();
        });

        // Next Level
        this.nextLevelBtn.addEventListener('click', () => {
            this.nextLevel();
        });

        // Reward Popup Listeners
        this.watchAdBtn.addEventListener('click', () => this.watchRewardedAd());
        this.closeRewardBtn.addEventListener('click', () => this.hideRewardPopup());

        // Game Over Reward: Revive + Slots (Win Life logic)
        this.extraSlotsBtnGO.addEventListener('click', () => {
            this.showRewardPopup('REVIVE');
        });

        // Level Complete Reward: Double Coins
        if (this.doubleCoinsBtn) {
            this.doubleCoinsBtn.addEventListener('click', () => {
                this.showRewardPopup('DOUBLE_COINS');
            });
        }


        // Start game loop (always running for animations)
        this.lastTime = performance.now();
        // Initial UI State: Hide HUD on load (so start screen is clean)
        this.headerRow.classList.add('hidden');

        this.gameLoop();
    }

    resizeCanvas() {
        const container = document.getElementById('game-container');
        const dpr = window.devicePixelRatio || 1;
        this.dpr = dpr;

        // CSS size (visual)
        this.canvas.style.width = container.clientWidth + 'px';
        this.canvas.style.height = container.clientHeight + 'px';

        // Internal resolution (real pixels)
        this.canvas.width = Math.floor(container.clientWidth * dpr);
        this.canvas.height = Math.floor(container.clientHeight * dpr);

        // Scale drawing context (prevents cumulative scaling)
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (this.slotManager) {
            this.slotManager.initSlots();
        }
    }

    playHoverSound() {
        // Safety check: ensure AudioManager is initialized
        if (this.audioManager && this.audioManager.initialized) {
            this.audioManager.playUnscrewSound();
        }
    }

    startGameWithTransition() {
        this.performStartTransition();
    }

    performStartTransition() {
        // Add fade-out class
        this.startScreen.classList.add('fade-out');

        // Wait for animation to complete, then start game
        setTimeout(() => {
            this.startGame();
        }, 600); // Match CSS fade-out duration
    }

    startGame() {
        // Hide start screen, show HUD and status
        this.startScreen.classList.add('hidden');
        this.headerRow.classList.remove('hidden'); // Show entire header
        this.levelHUD.classList.remove('hidden');
        this.statusBar.classList.remove('hidden');
        this.isPlaying = true;
        this.isPaused = false; // Reset pause state

        // Reset Combo State
        this.comboCount = 0;
        this.lastMatchTime = 0;

        // Reset timer and health
        this.timeRemaining = this.maxTime;
        this.health = this.maxHealth;
        this.updateHealthUI();
        this.updateTimerUI();

        this.loadLevel(this.level);
    }

    handleMouseMove(e) {
        if (!this.isPlaying || this.isPaused || this.isGameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        // Normalize coordinates by DPR for accurate hover detection
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;

        // Check if hovering over a screw
        let hoveringScrew = false;
        for (let screw of this.screws) {
            if (!screw.isInSlot && screw.contains(x, y)) {
                hoveringScrew = true;
                break;
            }
        }

        if (hoveringScrew) {
            this.canvas.classList.add('screwdriver-hover');
        } else {
            this.canvas.classList.remove('screwdriver-hover');
        }
    }

    loadLevel(levelNum) {
        this.screws = [];
        this.plates = [];
        this.particles = [];
        this.slotManager.clear();
        this.isGameOver = false;
        this.isPlaying = true; // Resume gameplay

        this.gameOverUI.classList.add('hidden');
        this.levelCompleteUI.classList.add('hidden');

        // Use clientWidth for logical centering
        const centerX = this.canvas.clientWidth / 2;
        const availableColors = this.getAvailableColors(levelNum);
        const numPlates = Math.min(2 + Math.floor(levelNum / 3), 4);
        const screwsPerPlate = 3;

        // Dynamic Timer Logic
        // Formula: 20s base + 5s per screw
        const totalScrews = numPlates * screwsPerPlate;
        this.maxTime = 20 + (totalScrews * 5);
        this.timeRemaining = this.maxTime;

        // Reset Health & UI
        this.health = this.maxHealth;
        this.updateTimerUI();
        this.updateHealthUI();

        for (let i = 0; i < numPlates; i++) {
            const pattern = this.getPlatePattern(i, numPlates, centerX, levelNum);
            const plateColor = availableColors[i % availableColors.length];
            const plateScrews = [];

            for (let j = 0; j < screwsPerPlate; j++) {
                const screwX = pattern.x + 40 + (j * 60);
                plateScrews.push(new Screw(screwX, pattern.y + 25, plateColor));
            }

            this.screws.push(...plateScrews);
            this.plates.push(new Plate(pattern.x, pattern.y, plateScrews, pattern.rotation));
        }

        this.levelNumber.textContent = levelNum;
    }

    getAvailableColors(level) {
        const baseColors = [CONFIG.COLORS.RED, CONFIG.COLORS.BLUE, CONFIG.COLORS.YELLOW];

        if (level >= 5) {
            return [...baseColors, CONFIG.COLORS.GREEN, CONFIG.COLORS.PURPLE, CONFIG.COLORS.ORANGE, CONFIG.COLORS.PINK];
        }
        return baseColors;
    }

    getPlatePattern(index, total, centerX, level) {
        const baseY = 120; // Plates start below the slot row
        const spacing = 120;

        // Create dynamic patterns based on level
        if (level >= 3) {
            // Diagonal and overlapping patterns
            const offsetX = (index % 2 === 0 ? -60 : 60);
            return {
                x: centerX - CONFIG.PLATE_WIDTH / 2 + offsetX,
                y: baseY + (index * spacing),
                rotation: (index % 2 === 0 ? -0.1 : 0.1) // Slight diagonal
            };
        } else {
            // Simple stacking for early levels
            return {
                x: centerX - CONFIG.PLATE_WIDTH / 2,
                y: baseY + (index * spacing),
                rotation: 0
            };
        }
    }

    handleClick(e) {
        // Prevent ghost clicks (synthetic clicks fired after touch)
        if (Date.now() - this.lastTouchTime < 500) return;

        if (this.isPaused || this.isGameOver || !this.isPlaying) return;

        const rect = this.canvas.getBoundingClientRect();
        // Normalize coordinates by DPR for accurate hit detection
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;

        this.processInput(x, y);
    }

    handleTouch(e) {
        if (this.isPaused || this.isGameOver || !this.isPlaying) return;

        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        // Normalize coordinates by DPR for accurate hit detection
        const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
        const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;

        this.processInput(x, y);
    }

    processInput(x, y) {
        // Initialize audio on first interaction (required by browsers)
        if (!this.audioManager.initialized) {
            this.audioManager.init();
        }
        // Resume audio context for mobile compatibility
        this.audioManager.resume();

        // Cursor push animation
        this.canvas.classList.add('screwdriver-push');
        setTimeout(() => this.canvas.classList.remove('screwdriver-push'), 150);

        // Find clicked screw (not in slot)
        for (let screw of this.screws) {
            if (!screw.isInSlot && screw.contains(x, y)) {
                // Play unscrew sound
                this.audioManager.playUnscrewSound();

                // Spring vibration effect on plate
                const plate = this.plates.find(p => p.screws.includes(screw));
                if (plate && !plate.isFalling) {
                    this.springVibration(plate);
                }

                // Try to add to slot
                const added = this.slotManager.addScrew(screw);

                if (!added) {
                    // Slots full - take damage and check for game over
                    this.takeDamage();
                } else {
                    // Check if plate is now empty
                    this.plates.forEach(plate => plate.checkEmpty());
                }

                break;
            }
        }
    }

    springVibration(plate) {
        const originalX = plate.baseX;
        const shakeDuration = 300;
        const shakeIntensity = 3;
        const shakeFrequency = 50;
        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > shakeDuration) {
                plate.baseX = originalX;
                return;
            }

            const intensity = shakeIntensity * (1 - elapsed / shakeDuration);
            plate.baseX = originalX + (Math.random() - 0.5) * intensity;
            setTimeout(shake, shakeFrequency);
        };

        shake();
    }

    updateTimerUI() {
        const percentage = (this.timeRemaining / this.maxTime) * 100;
        this.timerBar.style.width = percentage + '%';

        // Update numeric display
        this.timerDisplay.textContent = Math.ceil(this.timeRemaining);

        if (percentage <= 30) {
            this.timerBar.classList.add('low');
            this.timerDisplay.style.color = '#ff3b3b';
        } else {
            this.timerBar.classList.remove('low');
            this.timerDisplay.style.color = '#FFD700';
        }
    }

    updateHealthUI() {
        for (let i = 0; i < this.maxHealth; i++) {
            if (i < this.health) {
                this.healthHearts[i].classList.remove('lost');
            } else {
                this.healthHearts[i].classList.add('lost');
            }
        }
    }

    takeDamage() {
        if (this.health > 0) {
            this.health--;
            this.updateHealthUI();

            if (this.health <= 0) {
                this.checkGameOver();
            }
        }
    }

    showComboText() {
        this.comboText.classList.remove('hidden');
        setTimeout(() => {
            this.comboText.classList.add('hidden');
        }, 1500);
    }

    showRewardPopup(type) {
        this.pendingRewardType = type;
        this.rewardPopup.classList.remove('hidden');

        // Configure Popup Content based on Type
        switch (type) {
            case 'REVIVE':
                this.rewardTitle.textContent = "EXTRA LIFE";
                this.rewardDesc.textContent = "Watch an ad to revive with extra slots!";
                break;
            case 'DOUBLE_COINS':
                this.rewardTitle.textContent = "DOUBLE COINS";
                this.rewardDesc.textContent = "Watch to double your earnings!";
                break;
            case 'SKIP_LEVEL':
                this.rewardTitle.textContent = "SKIP CHAPTER";
                this.rewardDesc.textContent = "Stuck? Watch an ad to skip this level.";
                break;
            default:
                this.rewardTitle.textContent = "REWARD";
                this.rewardDesc.textContent = "Watch an ad to get a reward!";
        }
    }

    hideRewardPopup() {
        this.rewardPopup.classList.add('hidden');
        this.pendingRewardType = null;
    }

    watchRewardedAd() {
        console.log("Simulating Reward");
        this.grantReward();
    }

    grantReward() {
        console.log("Granting Reward:", this.pendingRewardType);

        switch (this.pendingRewardType) {
            case 'REVIVE':
                this.winLife();
                // Also give extra slots as per original logic
                this.clearTwoScrews();
                this.gameOverUI.classList.add('hidden');
                this.isGameOver = false;
                this.isPlaying = true;
                break;
            case 'DOUBLE_COINS':
                this.doubleCoins();
                break;
            case 'SKIP_LEVEL':
                this.skipChapter();
                break;
            default:
                console.warn("Unknown reward type:", this.pendingRewardType);
        }

        this.hideRewardPopup();
    }

    // --- Reward Logic Placeholders ---

    winLife() {
        this.health = Math.min(this.health + 1, this.maxHealth);
        this.updateHealthUI();
        console.log("Reward Applied: Extra Life");
    }

    doubleCoins() {
        this.coins *= 2;
        console.log("Reward Applied: Coins Doubled! Current:", this.coins);
        // Visual feedback could simply be an alert or floating text
        alert("Coins Doubled!");
    }

    skipChapter() {
        console.log("Reward Applied: Skip Chapter");
        this.nextLevel();
    }

    clearTwoScrews() {
        // Remove 2 screws from slots
        let removed = 0;
        for (let i = this.slotManager.slots.length - 1; i >= 0 && removed < 2; i--) {
            if (this.slotManager.slots[i].screw) {
                this.slotManager.slots[i].screw = null;
                removed++;
            }
        }
        this.slotManager.compactSlots();
    }

    update(deltaTime) {
        if (this.isPaused || this.isGameOver || !this.isPlaying) return;

        // Timer Logic
        if (this.timeRemaining > 0) {
            this.timeRemaining -= deltaTime;
            this.updateTimerUI();
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.checkGameOver();
            }
        }

        // Update particles
        this.particles = this.particles.filter(p => p.update());

        // Update screws
        this.screws.forEach(screw => {
            const animComplete = screw.update();

            // Check for match when screw animation completes
            if (animComplete && screw.isInSlot) {
                const matchColor = this.slotManager.checkMatch();
                if (matchColor) {
                    // Play match-3 sound
                    this.audioManager.playMatchSound();

                    // Combo Logic
                    const now = Date.now();
                    if (now - this.lastMatchTime <= this.comboWindow) {
                        this.comboCount++;
                        if (this.comboCount >= 2) {
                            this.showComboText();
                        }
                    } else {
                        this.comboCount = 1;
                    }
                    this.lastMatchTime = now;

                    // Spawn particles at slot positions

                    // Spawn particles at slot positions
                    this.slotManager.slots.forEach(slot => {
                        if (slot.screw && slot.screw.color === matchColor) {
                            for (let i = 0; i < 15; i++) {
                                this.particles.push(new Particle(slot.screw.x, slot.screw.y, matchColor));
                            }
                        }
                    });

                    const removedScrews = this.slotManager.removeMatchedScrews(matchColor);

                    // Remove from game array
                    this.screws = this.screws.filter(s => !removedScrews.includes(s));

                    // Check for level complete
                    this.checkLevelComplete();
                }
            }
        });

        // Update plates
        // Use clientHeight for logical bottom check
        this.plates.forEach(plate => plate.update(this.canvas.clientHeight));

        // Remove offscreen plates
        this.plates = this.plates.filter(p => !p.isOffscreen);
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#262626';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.isPlaying) return;

        // Draw slots
        this.slotManager.draw(this.ctx);

        // Draw plates
        this.plates.forEach(plate => plate.draw(this.ctx));

        // Draw screws
        this.screws.forEach(screw => screw.draw(this.ctx));

        // Draw particles (on top)
        this.particles.forEach(particle => particle.draw(this.ctx));
    }

    checkGameOver() {
        if (this.slotManager.isFull() || this.health <= 0 || this.timeRemaining <= 0) {
            this.isGameOver = true;
            this.finalLevelSpan.textContent = this.level;
            this.gameOverUI.classList.remove('hidden');
        }
    }

    checkLevelComplete() {
        const nonSlotScrews = this.screws.filter(s => !s.isInSlot);

        if (nonSlotScrews.length === 0) {
            // Level complete!
            this.level++;
            this.isPlaying = false; // Stop timer and inputs

            // Show level complete popup
            this.levelCompleteUI.classList.remove('hidden');
        }
    }

    nextLevel() {
        this.levelCompleteUI.classList.add('hidden');
        this.loadLevel(this.level);
    }

    screenShake() {
        const container = document.getElementById('game-container');
        container.classList.add('screen-shake');
        setTimeout(() => {
            container.classList.remove('screen-shake');
        }, 300);
    }

    restart() {
        this.level = 1;
        this.isPlaying = false;
        this.isGameOver = false;
        this.isPaused = false;
        this.screws = [];
        this.plates = [];
        this.particles = [];

        // Use logic clearing
        this.slotManager.clear();

        // UI Resets
        this.headerRow.classList.add('hidden'); // Hide entire header (timer, level, status)
        this.gameOverUI.classList.add('hidden');
        this.levelCompleteUI.classList.add('hidden');
        this.startScreen.classList.remove('fade-out'); // Remove fade-out so it's visible again
        this.startScreen.classList.remove('hidden');
    }

    togglePause() {
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    toggleMute() {
        if (this.audioManager.isMuted) {
            this.audioManager.unmute();
            this.updateMuteUI(false);
        } else {
            this.audioManager.mute();
            this.updateMuteUI(true);
        }
    }

    pause() {
        this.isPaused = true;
        this.audioManager.mute();
        this.updatePauseUI(true);
        console.log("Game paused");
    }

    resume() {
        this.isPaused = false;
        // Only unmute if we aren't globally muted by user choice
        // For simplicity compliance, we unmute, or check mute button state. 
        // But SDK requirement says "Unmute audio".
        this.audioManager.unmute();
        this.updatePauseUI(false);

        // Sync mute button if it was showing muted
        this.updateMuteUI(false);

        console.log("Game resumed");
    }

    updatePauseUI(isPaused) {
        if (!this.pauseBtn) return;
        this.pauseBtn.innerText = isPaused ? "▶️" : "⏸️";
        this.pauseBtn.setAttribute('aria-label', isPaused ? "Resume Game" : "Pause Game");
    }

    updateMuteUI(isMuted) {
        if (!this.muteBtn) return;
        this.muteBtn.innerText = isMuted ? "🔇" : "🔊";
        this.muteBtn.setAttribute('aria-label', isMuted ? "Unmute Audio" : "Mute Audio");
    }

    gameLoop(currentTime = performance.now()) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// ============================================
// INITIALIZE GAME
// ============================================
window.addEventListener('load', () => {
    // Game initialization logic (No longer using GameDistribution)

    // Create game instance
    window.game = new Game();
});
