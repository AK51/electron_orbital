/**
 * GUI Controller
 * Manages user interface controls using lil-gui
 */

class GUIController {
    constructor(appController) {
        this.appController = appController;
        this.gui = null;
        this.folders = {};
        this.orbitalControls = new Map();
    }
    
    /**
     * Initialize lil-gui interface
     */
    initialize() {
        this.gui = new lil.GUI({ width: 450 });
        this.gui.title('Electron Cloud Visualizer');
        
        this.createAtomControls();
        this.createDisplayControls();
        this.createCameraControls();
        this.createCredits();
        
        return this.gui;
    }
    
    /**
     * Create Atom Settings controls
     */
    createAtomControls() {
        const folder = this.gui.addFolder('Atom Settings');
        this.folders.atom = folder;
        
        // Create a separate object for GUI binding
        const guiState = {
            atomicNumber: this.appController.state.atomicNumber
        };
        
        // Atomic number slider (no auto-update)
        folder.add(guiState, 'atomicNumber', 1, CONSTANTS.MAX_ATOMIC_NUMBER, 1)
            .name('Atomic Number')
            .onChange((value) => {
                console.log('GUI: Atomic number slider moved to:', value);
                // Just update the element info, don't regenerate yet
                this.updateElementInfo(value);
            });
        
        // Element display (read-only)
        const elementInfo = { element: '' };
        this.elementController = folder.add(elementInfo, 'element')
            .name('Element')
            .listen()
            .disable();
        
        // Electron configuration display (read-only)
        const configInfo = { configuration: '' };
        this.configController = folder.add(configInfo, 'configuration')
            .name('Configuration')
            .listen()
            .disable();
        
        // Update button for element configuration
        folder.add({
            updateElement: () => {
                console.log('GUI: Update Element button clicked');
                const newAtomicNumber = guiState.atomicNumber;
                
                // Show loading spinner immediately
                const loadingOverlay = document.getElementById('loading-overlay');
                const loadingText = document.getElementById('loading-text');
                if (loadingOverlay) loadingOverlay.style.display = 'flex';
                if (loadingText) loadingText.textContent = 'Loading element...';
                
                // Update element asynchronously
                this.appController.setAtomicNumber(newAtomicNumber).catch(err => {
                    console.error('Error updating atomic number:', err);
                    // Hide loading on error
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                });
            }
        }, 'updateElement')
            .name('🔄 Update Element');
        
        this.updateElementInfo(this.appController.state.atomicNumber);
        
        folder.open();
    }
    
    /**
     * Create Display Options controls
     */
    createDisplayControls() {
        const folder = this.gui.addFolder('Display Options');
        this.folders.display = folder;
        
        const settings = this.appController.state.displaySettings;
        
        // Scale slider
        folder.add(settings, 'scale', 0.1, 3.0, 0.1)
            .name('Atom Scale')
            .onChange((value) => {
                this.appController.setScale(value);
            });
        
        // Particle count slider
        folder.add(settings, 'particleCount', 
            CONSTANTS.MIN_PARTICLE_COUNT, 
            CONSTANTS.MAX_PARTICLE_COUNT, 
            1000)
            .name('Particle Count')
            .onChange(() => {
                this.appController.updateVisualization();
            });
        
        // Particle size slider
        folder.add(settings, 'particleSize', 0.01, 0.2, 0.01)
            .name('Particle Size')
            .onChange((value) => {
                this.updateParticleSize(value);
            });
        
        // Opacity slider
        folder.add(settings, 'opacity', 0.1, 1.0, 0.1)
            .name('Opacity')
            .onChange((value) => {
                this.updateParticleOpacity(value);
            });
        
        // Animation enabled checkbox
        folder.add(settings, 'animationEnabled')
            .name('Enable Animation')
            .onChange((value) => {
                this.appController.setAnimationEnabled(value);
            });
        
        // Animation speed slider
        folder.add(settings, 'animationSpeed', 0.0, 5.0, 0.1)
            .name('Animation Speed')
            .onChange((value) => {
                this.appController.setAnimationSpeed(value);
            });
        
        // Clipping plane section
        folder.add(settings, 'clippingEnabled')
            .name('Enable Clipping')
            .onChange((value) => {
                this.appController.setClippingEnabled(value);
            });
        
        folder.add(settings, 'clippingAxis', ['x', 'y', 'z'])
            .name('Clipping Axis')
            .onChange((value) => {
                this.appController.setClippingAxis(value);
            });
        
        folder.add(settings, 'clippingPosition', -20, 20, 0.1)
            .name('Clipping Position')
            .onChange((value) => {
                this.appController.setClippingPosition(value);
            });
        
        // Coordinate Axes section
        const axesSettings = {
            showXAxis: true,
            showYAxis: true,
            showZAxis: true
        };
        
        folder.add(axesSettings, 'showXAxis')
            .name('Show X-Axis (Red)')
            .onChange((value) => {
                this.appController.setAxisVisibility('x', value);
            });
        
        folder.add(axesSettings, 'showYAxis')
            .name('Show Y-Axis (Green)')
            .onChange((value) => {
                this.appController.setAxisVisibility('y', value);
            });
        
        folder.add(axesSettings, 'showZAxis')
            .name('Show Z-Axis (Blue)')
            .onChange((value) => {
                this.appController.setAxisVisibility('z', value);
            });
        
        folder.open();
    }
    
    /**
     * Create Camera controls
     */
    createCameraControls() {
        const folder = this.gui.addFolder('Camera');
        this.folders.camera = folder;
        
        const settings = this.appController.state.cameraSettings;
        
        // Reset view button
        folder.add({ reset: () => this.appController.resetCamera() }, 'reset')
            .name('Reset View');
        
        // Auto-rotate toggle
        folder.add(settings, 'autoRotate')
            .name('Auto Rotate')
            .onChange((value) => {
                this.appController.setAutoRotate(value);
            });
        
        // Rotation axis selector
        folder.add(settings, 'rotationAxis', ['x', 'y', 'z'])
            .name('Rotation Axis')
            .onChange((value) => {
                this.appController.setRotationAxis(value);
            });
        
        // Rotation speed slider
        folder.add(settings, 'rotationSpeed', 0.1, 2.0, 0.1)
            .name('Rotation Speed')
            .onChange((value) => {
                this.appController.setRotationSpeed(value);
            });
        
        folder.open();
    }
    
    /**
     * Create Orbital Selection controls
     * @param {Array<Orbital>} orbitals
     */
    createOrbitalControls(orbitals) {
        // Remove existing orbital folder if it exists
        if (this.folders.orbitals) {
            this.folders.orbitals.destroy();
            this.folders.orbitals = null;
        }
        
        const folder = this.gui.addFolder('Orbital Selection');
        this.folders.orbitals = folder;
        this.orbitalControls.clear();
        
        // Show All checkbox (unchecked by default)
        const showAllState = { showAll: false };
        folder.add(showAllState, 'showAll')
            .name('Show All')
            .onChange((value) => {
                orbitals.forEach(orbital => {
                    orbital.visible = value;
                    const controller = this.orbitalControls.get(orbital.getId());
                    if (controller) {
                        controller.setValue(value);
                    }
                });
                this.appController.updateVisualization();
            });
        
        // Group orbitals by designation (1s, 2s, 2p, etc.)
        const orbitalGroups = new Map();
        orbitals.forEach(orbital => {
            const designation = orbital.getDesignation();
            if (!orbitalGroups.has(designation)) {
                orbitalGroups.set(designation, []);
            }
            orbitalGroups.get(designation).push(orbital);
        });
        
        // Create controls for each orbital group
        orbitalGroups.forEach((group, designation) => {
            const orbitalType = group[0].getType();
            
            // Sort by m value for consistent ordering
            group.sort((a, b) => a.m - b.m);
            
            // Check if any orbital in this group is visible
            const hasVisibleOrbital = group.some(orbital => orbital.visible);
            
            // Create a collapsible folder for this shell (e.g., "1s", "2p", "3d")
            const shellFolder = folder.addFolder(designation);
            
            // Add individual orbital controls inside the shell folder
            group.forEach(orbital => {
                const mLabel = this.getMLabel(orbital.l, orbital.m);
                
                // Visibility checkbox
                const state = { visible: orbital.visible };
                const controller = shellFolder.add(state, 'visible')
                    .name(mLabel ? `${mLabel}` : 'Show')
                    .onChange((value) => {
                        orbital.visible = value;
                        this.appController.updateVisualization();
                    });
                
                this.orbitalControls.set(orbital.getId(), controller);
                
                // Create a collapsible subfolder for color picker
                const colorFolder = shellFolder.addFolder(mLabel ? `  └ ${mLabel} Color` : '  └ Color');
                
                // Color picker inside the subfolder
                const colorState = {
                    color: orbital.color ? this.rgbToHex(orbital.color) : this.rgbToHex(CONSTANTS.ORBITAL_COLORS[orbitalType])
                };
                colorFolder.addColor(colorState, 'color')
                    .name('Color')
                    .onChange((value) => {
                        orbital.color = this.hexToRgb(value);
                        this.appController.updateVisualization();
                    });
                
                // Close the color folder by default
                colorFolder.close();
            });
            
            // If any orbital in this shell is visible, expand the shell folder
            if (hasVisibleOrbital) {
                shellFolder.open();
            } else {
                shellFolder.close();
            }
        });
        
        folder.open();
    }
    
    /**
     * Get label for m quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     * @returns {string} Label for the orbital
     */
    getMLabel(l, m) {
        // For p orbitals (l=1)
        // Standard mapping for real spherical harmonics:
        // m = 0: pz (aligned with z-axis)
        // m = ±1: px and py (perpendicular to z-axis)
        if (l === 1) {
            if (m === -1) return ' (py)';
            if (m === 0) return ' (pz)';
            if (m === 1) return ' (px)';
        }
        // For d orbitals (l=2)
        else if (l === 2) {
            if (m === -2) return ' (dxy)';
            if (m === -1) return ' (dxz)';
            if (m === 0) return ' (dz²)';
            if (m === 1) return ' (dyz)';
            if (m === 2) return ' (dx²-y²)';
        }
        // For f orbitals (l=3)
        else if (l === 3) {
            // Simplified f orbital labels
            return ` (m=${m})`;
        }
        
        return ` (m=${m})`;
    }
    
    /**
     * Convert RGB object to hex color string
     * @param {Object} rgb - {r, g, b} with values 0-1
     * @returns {string} Hex color string
     */
    rgbToHex(rgb) {
        const r = Math.round(rgb.r * 255);
        const g = Math.round(rgb.g * 255);
        const b = Math.round(rgb.b * 255);
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    /**
     * Convert hex color string to RGB object
     * @param {string} hex - Hex color string
     * @returns {Object} {r, g, b} with values 0-1
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 1, g: 1, b: 1 };
    }
    
    /**
     * Update element information display
     * @param {number} atomicNumber
     */
    updateElementInfo(atomicNumber) {
        const config = new ElectronConfiguration(atomicNumber);
        config.build();
        
        const info = `${config.elementSymbol} - ${config.elementName}`;
        const configString = config.getConfigurationString();
        
        if (this.elementController) {
            this.elementController.object.element = info;
        }
        
        if (this.configController) {
            this.configController.object.configuration = configString;
        }
    }
    
    /**
     * Update particle size for all orbitals
     * @param {number} size
     */
    updateParticleSize(size) {
        const renderer = this.appController.renderer;
        renderer.orbitals.forEach(particleSystem => {
            particleSystem.material.size = size;
        });
    }
    
    /**
     * Update particle opacity for all orbitals
     * @param {number} opacity
     */
    updateParticleOpacity(opacity) {
        const renderer = this.appController.renderer;
        renderer.orbitals.forEach(particleSystem => {
            particleSystem.material.opacity = opacity;
        });
    }
    
    /**
     * Create Credits section
     */
    createCredits() {
        const folder = this.gui.addFolder('About');
        this.folders.credits = folder;
        
        // Credit information (read-only)
        const creditInfo = { 
            creator: 'Andy Kong',
            version: 'v1.0'
        };
        
        folder.add(creditInfo, 'creator')
            .name('Created by')
            .listen()
            .disable();
        
        folder.add(creditInfo, 'version')
            .name('Version')
            .listen()
            .disable();
        
        folder.close();
    }
    
    /**
     * Destroy GUI
     */
    destroy() {
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
        }
    }
}


// Make class available globally
window.GUIController = GUIController;
