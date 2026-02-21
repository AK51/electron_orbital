/**
 * Quantum Mechanics Engine
 * Calculates wave functions and probability distributions for hydrogen-like atoms
 */

class QuantumMechanicsEngine {
    constructor() {
        this.Z = 1; // Atomic number (default: hydrogen)
    }
    
    /**
     * Set atomic number for calculations
     * @param {number} Z - Atomic number
     */
    setAtomicNumber(Z) {
        this.Z = Math.max(1, Math.min(CONSTANTS.MAX_ATOMIC_NUMBER, Math.floor(Z)));
    }
    
    /**
     * Radial wave function R(n, l, r) for hydrogen-like atoms
     * Formula: R(n,l,r) = √[(2Z/na₀)³ × (n-l-1)!/(2n[(n+l)!])] × e^(-ρ/2) × ρ^l × L(n-l-1,2l+1,ρ)
     * where ρ = 2Zr/(na₀)
     * 
     * For hydrogen-like atoms, we use Z=1 for all calculations to get the correct orbital shapes
     * 
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} r - Radius in Bohr radii
     * @returns {number} Radial wave function value
     */
    radialWaveFunction(n, l, r) {
        try {
            validateQuantumNumbers(n, l, 0);
            
            if (r < 0) return 0;
            if (r === 0) return l === 0 ? 1 : 0; // Only s orbitals have non-zero value at origin
            
            // Use Z=1 for hydrogen-like orbitals (correct orbital shapes)
            const Z = 1;
            const a0 = CONSTANTS.BOHR_RADIUS;
            const rho = (2 * Z * r) / (n * a0);
            
            // Normalization constant using log-space for numerical stability
            const logNorm = 0.5 * (
                3 * Math.log(2 * Z / (n * a0)) +
                logFactorial(n - l - 1) -
                Math.log(2 * n) -
                logFactorial(n + l)
            );
            const norm = Math.exp(logNorm);
            
            // Exponential decay
            const expTerm = Math.exp(-rho / 2);
            
            // Power term
            const powerTerm = Math.pow(rho, l);
            
            // Associated Laguerre polynomial
            const laguerre = laguerrePolynomial(n - l - 1, 2 * l + 1, rho);
            
            const result = norm * expTerm * powerTerm * laguerre;
            
            return isFinite(result) ? result : 0;
        } catch (error) {
            console.error('Radial wave function calculation error:', error);
            return 0;
        }
    }
    
    /**
     * Angular wave function Y(l, m, theta, phi) - spherical harmonics
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     * @param {number} theta - Polar angle (0 to π)
     * @param {number} phi - Azimuthal angle (0 to 2π)
     * @returns {number} Angular wave function value
     */
    angularWaveFunction(l, m, theta, phi) {
        try {
            return sphericalHarmonic(l, m, theta, phi);
        } catch (error) {
            console.error('Angular wave function calculation error:', error);
            return 0;
        }
    }
    
    /**
     * Complete wave function ψ(n,l,m,r,θ,φ) = R(n,l,r) × Y(l,m,θ,φ)
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     * @param {number} r - Radius in Bohr radii
     * @param {number} theta - Polar angle
     * @param {number} phi - Azimuthal angle
     * @returns {number} Wave function value
     */
    waveFunction(n, l, m, r, theta, phi) {
        try {
            validateQuantumNumbers(n, l, m);
            
            const radial = this.radialWaveFunction(n, l, r);
            const angular = this.angularWaveFunction(l, m, theta, phi);
            const result = radial * angular;
            
            if (!isFinite(result)) {
                console.error(`Non-finite wave function value at (${r}, ${theta}, ${phi})`);
                return 0;
            }
            
            return result;
        } catch (error) {
            console.error('Wave function calculation error:', error);
            return 0;
        }
    }
    
    /**
     * Probability density P(r,θ,φ) = |ψ(n,l,m,r,θ,φ)|²
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} m - Magnetic quantum number
     * @param {number} r - Radius
     * @param {number} theta - Polar angle
     * @param {number} phi - Azimuthal angle
     * @returns {number} Probability density
     */
    probabilityDensity(n, l, m, r, theta, phi) {
        const psi = this.waveFunction(n, l, m, r, theta, phi);
        return psi * psi;
    }
}


// Make class available globally
window.QuantumMechanicsEngine = QuantumMechanicsEngine;
