/**
 * Application Controller
 * Coordinates all subsystems and manages application state
 */

class ApplicationController {
    constructor() {
        this.quantumEngine = null;
        this.particleSampler = null;
        this.renderer = null;
        this.guiController = null;
        this.configuration = null;
        
        // Application state
        this.state = {
            atomicNumber: 1,
            elementSymbol: 'H',
            displaySettings: {
                particleCount: CONSTANTS.DEFAULT_PARTICLE_COUNT,
                particleSize: CONSTANTS.PARTICLE_SIZE,
                opacity: CONSTANTS.PARTICLE_OPACITY,
                scale: 1.0,  // Scale factor for atom size (0.1 to 3.0)
                animationEnabled: true,  // Animation on by default
                animationSpeed: CONSTANTS.PARTICLE_ANIMATION_SPEED,  // Animation speed multiplier
                clippingEnabled: false,  // Clipping off by default
                clippingPosition: 0,  // Clipping plane position
                clippingAxis: 'y'  // Clipping plane axis
            },
            cameraSettings: {
                autoRotate: false,
                rotationSpeed: 0.2,
                rotationAxis: 'y'  // 'x', 'y', or 'z'
            }
        };
    }
    
    /**
     * Initialize all subsystems
     * @param {HTMLCanvasElement} canvas
     * @returns {Promise<boolean>}
     */
    async initialize(canvas) {
        try {
            console.log('AppController: Checking WebGL support...');
            
            // Check WebGL support
            if (!this.checkWebGLSupport()) {
                throw new Error('WebGL is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.');
            }
            
            console.log('AppController: WebGL supported');
            console.log('AppController: Initializing quantum mechanics engine...');
            
            // Initialize quantum mechanics engine
            this.quantumEngine = new QuantumMechanicsEngine();
            this.quantumEngine.setAtomicNumber(this.state.atomicNumber);
            
            console.log('AppController: Initializing particle sampler...');
            
            // Initialize particle sampler
            this.particleSampler = new ParticleSampler(this.quantumEngine);
            
            console.log('AppController: Initializing renderer...');
            
            // Initialize renderer
            this.renderer = new VisualizationRenderer(canvas);
            this.renderer.initialize();
            
            console.log('AppController: Initializing GUI...');
            
            // Initialize GUI
            this.guiController = new GUIController(this);
            this.guiController.initialize();
            
            console.log('AppController: Generating initial visualization...');
            
            // Generate initial visualization
            await this.setAtomicNumber(this.state.atomicNumber);
            
            // Enable animation by default
            this.renderer.setAnimationEnabled(this.state.displaySettings.animationEnabled);
            this.renderer.setAnimationSpeed(this.state.displaySettings.animationSpeed);
            
            console.log('AppController: Starting animation loop...');
            
            // Start animation loop
            this.renderer.animate();
            
            console.log('AppController: Initialization complete!');
            
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }
    
    /**
     * Check WebGL support
     * @returns {boolean}
     */
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Set atomic number and update visualization
     * @param {number} atomicNumber
     */
    async setAtomicNumber(atomicNumber) {
        console.log('setAtomicNumber called with:', atomicNumber);
        
        // Clamp atomic number to valid range
        const clampedZ = Math.max(1, Math.min(CONSTANTS.MAX_ATOMIC_NUMBER, Math.floor(atomicNumber)));
        
        if (clampedZ !== atomicNumber) {
            console.warn(`Atomic number ${atomicNumber} out of range, clamped to ${clampedZ}`);
        }
        
        console.log('Setting atomic number to:', clampedZ);
        this.state.atomicNumber = clampedZ;
        this.quantumEngine.setAtomicNumber(clampedZ);
        
        // Build electron configuration
        console.log('Building electron configuration...');
        this.configuration = new ElectronConfiguration(clampedZ);
        this.configuration.build();
        
        // Find the outermost orbital (highest n, then highest l, then highest m)
        let outermostOrbital = null;
        let maxN = 0;
        let maxL = -1;
        let maxM = -999;
        
        this.configuration.orbitals.forEach(orbital => {
            if (orbital.electrons > 0) { // Only consider orbitals with electrons
                if (orbital.n > maxN || 
                    (orbital.n === maxN && orbital.l > maxL) ||
                    (orbital.n === maxN && orbital.l === maxL && orbital.m > maxM)) {
                    maxN = orbital.n;
                    maxL = orbital.l;
                    maxM = orbital.m;
                    outermostOrbital = orbital;
                }
            }
        });
        
        // Deselect all orbitals, then select only the outermost one
        this.configuration.orbitals.forEach(orbital => {
            orbital.visible = false;
        });
        
        if (outermostOrbital) {
            outermostOrbital.visible = true;
            console.log(`Outermost orbital selected: ${outermostOrbital.getDesignation()} (m=${outermostOrbital.m})`);
        }
        
        console.log('Configuration built:', this.configuration.elementSymbol, 'with', this.configuration.orbitals.length, 'orbitals');
        
        this.state.elementSymbol = this.configuration.elementSymbol;
        
        // Update GUI
        if (this.guiController) {
            console.log('Updating GUI...');
            this.guiController.updateElementInfo(clampedZ);
            this.guiController.createOrbitalControls(this.configuration.orbitals);
        }
        
        // Update visualization
        console.log('Updating visualization...');
        await this.updateVisualization();
        console.log('setAtomicNumber complete');
    }
    
    /**
     * Update visualization with current configuration
     */
    async updateVisualization() {
        if (!this.configuration) return;
        
        console.log('Updating visualization...');
        
        // Show loading spinner
        this.showLoadingSpinner(true, 'Generating electron cloud...');
        
        // Clear existing orbitals
        this.renderer.clearAllOrbitals();
        
        // Filter orbitals: show ALL visible orbitals to get proper 3D shapes
        // This includes empty orbitals (0 electrons) to show complete dumbbell/cloverleaf shapes
        const visibleOrbitals = this.configuration.orbitals.filter(
            orbital => orbital.visible
        );
        
        console.log(`Visualizing ${visibleOrbitals.length} orbitals (including empty ones for proper 3D shape)`);
        
        const totalParticleCount = this.state.displaySettings.particleCount;
        
        // Progressive loading: start with fewer particles, then add more
        const progressiveLevels = [0.3, 0.6, 1.0]; // 30%, 60%, 100%
        
        for (let levelIndex = 0; levelIndex < progressiveLevels.length; levelIndex++) {
            const level = progressiveLevels[levelIndex];
            const currentTotalParticles = Math.floor(totalParticleCount * level);
            
            // Distribute particles evenly across visible orbitals
            const particleCountPerOrbital = visibleOrbitals.length > 0 
                ? Math.floor(currentTotalParticles / visibleOrbitals.length)
                : currentTotalParticles;
            
            console.log(`Progressive level ${levelIndex + 1}/${progressiveLevels.length}: ${Math.round(level * 100)}% - ${particleCountPerOrbital} particles per orbital`);
            
            // Clear previous level's particles before adding new level
            if (levelIndex > 0) {
                this.renderer.clearAllOrbitals();
            }
            
            // Generate particles for EACH INDIVIDUAL ORBITAL separately
            for (let i = 0; i < visibleOrbitals.length; i++) {
                const orbital = visibleOrbitals[i];
                
                try {
                    // Update loading message
                    this.updateLoadingMessage(`Generating ${orbital.getDesignation()} orbital... ${Math.round(level * 100)}% (${i + 1}/${visibleOrbitals.length})`);
                    
                    // Use distributed particle count
                    // Empty orbitals (0 electrons) get 30% of the particle count for fainter appearance
                    const orbitalParticleCount = orbital.electrons > 0 
                        ? particleCountPerOrbital 
                        : Math.floor(particleCountPerOrbital * 0.3);
                    
                    const particles = this.particleSampler.generateOrbitalParticles(
                        orbital.n,
                        orbital.l,
                        orbital.m,
                        orbitalParticleCount
                    );
                    
                    // Create particle system for this orbital with current scale and custom color
                    this.renderer.createOrbitalParticles(
                        orbital.getId(),
                        particles,
                        orbital.getType(),
                        this.state.displaySettings.scale,
                        orbital.color  // Pass custom color (null if not set)
                    );
                    
                } catch (error) {
                    console.error(`Error generating orbital ${orbital.getId()}:`, error);
                }
            }
            
            // Hide loading spinner after first level to show progressive rendering
            if (levelIndex === 0) {
                this.showLoadingSpinner(false);
            }
            
            // Delay between levels to show progressive rendering (longer delay for visibility)
            if (levelIndex < progressiveLevels.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // Ensure loading spinner is hidden
        this.showLoadingSpinner(false);
        
        // Adjust camera to fit visible orbitals
        if (visibleOrbitals.length > 0) {
            // Find the largest n value among visible orbitals
            const maxN = Math.max(...visibleOrbitals.map(o => o.n));
            this.adjustCameraForOrbital(maxN);
            
            // Adjust particle size based on orbital size
            // For orbitals larger than 1s, use larger particle size for better visibility
            const hasLargeOrbital = visibleOrbitals.some(o => o.n > 1 || o.l > 0);
            if (hasLargeOrbital) {
                this.state.displaySettings.particleSize = 0.3;
                this.updateParticleSize(0.3);
            } else {
                // Reset to default for 1s
                this.state.displaySettings.particleSize = CONSTANTS.PARTICLE_SIZE;
                this.updateParticleSize(CONSTANTS.PARTICLE_SIZE);
            }
        }
        
        console.log('Visualization update complete');
    }
    
    /**
     * Show/hide loading spinner
     * @param {boolean} show
     * @param {string} message - Loading message
     */
    showLoadingSpinner(show, message = 'Loading...') {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (show) {
            loadingOverlay.style.display = 'flex';
            if (loadingText) loadingText.textContent = message;
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
    
    /**
     * Update loading message
     * @param {string} message - Loading message
     */
    updateLoadingMessage(message) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
    
    /**
     * Visualize a single orbital with specific quantum numbers
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     */
    async visualizeSingleOrbital(n, l, m) {
        console.log(`Visualizing single orbital: n=${n}, l=${l}, m=${m}`);
        
        // Validate quantum numbers
        if (l >= n) {
            throw new Error(`Invalid quantum numbers: l (${l}) must be less than n (${n})`);
        }
        if (Math.abs(m) > l) {
            throw new Error(`Invalid quantum numbers: |m| (${Math.abs(m)}) must be ≤ l (${l})`);
        }
        
        // Clear existing orbitals
        this.renderer.clearAllOrbitals();
        
        // Create a single orbital object
        const orbital = new Orbital(n, l, m);
        orbital.electrons = 1; // Treat as if it has one electron for visualization
        orbital.visible = true;
        
        console.log(`Created orbital: ${orbital.getDesignation()} (${orbital.getId()})`);
        
        // Generate particles for this orbital
        const particleCount = this.state.displaySettings.particleCount;
        const particles = this.particleSampler.generateOrbitalParticles(n, l, m, particleCount);
        
        console.log(`Generated ${particles.length} particles`);
        
        // Create particle system with current scale
        this.renderer.createOrbitalParticles(
            orbital.getId(),
            particles,
            orbital.getType(),
            this.state.displaySettings.scale
        );
        
        // Update GUI to show only this orbital
        if (this.guiController) {
            this.guiController.createOrbitalControls([orbital]);
        }
        
        console.log('Single orbital visualization complete');
    }
    /**
     * Visualize a single orbital with specific quantum numbers
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     */
    async visualizeSingleOrbital(n, l, m) {
        console.log(`Visualizing single orbital: n=${n}, l=${l}, m=${m}`);

        // Validate quantum numbers
        if (l >= n) {
            throw new Error(`Invalid quantum numbers: l (${l}) must be less than n (${n})`);
        }
        if (Math.abs(m) > l) {
            throw new Error(`Invalid quantum numbers: |m| (${Math.abs(m)}) must be ≤ l (${l})`);
        }

        // Clear existing orbitals
        this.renderer.clearAllOrbitals();

        // Create a single orbital object
        const orbital = new Orbital(n, l, m);
        orbital.electrons = 1; // Treat as if it has one electron for visualization
        orbital.visible = true;

        console.log(`Created orbital: ${orbital.getDesignation()} (${orbital.getId()})`);

        // Generate particles for this orbital
        const particleCount = this.state.displaySettings.particleCount;
        const particles = this.particleSampler.generateOrbitalParticles(n, l, m, particleCount);

        console.log(`Generated ${particles.length} particles`);

        // Create particle system
        this.renderer.createOrbitalParticles(
            orbital.getId(),
            particles,
            orbital.getType()
        );

        // Update GUI to show only this orbital
        if (this.guiController) {
            this.guiController.createOrbitalControls([orbital]);
        }

        console.log('Single orbital visualization complete');
    }

    
    /**
     * Set orbital visibility
     * @param {number} n
     * @param {number} l
     * @param {number} m
     * @param {boolean} visible
     */
    setOrbitalVisibility(n, l, m, visible) {
        if (!this.configuration) return;
        
        const orbital = this.configuration.orbitals.find(
            o => o.n === n && o.l === l && o.m === m
        );
        
        if (orbital) {
            orbital.visible = visible;
            this.updateVisualization();
        }
    }
    
    /**
     * Reset camera to default position
     */
    resetCamera() {
        if (this.renderer && this.renderer.camera) {
            this.renderer.camera.position.set(8, 8, 8);
            this.renderer.camera.lookAt(0, 0, 0);
            if (this.renderer.controls) {
                this.renderer.controls.reset();
            }
        }
    }
    
    /**
     * Adjust camera distance based on orbital size
     * @param {number} n - Principal quantum number of the outermost orbital
     */
    adjustCameraForOrbital(n) {
        if (!this.renderer || !this.renderer.camera) return;
        
        // Calculate camera distance based on principal quantum number
        // Larger n values need more distance to fit in view
        // Use n² scaling with increased multiplier for very large orbitals
        const baseDistance = 10;
        const scaleFactor = Math.max(1, (n * n) / 2); // Increased from /4 to /2 for more zoom out
        const distance = baseDistance * scaleFactor;
        
        console.log(`Adjusting camera for n=${n}: distance=${distance.toFixed(2)}`);
        
        // Set camera position maintaining the 45-degree angle view
        const angle = Math.PI / 4; // 45 degrees
        const x = distance * Math.cos(angle);
        const y = distance * Math.cos(angle);
        const z = distance * Math.cos(angle);
        
        this.renderer.camera.position.set(x, y, z);
        this.renderer.camera.lookAt(0, 0, 0);
        
        // Update controls target
        if (this.renderer.controls) {
            this.renderer.controls.target.set(0, 0, 0);
            this.renderer.controls.update();
        }
    }
    
    /**
     * Set auto-rotate
     * @param {boolean} enabled
     */
    setAutoRotate(enabled) {
        this.state.cameraSettings.autoRotate = enabled;
        if (this.renderer) {
            this.renderer.setAutoRotate(enabled, this.state.cameraSettings.rotationAxis);
        }
    }
    
    /**
     * Set rotation speed
     * @param {number} speed
     */
    setRotationSpeed(speed) {
        this.state.cameraSettings.rotationSpeed = speed;
        if (this.renderer) {
            this.renderer.setRotationSpeed(speed);
        }
    }
    
    /**
     * Set rotation axis
     * @param {string} axis - 'x', 'y', or 'z'
     */
    setRotationAxis(axis) {
        this.state.cameraSettings.rotationAxis = axis;
        if (this.renderer && this.state.cameraSettings.autoRotate) {
            this.renderer.setAutoRotate(true, axis);
        }
    }
    
    /**
     * Set atom scale
     * @param {number} scale - Scale factor (0.1 to 3.0)
     */
    setScale(scale) {
        this.state.displaySettings.scale = scale;
        
        // Apply scale to all orbital particle systems
        if (this.renderer && this.renderer.orbitals) {
            this.renderer.orbitals.forEach((particleSystem) => {
                particleSystem.scale.set(scale, scale, scale);
            });
        }
    }
    
    /**
     * Update particle size for all orbitals
     * @param {number} size - Particle size
     */
    updateParticleSize(size) {
        if (this.renderer && this.renderer.orbitals) {
            this.renderer.orbitals.forEach((particleSystem) => {
                particleSystem.material.size = size;
            });
        }
    }
    
    /**
     * Set axis visibility
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {boolean} visible - visibility state
     */
    setAxisVisibility(axis, visible) {
        if (this.renderer) {
            this.renderer.setAxisVisibility(axis, visible);
        }
    }
    
    /**
     * Set particle animation speed
     * @param {number} speed - Animation speed multiplier
     */
    setAnimationSpeed(speed) {
        this.state.displaySettings.animationSpeed = speed;
        if (this.renderer) {
            this.renderer.setAnimationSpeed(speed);
        }
    }
    
    /**
     * Enable/disable particle animation
     * @param {boolean} enabled - Animation enabled state
     */
    setAnimationEnabled(enabled) {
        this.state.displaySettings.animationEnabled = enabled;
        if (this.renderer) {
            this.renderer.setAnimationEnabled(enabled);
        }
    }
    
    /**
     * Enable/disable clipping plane
     * @param {boolean} enabled - Clipping enabled state
     */
    setClippingEnabled(enabled) {
        this.state.displaySettings.clippingEnabled = enabled;
        if (this.renderer) {
            this.renderer.setClippingEnabled(enabled);
        }
    }
    
    /**
     * Set clipping plane position
     * @param {number} position - Position along the normal
     */
    setClippingPosition(position) {
        this.state.displaySettings.clippingPosition = position;
        if (this.renderer) {
            this.renderer.setClippingPosition(position);
        }
    }
    
    /**
     * Set clipping plane axis
     * @param {string} axis - 'x', 'y', or 'z'
     */
    setClippingAxis(axis) {
        this.state.displaySettings.clippingAxis = axis;
        if (this.renderer) {
            const resetPosition = this.renderer.setClippingAxis(axis);
            // Update the GUI to reflect the reset position
            this.state.displaySettings.clippingPosition = resetPosition;
        }
    }
    
    /**
     * Get current state
     * @returns {Object}
     */
    getState() {
        return {
            ...this.state,
            configuration: this.configuration,
            fps: this.renderer ? this.renderer.getFPS() : 0
        };
    }
    
    /**
     * Reset to default state
     */
    async reset() {
        this.state.atomicNumber = 1;
        this.state.displaySettings = {
            particleCount: CONSTANTS.DEFAULT_PARTICLE_COUNT,
            particleSize: CONSTANTS.PARTICLE_SIZE,
            opacity: CONSTANTS.PARTICLE_OPACITY
        };
        this.state.cameraSettings = {
            autoRotate: false,
            rotationSpeed: 0.2,
            rotationAxis: 'y'
        };
        
        await this.setAtomicNumber(1);
        this.resetCamera();
    }
    
    /**
     * Dispose of all resources
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.guiController) {
            this.guiController.destroy();
        }
    }
}


// Make class available globally
window.ApplicationController = ApplicationController;
