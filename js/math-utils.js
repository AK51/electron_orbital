/**
 * Mathematical utility functions for quantum mechanics calculations
 */

/**
 * Validates quantum numbers according to quantum mechanics rules
 * @param {number} n - Principal quantum number (n >= 1)
 * @param {number} l - Azimuthal quantum number (0 <= l < n)
 * @param {number} m - Magnetic quantum number (-l <= m <= l)
 * @throws {Error} If quantum numbers are invalid
 */
function validateQuantumNumbers(n, l, m) {
    if (n < 1 || !Number.isInteger(n)) {
        throw new Error(`Invalid principal quantum number: n=${n} must be a positive integer`);
    }
    if (l < 0 || l >= n || !Number.isInteger(l)) {
        throw new Error(`Invalid azimuthal quantum number: l=${l} must be in range [0, ${n-1}]`);
    }
    if (Math.abs(m) > l || !Number.isInteger(m)) {
        throw new Error(`Invalid magnetic quantum number: m=${m} must be in range [${-l}, ${l}]`);
    }
    return true;
}

/**
 * Safe division with fallback for numerical stability
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} fallback - Value to return if division fails
 * @returns {number}
 */
function safeDivide(numerator, denominator, fallback = 0) {
    if (denominator === 0 || !isFinite(denominator)) {
        console.warn('Division by zero or non-finite denominator');
        return fallback;
    }
    const result = numerator / denominator;
    return isFinite(result) ? result : fallback;
}

/**
 * Factorial function with memoization
 */
const factorialCache = {};
function factorial(n) {
    if (n < 0) return 0;
    if (n === 0 || n === 1) return 1;
    if (factorialCache[n]) return factorialCache[n];
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    factorialCache[n] = result;
    return result;
}

/**
 * Log factorial for numerical stability with large numbers
 * @param {number} n
 * @returns {number} ln(n!)
 */
function logFactorial(n) {
    if (n < 0) return -Infinity;
    if (n === 0 || n === 1) return 0;
    
    let result = 0;
    for (let i = 2; i <= n; i++) {
        result += Math.log(i);
    }
    return result;
}

/**
 * Associated Laguerre polynomial L_n^k(x)
 * Used in radial wave function calculation
 * @param {number} n - Degree
 * @param {number} k - Order
 * @param {number} x - Argument
 * @returns {number}
 */
function laguerrePolynomial(n, k, x) {
    if (n === 0) return 1;
    if (n === 1) return 1 + k - x;
    
    // Use recurrence relation for numerical stability
    let L_prev2 = 1;
    let L_prev1 = 1 + k - x;
    let L_current = 0;
    
    for (let i = 2; i <= n; i++) {
        L_current = ((2 * i - 1 + k - x) * L_prev1 - (i - 1 + k) * L_prev2) / i;
        L_prev2 = L_prev1;
        L_prev1 = L_current;
    }
    
    return L_current;
}

/**
 * Associated Legendre polynomial P_l^m(x)
 * Used in angular wave function calculation
 * @param {number} l - Degree
 * @param {number} m - Order
 * @param {number} x - Argument (typically cos(theta))
 * @returns {number}
 */
function legendrePolynomial(l, m, x) {
    const absM = Math.abs(m);
    
    if (absM > l) return 0;
    
    // Compute P_l^m using recurrence relations
    // Start with P_m^m
    let pmm = 1.0;
    if (absM > 0) {
        const somx2 = Math.sqrt((1 - x) * (1 + x));
        let fact = 1.0;
        for (let i = 1; i <= absM; i++) {
            pmm *= -fact * somx2;
            fact += 2.0;
        }
    }
    
    if (l === absM) {
        return pmm;
    }
    
    // Compute P_{m+1}^m
    let pmmp1 = x * (2 * absM + 1) * pmm;
    
    if (l === absM + 1) {
        return pmmp1;
    }
    
    // Compute P_l^m for l > m+1 using recurrence
    let pll = 0;
    for (let ll = absM + 2; ll <= l; ll++) {
        pll = (x * (2 * ll - 1) * pmmp1 - (ll + absM - 1) * pmm) / (ll - absM);
        pmm = pmmp1;
        pmmp1 = pll;
    }
    
    return pll;
}

/**
 * Spherical harmonic Y_l^m(theta, phi) - Real form
 * Uses real spherical harmonics for proper px, py, pz orbital shapes
 * @param {number} l - Azimuthal quantum number
 * @param {number} m - Magnetic quantum number
 * @param {number} theta - Polar angle (0 to π)
 * @param {number} phi - Azimuthal angle (0 to 2π)
 * @returns {number} Real spherical harmonic value
 */
function sphericalHarmonic(l, m, theta, phi) {
    const absM = Math.abs(m);
    
    // Normalization constant
    const norm = Math.sqrt(
        ((2 * l + 1) * factorial(l - absM)) / 
        (4 * CONSTANTS.PI * factorial(l + absM))
    );
    
    // Associated Legendre polynomial
    const legendre = legendrePolynomial(l, absM, Math.cos(theta));
    
    // Real spherical harmonics:
    // For m = 0: no phi dependence (pz orbital)
    // For m > 0: use sqrt(2)*cos(m*phi) (px orbital for m=1)
    // For m < 0: use sqrt(2)*sin(|m|*phi) (py orbital for m=-1)
    let angular;
    if (m === 0) {
        angular = 1;
    } else if (m > 0) {
        angular = Math.sqrt(2) * Math.cos(m * phi);
    } else {
        // For negative m, use sin with absolute value
        angular = Math.sqrt(2) * Math.sin(absM * phi);
    }
    
    return norm * legendre * angular;
}

/**
 * Spherical harmonic squared (for probability density)
 * This is used in CDF sampling where we need positive values
 * @param {number} l - Azimuthal quantum number
 * @param {number} m - Magnetic quantum number
 * @param {number} theta - Polar angle (0 to π)
 * @param {number} phi - Azimuthal angle (0 to 2π)
 * @returns {number} |Y_l^m|^2
 */
function sphericalHarmonicSquared(l, m, theta, phi) {
    const Y = sphericalHarmonic(l, m, theta, phi);
    return Y * Y;
}


// Make functions available globally
window.validateQuantumNumbers = validateQuantumNumbers;
window.safeDivide = safeDivide;
window.factorial = factorial;
window.logFactorial = logFactorial;
window.legendrePolynomial = legendrePolynomial;
window.sphericalHarmonic = sphericalHarmonic;
window.sphericalHarmonicSquared = sphericalHarmonicSquared;
