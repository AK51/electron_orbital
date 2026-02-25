/**
 * Physical and mathematical constants for electron cloud visualization
 */
const CONSTANTS = {
    // Physical constants
    BOHR_RADIUS: 0.529,           // Angstroms
    SCALE_FACTOR: 2.0,            // Visual scaling for display
    
    // Particle rendering
    DEFAULT_PARTICLE_COUNT: 100000, // Per subshell (increased for better visualization)
    MIN_PARTICLE_COUNT: 5000,
    MAX_PARTICLE_COUNT: 1000000,
    MAX_TOTAL_PARTICLES: 2000000,
    PARTICLE_SIZE: 0.05,
    PARTICLE_OPACITY: 1.0,
    PARTICLE_ANIMATION_SPEED: 1.0, // Animation speed multiplier
    
    // Performance
    TARGET_FPS: 30,
    MIN_FPS: 20,
    
    // Quantum number limits
    MAX_N: 7,                     // Maximum principal quantum number to display
    MAX_ATOMIC_NUMBER: 118,
    
    // Color schemes for orbital types
    ORBITAL_COLORS: {
        s: { r: 0.2, g: 0.5, b: 1.0 },   // Blue
        p: { r: 0.2, g: 0.8, b: 0.2 },   // Green
        d: { r: 1.0, g: 0.3, b: 0.3 },   // Red
        f: { r: 1.0, g: 1.0, b: 0.2 }    // Yellow
    },
    
    // Mathematical constants
    PI: Math.PI,
    TWO_PI: 2 * Math.PI,
    SQRT_PI: Math.sqrt(Math.PI),
    
    // Numerical tolerance
    EPSILON: 1e-10
};
