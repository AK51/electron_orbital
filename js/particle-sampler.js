/**
 * Particle Sampler
 * Generates particle positions using CDF sampling of quantum probability distributions
 * Based on the approach from https://github.com/kavan010/Atoms
 */

class ParticleSampler {
    constructor(quantumEngine) {
        this.quantumEngine = quantumEngine;
    }
    
    /**
     * Convert spherical coordinates to Cartesian
     * @param {number} r - Radius
     * @param {number} theta - Polar angle (0 to π)
     * @param {number} phi - Azimuthal angle (0 to 2π)
     * @returns {{x: number, y: number, z: number}}
     */
    sphericalToCartesian(r, theta, phi) {
        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);
        return { x, y, z };
    }
    
    /**
     * Sample radius using CDF (Cumulative Distribution Function) sampling
     * This is more efficient and accurate than rejection sampling
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} resolution - Number of samples for CDF (default 1000)
     * @returns {number} Sampled radius
     */
    sampleRadius(n, l, resolution = 1000) {
        // Maximum radius to sample (most probability within ~3n² Bohr radii)
        const maxR = 3 * n * n * CONSTANTS.BOHR_RADIUS;
        
        // Minimum radius to avoid singularities at origin
        const minR = 0.01 * CONSTANTS.BOHR_RADIUS;
        
        // Build CDF array
        const cdf = [];
        let sum = 0;
        
        for (let i = 0; i < resolution; i++) {
            // Start from minR instead of 0 to avoid origin
            const r = minR + (i / resolution) * (maxR - minR);
            
            // Radial probability: P(r) = r² |R(n,l,r)|²
            const R = this.quantumEngine.radialWaveFunction(n, l, r);
            const prob = r * r * R * R;
            
            sum += prob;
            cdf.push(sum);
        }
        
        // Check if sum is valid
        if (sum === 0 || !isFinite(sum)) {
            console.warn(`Invalid CDF sum for radius sampling: ${sum}`);
            return maxR / 2;
        }
        
        // Normalize CDF
        for (let i = 0; i < cdf.length; i++) {
            cdf[i] /= sum;
        }
        
        // Sample from CDF
        const rand = Math.random();
        for (let i = 0; i < cdf.length; i++) {
            if (rand <= cdf[i]) {
                return minR + (i / resolution) * (maxR - minR);
            }
        }
        
        return maxR;
    }
    
    /**
     * Sample theta (polar angle) using CDF sampling
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     * @param {number} resolution - Number of samples for CDF (default 500)
     * @returns {number} Sampled theta
     */
    sampleTheta(l, m, resolution = 500) {
        // Build CDF array for theta
        const cdf = [];
        let sum = 0;
        
        // Small epsilon to avoid exact 0 and PI
        const epsilon = 0.001;
        
        for (let i = 0; i < resolution; i++) {
            // Map to range [epsilon, PI - epsilon] to avoid poles
            const theta = epsilon + (i / resolution) * (CONSTANTS.PI - 2 * epsilon);
            
            // For theta distribution, we need to integrate over phi
            // |Y(l,m,θ,φ)|² integrated over φ gives us the theta-only distribution
            // For real spherical harmonics, the phi integral gives a constant factor
            const absM = Math.abs(m);
            const legendre = window.legendrePolynomial(l, absM, Math.cos(theta));
            const prob = legendre * legendre * Math.sin(theta); // sin(theta) is the Jacobian
            
            sum += prob;
            cdf.push(sum);
        }
        
        // Check if sum is valid
        if (sum === 0 || !isFinite(sum)) {
            console.warn(`Invalid CDF sum for theta sampling: ${sum}`);
            return CONSTANTS.PI / 2; // Return equator
        }
        
        // Normalize CDF
        for (let i = 0; i < cdf.length; i++) {
            cdf[i] /= sum;
        }
        
        // Sample from CDF
        const rand = Math.random();
        for (let i = 0; i < cdf.length; i++) {
            if (rand <= cdf[i]) {
                return epsilon + (i / resolution) * (CONSTANTS.PI - 2 * epsilon);
            }
        }
        
        return CONSTANTS.PI / 2;
    }
    
    /**
     * Sample phi (azimuthal angle) using CDF sampling
     * For orbitals with m != 0, phi distribution depends on cos²(m*phi) or sin²(m*phi)
     * @param {number} m - Magnetic quantum number
     * @param {number} resolution - Number of samples for CDF (default 500)
     * @returns {number} Sampled phi
     */
    samplePhi(m, resolution = 500) {
        // For m = 0, phi is uniformly distributed
        if (m === 0) {
            return Math.random() * CONSTANTS.TWO_PI;
        }
        
        // For m != 0, we need to sample according to the phi distribution
        // Real spherical harmonics:
        // m > 0: proportional to cos²(m*phi)
        // m < 0: proportional to sin²(|m|*phi)
        
        const cdf = [];
        let sum = 0;
        const absM = Math.abs(m);
        
        for (let i = 0; i < resolution; i++) {
            const phi = (i / resolution) * CONSTANTS.TWO_PI;
            
            let prob;
            if (m > 0) {
                // cos²(m*phi) distribution
                const val = Math.cos(m * phi);
                prob = val * val;
            } else {
                // sin²(|m|*phi) distribution
                const val = Math.sin(absM * phi);
                prob = val * val;
            }
            
            sum += prob;
            cdf.push(sum);
        }
        
        // Check if sum is valid
        if (sum === 0 || !isFinite(sum)) {
            console.warn(`Invalid CDF sum for phi sampling: ${sum}`);
            return Math.random() * CONSTANTS.TWO_PI;
        }
        
        // Normalize CDF
        for (let i = 0; i < cdf.length; i++) {
            cdf[i] /= sum;
        }
        
        // Sample from CDF
        const rand = Math.random();
        for (let i = 0; i < cdf.length; i++) {
            if (rand <= cdf[i]) {
                return (i / resolution) * CONSTANTS.TWO_PI;
            }
        }
        
        return CONSTANTS.TWO_PI / 2;
    }
    
    /**
     * Generate particle positions for an orbital using CDF sampling
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     * @param {number} particleCount - Number of particles to generate
     * @returns {Array<{position: {x, y, z}, probability: number}>}
     */
    generateOrbitalParticles(n, l, m, particleCount) {
        validateQuantumNumbers(n, l, m);
        
        const particles = [];
        const count = Math.max(CONSTANTS.MIN_PARTICLE_COUNT, 
                              Math.min(particleCount, CONSTANTS.MAX_PARTICLE_COUNT));
        
        console.log(`Generating ${count} particles for orbital (${n},${l},${m})`);
        
        // Pre-calculate some particles to find max probability for normalization
        const sampleSize = Math.min(100, count);
        let maxProb = 0;
        
        for (let i = 0; i < sampleSize; i++) {
            const r = this.sampleRadius(n, l);
            const theta = this.sampleTheta(l, m);
            const phi = this.samplePhi(m);
            const prob = this.quantumEngine.probabilityDensity(n, l, m, r, theta, phi);
            if (prob > maxProb) maxProb = prob;
        }
        
        // Generate all particles
        for (let i = 0; i < count; i++) {
            // Sample spherical coordinates using CDF
            const r = this.sampleRadius(n, l);
            const theta = this.sampleTheta(l, m);
            const phi = this.samplePhi(m);
            
            // Convert to Cartesian coordinates with scaling
            const cartesian = this.sphericalToCartesian(
                r * CONSTANTS.SCALE_FACTOR,
                theta,
                phi
            );
            
            // Calculate probability density for color coding
            const probability = this.quantumEngine.probabilityDensity(n, l, m, r, theta, phi);
            
            particles.push({
                position: cartesian,
                probability: maxProb > 0 ? probability / maxProb : 0
            });
        }
        
        console.log(`Generated ${particles.length} particles successfully`);
        
        return particles;
    }
}

// Make class available globally
window.ParticleSampler = ParticleSampler;
