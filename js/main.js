/**
 * Main Application Entry Point
 * Initializes and starts the Electron Cloud Visualizer
 */

let appController = null;

/**
 * Display error message to user
 * @param {string} message
 */
function displayError(message) {
    const errorContainer = document.getElementById('error-container');
    const errorText = document.getElementById('error-text');
    
    if (errorContainer && errorText) {
        errorText.textContent = message;
        errorContainer.style.display = 'flex';
    }
    
    console.error('Application Error:', message);
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    const startTime = performance.now();
    
    console.log('Starting initialization...');
    
    try {
        // Get canvas element
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        console.log('Canvas found');
        
        // Show loading indicator if initialization takes > 500ms
        const loadingTimeout = setTimeout(() => {
            showLoadingOverlay();
        }, 500);
        
        console.log('Creating ApplicationController...');
        
        // Create and initialize application controller
        appController = new ApplicationController();
        
        console.log('Initializing application...');
        await appController.initialize(canvas);
        
        console.log('Application initialized successfully');
        
        // Clear loading timeout
        clearTimeout(loadingTimeout);
        
        // Hide loading overlay
        hideLoadingOverlay();
        
        const elapsed = performance.now() - startTime;
        console.log(`Application initialized in ${elapsed.toFixed(0)}ms`);
        
        // Log initial state
        console.log('Initial state:', appController.getState());
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        console.error('Error stack:', error.stack);
        hideLoadingOverlay();
        displayError(error.message || 'Failed to initialize application. Please refresh the page and try again.');
    }
}

/**
 * Handle window unload
 */
function handleUnload() {
    if (appController) {
        appController.dispose();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Clean up on page unload
window.addEventListener('beforeunload', handleUnload);

// Handle window visibility changes (pause/resume)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Application paused (tab hidden)');
    } else {
        console.log('Application resumed (tab visible)');
    }
});

// Expose app controller for debugging
window.electronCloudApp = {
    getController: () => appController,
    getState: () => appController ? appController.getState() : null,
    reset: () => appController ? appController.reset() : null
};

console.log('Electron Cloud Visualizer loaded. Access via window.electronCloudApp');
