/**
 * Visualization Renderer
 * Manages Three.js scene, camera, lights, and particle systems
 */

class VisualizationRenderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.orbitals = new Map(); // Map of orbital ID to particle system
        this.animationId = null;
        
        // Axis helpers
        this.axisHelpers = {
            x: null,
            y: null,
            z: null
        };
        
        // Auto-rotation settings
        this.autoRotateEnabled = false;
        this.rotationAxis = 'y';
        this.rotationSpeed = 0.2;
        
        // Particle animation settings
        this.animationEnabled = false;  // Animation off by default
        this.animationSpeed = 1.0;
        
        // Clipping plane settings
        this.clippingEnabled = false;
        this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.clippingPlaneHelper = null;
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
    }
    
    /**
     * Initialize Three.js scene, camera, renderer
     */
    initialize() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(8, 8, 8);
        this.camera.lookAt(0, 0, 0);
        
        // Detect GPU and create renderer with hardware acceleration
        const canvas = this.canvas;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                console.log('GPU Detected:', renderer);
            }
        }
        
        // Create renderer with GPU acceleration settings
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance', // Request high-performance GPU
            precision: 'highp', // High precision for better quality
            stencil: false, // Disable stencil buffer for better performance
            depth: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
        
        // Enable GPU-accelerated features
        this.renderer.sortObjects = false; // Disable sorting for better performance with particles
        
        // Enable local clipping
        this.renderer.localClippingEnabled = true;
        
        console.log('WebGL Renderer initialized with GPU acceleration');
        console.log('Renderer capabilities:', this.renderer.capabilities);
        
        // Add lights
        this.setupLights();
        
        // Add coordinate axes
        this.setupAxes();
        
        // Setup clipping plane helper
        this.setupClippingPlane();
        
        // Add orbit controls
        this.setupControls();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        return true;
    }
    
    /**
     * Set up scene lighting
     */
    setupLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light for depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);
        
        // Note: Removed point light at origin as it was causing visual artifacts
        // (white line appearing from center for elements with Z >= 5)
    }
    
    /**
     * Set up coordinate axes
     */
    setupAxes() {
        const axisLength = 15;
        const axisWidth = 2;
        
        // Create materials for each axis
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: axisWidth }); // Red for X
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: axisWidth }); // Green for Y
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: axisWidth }); // Blue for Z
        
        // X-axis
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-axisLength, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        this.axisHelpers.x = new THREE.Line(xGeometry, xMaterial);
        this.axisHelpers.x.name = 'x-axis';
        this.scene.add(this.axisHelpers.x);
        
        // Y-axis
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axisLength, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        this.axisHelpers.y = new THREE.Line(yGeometry, yMaterial);
        this.axisHelpers.y.name = 'y-axis';
        this.scene.add(this.axisHelpers.y);
        
        // Z-axis
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -axisLength),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        this.axisHelpers.z = new THREE.Line(zGeometry, zMaterial);
        this.axisHelpers.z.name = 'z-axis';
        this.scene.add(this.axisHelpers.z);
        
        console.log('Coordinate axes added to scene');
    }
    
    /**
     * Set up clipping plane
     */
    setupClippingPlane() {
        // Create a visual helper for the clipping plane
        const planeSize = 30;
        const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2,
            wireframe: false
        });
        
        this.clippingPlaneHelper = new THREE.Mesh(planeGeometry, planeMaterial);
        this.clippingPlaneHelper.visible = false;
        this.scene.add(this.clippingPlaneHelper);
        
        console.log('Clipping plane helper created');
    }
    
    /**
     * Set axis visibility
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {boolean} visible - visibility state
     */
    setAxisVisibility(axis, visible) {
        if (this.axisHelpers[axis]) {
            this.axisHelpers[axis].visible = visible;
        }
    }
    
    /**
     * Set up orbit controls
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 300; // Increased from 100 to 300 for larger orbitals
        this.controls.maxPolarAngle = Math.PI;
    }
    
    /**
     * Create particle system for an orbital
     * @param {string} orbitalId - Unique orbital identifier
     * @param {Array} particleData - Array of {position, probability}
     * @param {string} orbitalType - Orbital type (s, p, d, f)
     * @param {number} scale - Scale factor (default 1.0)
     * @returns {THREE.Points}
     */
    createOrbitalParticles(orbitalId, particleData, orbitalType, scale = 1.0, customColor = null) {
        console.log(`Renderer: Creating particle system for ${orbitalId} (${orbitalType}) with ${particleData.length} particles, scale: ${scale}`);
        
        const particleCount = particleData.length;
        
        // Validate particle count
        if (particleCount === 0) {
            console.warn(`Renderer: No particles to render for ${orbitalId}`);
            return null;
        }
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const velocities = new Float32Array(particleCount * 3);
        
        // Get base color: use custom color if provided, otherwise use default type color
        const baseColor = customColor || CONSTANTS.ORBITAL_COLORS[orbitalType] || CONSTANTS.ORBITAL_COLORS.s;
        
        console.log(`Renderer: Using color for ${orbitalType}:`, baseColor);
        
        // Fill arrays with particle data
        for (let i = 0; i < particleCount; i++) {
            const particle = particleData[i];
            
            // Position
            positions[i * 3] = particle.position.x;
            positions[i * 3 + 1] = particle.position.y;
            positions[i * 3 + 2] = particle.position.z;
            
            // Color based on probability (brighter = higher probability)
            const intensity = 0.3 + 0.7 * particle.probability;
            colors[i * 3] = baseColor.r * intensity;
            colors[i * 3 + 1] = baseColor.g * intensity;
            colors[i * 3 + 2] = baseColor.b * intensity;
            
            // Size based on probability
            sizes[i] = CONSTANTS.PARTICLE_SIZE * (0.5 + 0.5 * particle.probability);
            
            // Random velocity for air stream effect (reduced for shape preservation)
            const speed = (0.005 + Math.random() * 0.01); // Reduced speed
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 2;
            velocities[i * 3] = Math.sin(theta) * Math.cos(phi) * speed;
            velocities[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * speed;
            velocities[i * 3 + 2] = Math.cos(theta) * speed;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        // IMPORTANT: Compute bounding sphere to prevent rendering artifacts
        geometry.computeBoundingSphere();
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: CONSTANTS.PARTICLE_SIZE,
            vertexColors: true,
            transparent: true,
            opacity: CONSTANTS.PARTICLE_OPACITY,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
            // clippingPlanes will be set dynamically when clipping is enabled
        });
        
        // Create particle system (THREE.Points, NOT Line or LineSegments)
        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.name = orbitalId;
        
        // Apply scale
        particleSystem.scale.set(scale, scale, scale);
        
        // Store original positions for boundary checking
        particleSystem.userData.originalPositions = new Float32Array(positions);
        particleSystem.userData.maxDistance = this.calculateMaxDistance(positions);
        
        // Add to scene and store reference
        this.scene.add(particleSystem);
        this.orbitals.set(orbitalId, particleSystem);
        
        console.log(`Renderer: Particle system added to scene. Total orbitals in scene: ${this.orbitals.size}`);
        console.log(`Renderer: Scene now has ${this.scene.children.length} children`);
        
        return particleSystem;
    }
    
    /**
     * Calculate maximum distance from origin for boundary checking
     * @param {Float32Array} positions
     * @returns {number}
     */
    calculateMaxDistance(positions) {
        let maxDist = 0;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            const dist = Math.sqrt(x * x + y * y + z * z);
            if (dist > maxDist) maxDist = dist;
        }
        return maxDist * 1.2; // Add 20% buffer
    }
    
    /**
     * Update particles for an existing orbital
     * @param {string} orbitalId
     * @param {Array} particleData
     * @param {string} orbitalType
     */
    updateOrbitalParticles(orbitalId, particleData, orbitalType) {
        this.removeOrbital(orbitalId);
        this.createOrbitalParticles(orbitalId, particleData, orbitalType);
    }
    
    /**
     * Remove orbital from scene
     * @param {string} orbitalId
     */
    removeOrbital(orbitalId) {
        const particleSystem = this.orbitals.get(orbitalId);
        if (particleSystem) {
            this.scene.remove(particleSystem);
            particleSystem.geometry.dispose();
            particleSystem.material.dispose();
            this.orbitals.delete(orbitalId);
        }
    }
    
    /**
     * Clear all orbitals from scene
     */
    clearAllOrbitals() {
        this.orbitals.forEach((particleSystem, orbitalId) => {
            this.removeOrbital(orbitalId);
        });
        this.orbitals.clear();
    }
    
    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Animate particles (air stream effect)
        this.animateParticles();
        
        // Handle custom auto-rotation
        if (this.autoRotateEnabled) {
            const rotationAmount = this.rotationSpeed * 0.01;
            
            switch (this.rotationAxis) {
                case 'x':
                    this.scene.rotation.x += rotationAmount;
                    break;
                case 'y':
                    this.scene.rotation.y += rotationAmount;
                    break;
                case 'z':
                    this.scene.rotation.z += rotationAmount;
                    break;
            }
        }
        
        // Update performance monitoring
        this.updatePerformance();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Animate particles to create air stream effect
     */
    animateParticles() {
        if (!this.animationEnabled || this.orbitals.size === 0) return;
        
        this.orbitals.forEach((particleSystem) => {
            const positions = particleSystem.geometry.attributes.position;
            const velocities = particleSystem.geometry.attributes.velocity;
            
            if (!positions || !velocities) {
                console.warn('Missing position or velocity attributes');
                return;
            }
            
            const posArray = positions.array;
            const velArray = velocities.array;
            const originalPositions = particleSystem.userData.originalPositions;
            const maxDistance = particleSystem.userData.maxDistance;
            
            // Update each particle position
            for (let i = 0; i < posArray.length; i += 3) {
                // Apply velocity with animation speed multiplier
                posArray[i] += velArray[i] * this.animationSpeed;
                posArray[i + 1] += velArray[i + 1] * this.animationSpeed;
                posArray[i + 2] += velArray[i + 2] * this.animationSpeed;
                
                // Calculate distance from original position
                const dx = posArray[i] - originalPositions[i];
                const dy = posArray[i + 1] - originalPositions[i + 1];
                const dz = posArray[i + 2] - originalPositions[i + 2];
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                // If particle drifts too far, reset to original position
                // Reduced threshold to keep shape intact (10% instead of 30%)
                if (distance > maxDistance * 0.1) {
                    posArray[i] = originalPositions[i];
                    posArray[i + 1] = originalPositions[i + 1];
                    posArray[i + 2] = originalPositions[i + 2];
                    
                    // Randomize velocity slightly
                    const speed = (0.005 + Math.random() * 0.01);
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI * 2;
                    velArray[i] = Math.sin(theta) * Math.cos(phi) * speed;
                    velArray[i + 1] = Math.sin(theta) * Math.sin(phi) * speed;
                    velArray[i + 2] = Math.cos(theta) * speed;
                }
            }
            
            // Mark position attribute as needing update
            positions.needsUpdate = true;
        });
    }
    
    /**
     * Set animation speed
     * @param {number} speed - Animation speed multiplier
     */
    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
        console.log(`Animation speed set to: ${speed}`);
    }
    
    /**
     * Enable/disable particle animation
     * @param {boolean} enabled - Animation enabled state
     */
    setAnimationEnabled(enabled) {
        this.animationEnabled = enabled;
        console.log(`Particle animation ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable/disable clipping plane
     * @param {boolean} enabled - Clipping enabled state
     */
    setClippingEnabled(enabled) {
        this.clippingEnabled = enabled;
        
        // Don't show the helper plane
        if (this.clippingPlaneHelper) {
            this.clippingPlaneHelper.visible = false;
        }
        
        // Update all particle materials
        this.orbitals.forEach((particleSystem) => {
            if (enabled) {
                particleSystem.material.clippingPlanes = [this.clippingPlane];
            } else {
                particleSystem.material.clippingPlanes = [];
            }
            particleSystem.material.needsUpdate = true;
        });
        
        console.log(`Clipping plane ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Set clipping plane position
     * @param {number} position - Position along the normal (-10 to 10)
     */
    setClippingPosition(position) {
        // In Three.js, the clipping plane equation is: normal · point + constant = 0
        // Points where normal · point + constant < 0 are clipped
        // So we need to negate the position to get the correct clipping direction
        this.clippingPlane.constant = -position;
        
        // Update helper position by moving along the plane's normal vector
        if (this.clippingPlaneHelper) {
            const normal = this.clippingPlane.normal;
            // Position = normal * distance
            this.clippingPlaneHelper.position.set(
                normal.x * position,
                normal.y * position,
                normal.z * position
            );
        }
        
        // Force update of materials
        this.orbitals.forEach((particleSystem) => {
            if (particleSystem.material.clippingPlanes && particleSystem.material.clippingPlanes.length > 0) {
                particleSystem.material.needsUpdate = true;
            }
        });
    }
    
    /**
     * Set clipping plane axis
     * @param {string} axis - 'x', 'y', or 'z'
     */
    setClippingAxis(axis) {
        // Reset position to 0 when axis changes
        const resetPosition = 0;
        
        switch (axis) {
            case 'x':
                // Plane perpendicular to X-axis (YZ plane)
                this.clippingPlane.normal.set(1, 0, 0);
                if (this.clippingPlaneHelper) {
                    // Rotate to be perpendicular to X-axis
                    this.clippingPlaneHelper.rotation.set(0, Math.PI / 2, 0);
                    this.clippingPlaneHelper.position.set(resetPosition, 0, 0);
                }
                break;
            case 'y':
                // Plane perpendicular to Y-axis (XZ plane)
                this.clippingPlane.normal.set(0, 1, 0);
                if (this.clippingPlaneHelper) {
                    // Rotate to be perpendicular to Y-axis (horizontal)
                    this.clippingPlaneHelper.rotation.set(0, 0, 0);
                    this.clippingPlaneHelper.position.set(0, resetPosition, 0);
                }
                break;
            case 'z':
                // Plane perpendicular to Z-axis (XY plane)
                this.clippingPlane.normal.set(0, 0, 1);
                if (this.clippingPlaneHelper) {
                    // Rotate to be perpendicular to Z-axis
                    this.clippingPlaneHelper.rotation.set(Math.PI / 2, 0, 0);
                    this.clippingPlaneHelper.position.set(0, 0, resetPosition);
                }
                break;
        }
        
        // Reset clipping position to 0
        this.clippingPlane.constant = -resetPosition;
        
        // Force update of clipping plane
        this.orbitals.forEach((particleSystem) => {
            if (particleSystem.material.clippingPlanes && particleSystem.material.clippingPlanes.length > 0) {
                particleSystem.material.needsUpdate = true;
            }
        });
        
        console.log(`Clipping axis set to: ${axis}, normal: (${this.clippingPlane.normal.x}, ${this.clippingPlane.normal.y}, ${this.clippingPlane.normal.z}), position reset to 0`);
        
        // Return the reset position so the app controller can update the GUI
        return resetPosition;
    }
    
    /**
     * Set auto-rotate
     * @param {boolean} enabled
     * @param {string} axis - 'x', 'y', or 'z'
     */
    setAutoRotate(enabled, axis = 'y') {
        this.autoRotateEnabled = enabled;
        this.rotationAxis = axis;
        
        // Reset scene rotation when disabling
        if (!enabled) {
            this.scene.rotation.set(0, 0, 0);
        }
    }
    
    /**
     * Set rotation speed
     * @param {number} speed
     */
    setRotationSpeed(speed) {
        this.rotationSpeed = speed;
    }
    
    /**
     * Update performance monitoring
     */
    updatePerformance() {
        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;
        
        if (elapsed >= 1000) {
            this.fps = (this.frameCount * 1000) / elapsed;
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // Log performance warnings
            if (this.fps < CONSTANTS.MIN_FPS) {
                console.warn(`Low FPS detected: ${this.fps.toFixed(1)}`);
            }
        }
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    /**
     * Get camera for external access
     * @returns {THREE.Camera}
     */
    getCamera() {
        return this.camera;
    }
    
    /**
     * Get current FPS
     * @returns {number}
     */
    getFPS() {
        return this.fps;
    }
    
    /**
     * Stop animation loop
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Dispose of renderer resources
     */
    dispose() {
        this.stop();
        this.clearAllOrbitals();
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}


// Make class available globally
window.VisualizationRenderer = VisualizationRenderer;
