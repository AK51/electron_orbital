/**
 * Electron Configuration System
 * Manages electron orbitals and configurations for atoms
 */

/**
 * Represents a single electron orbital
 */
class Orbital {
    constructor(n, l, m) {
            this.n = n;              // Principal quantum number
            this.l = l;              // Azimuthal quantum number
            this.m = m;              // Magnetic quantum number
            this.electrons = 0;      // Number of electrons in this orbital
            this.visible = true;     // Whether to display this orbital
            this.particles = [];     // Array of particle positions
            this.particleSystem = null; // Three.js Points object
            this.color = null;       // Custom color for this orbital (null = use default type color)
        }

    
    /**
     * Get orbital designation (e.g., "1s", "2p", "3d")
     * @returns {string}
     */
    getDesignation() {
        const subshells = ['s', 'p', 'd', 'f', 'g', 'h', 'i'];
        return `${this.n}${subshells[this.l]}`;
    }
    
    /**
     * Get orbital type
     * @returns {string}
     */
    getType() {
        const types = ['s', 'p', 'd', 'f', 'g', 'h', 'i'];
        return types[this.l];
    }
    
    /**
     * Get unique identifier
     * @returns {string}
     */
    getId() {
        return `${this.n}_${this.l}_${this.m}`;
    }
}

/**
 * Represents the complete electron configuration for an atom
 */
class ElectronConfiguration {
    constructor(atomicNumber) {
        this.atomicNumber = Math.max(1, Math.min(CONSTANTS.MAX_ATOMIC_NUMBER, atomicNumber));
        this.orbitals = [];
        this.elementSymbol = this.getElementSymbol(this.atomicNumber);
        this.elementName = this.getElementName(this.atomicNumber);
    }
    
    /**
     * Build electron configuration using Aufbau principle
     * Fills orbitals in order of increasing energy
     */
    build() {
        this.orbitals = [];
        
        console.log(`Building configuration for ${this.elementSymbol} (Z=${this.atomicNumber})`);
        
        // Aufbau principle ordering: (n+l, n)
        // Generate all orbitals up to a reasonable limit
        const orbitalOrder = [];
        for (let n = 1; n <= CONSTANTS.MAX_N; n++) {
            for (let l = 0; l < n && l <= 3; l++) { // Limit to f orbitals
                for (let m = -l; m <= l; m++) {
                    orbitalOrder.push({ n, l, m, energy: n + l });
                }
            }
        }
        
        console.log(`Generated ${orbitalOrder.length} total orbitals`);
        
        // Sort by energy (n+l), then by n
        orbitalOrder.sort((a, b) => {
            if (a.energy !== b.energy) return a.energy - b.energy;
            return a.n - b.n;
        });
        
        let remainingElectrons = this.atomicNumber;
        
        // Group orbitals by subshell (n, l) for Hund's rule
        const subshells = new Map();
        for (const { n, l, m, energy } of orbitalOrder) {
            const key = `${n}_${l}`;
            if (!subshells.has(key)) {
                subshells.set(key, { n, l, energy, orbitals: [] });
            }
            subshells.get(key).orbitals.push(m);
        }
        
        console.log(`Grouped into ${subshells.size} subshells`);
        
        // Fill orbitals following Hund's rule
        const subshellArray = Array.from(subshells.values());
        subshellArray.sort((a, b) => {
            if (a.energy !== b.energy) return a.energy - b.energy;
            return a.n - b.n;
        });
        
        // First pass: determine which subshells have electrons and find outer shell
        let maxN = 0;
        const filledSubshells = [];
        let tempRemainingElectrons = this.atomicNumber;
        
        for (const subshell of subshellArray) {
            if (tempRemainingElectrons <= 0) break;
            
            const { n, l, orbitals: mValues } = subshell;
            const numOrbitals = mValues.length;
            const maxElectronsInSubshell = numOrbitals * 2;
            const electronsInSubshell = Math.min(tempRemainingElectrons, maxElectronsInSubshell);
            
            if (electronsInSubshell > 0) {
                filledSubshells.push({ ...subshell, electronsInSubshell });
                if (n > maxN) {
                    maxN = n;
                }
            }
            
            tempRemainingElectrons -= electronsInSubshell;
        }
        
        console.log(`Outer shell (valence): n=${maxN}`);
        
        // Second pass: create orbitals with proper visibility
        for (const subshell of filledSubshells) {
            const { n, l, orbitals: mValues, electronsInSubshell } = subshell;
            const numOrbitals = mValues.length;
            
            console.log(`Processing subshell ${n}${['s','p','d','f'][l]}: ${numOrbitals} orbitals, ${electronsInSubshell} electrons`);
            console.log(`  m values:`, mValues);
            
            // Apply Hund's rule: fill orbitals singly first, then pair
            const electronsPerOrbital = new Array(numOrbitals).fill(0);
            
            // First pass: put one electron in each orbital (up to numOrbitals electrons)
            const singleElectrons = Math.min(electronsInSubshell, numOrbitals);
            for (let i = 0; i < singleElectrons; i++) {
                electronsPerOrbital[i] = 1;
            }
            
            // Second pass: pair up remaining electrons
            const remainingToPair = electronsInSubshell - singleElectrons;
            for (let i = 0; i < remainingToPair; i++) {
                electronsPerOrbital[i]++;
            }
            
            console.log(`  electrons per orbital:`, electronsPerOrbital);
            
            // Create orbital objects - CREATE ALL ORBITALS IN SUBSHELL, not just filled ones
            for (let i = 0; i < numOrbitals; i++) {
                const m = mValues[i];
                const orbital = new Orbital(n, l, m);
                orbital.electrons = electronsPerOrbital[i];
                
                // Only show outer shell (valence shell) by default for performance
                // Inner shells can be enabled manually by the user
                orbital.visible = (n === maxN);
                
                this.orbitals.push(orbital);
                console.log(`  Created orbital: ${orbital.getId()} with ${orbital.electrons} electrons, visible: ${orbital.visible}`);
            }
        }
        
        console.log(`Final configuration: ${this.orbitals.length} orbitals created`);
        console.log(`Outer shell: n=${maxN} (only outer shell visible by default for performance)`);
        console.log('Orbitals:', this.orbitals.map(o => `${o.getId()}(${o.electrons}e, ${o.visible ? 'visible' : 'hidden'})`).join(', '));
    }
    
    /**
     * Get element symbol from atomic number
     * @param {number} atomicNumber
     * @returns {string}
     */
    getElementSymbol(atomicNumber) {
        const elements = [
            'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
            'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
            'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
            'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr', 'Rb', 'Sr', 'Y', 'Zr',
            'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn',
            'Sb', 'Te', 'I', 'Xe', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
            'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb',
            'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg',
            'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
            'Pa', 'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm',
            'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds',
            'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'
        ];
        return elements[atomicNumber - 1] || 'Unknown';
    }
    
    /**
     * Get element name from atomic number
     * @param {number} atomicNumber
     * @returns {string}
     */
    getElementName(atomicNumber) {
        const names = [
            'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon',
            'Sodium', 'Magnesium', 'Aluminum', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium',
            'Scandium', 'Titanium', 'Vanadium', 'Chromium', 'Manganese', 'Iron', 'Cobalt', 'Nickel', 'Copper', 'Zinc',
            'Gallium', 'Germanium', 'Arsenic', 'Selenium', 'Bromine', 'Krypton', 'Rubidium', 'Strontium', 'Yttrium', 'Zirconium',
            'Niobium', 'Molybdenum', 'Technetium', 'Ruthenium', 'Rhodium', 'Palladium', 'Silver', 'Cadmium', 'Indium', 'Tin',
            'Antimony', 'Tellurium', 'Iodine', 'Xenon', 'Cesium', 'Barium', 'Lanthanum', 'Cerium', 'Praseodymium', 'Neodymium',
            'Promethium', 'Samarium', 'Europium', 'Gadolinium', 'Terbium', 'Dysprosium', 'Holmium', 'Erbium', 'Thulium', 'Ytterbium',
            'Lutetium', 'Hafnium', 'Tantalum', 'Tungsten', 'Rhenium', 'Osmium', 'Iridium', 'Platinum', 'Gold', 'Mercury',
            'Thallium', 'Lead', 'Bismuth', 'Polonium', 'Astatine', 'Radon', 'Francium', 'Radium', 'Actinium', 'Thorium',
            'Protactinium', 'Uranium', 'Neptunium', 'Plutonium', 'Americium', 'Curium', 'Berkelium', 'Californium', 'Einsteinium', 'Fermium',
            'Mendelevium', 'Nobelium', 'Lawrencium', 'Rutherfordium', 'Dubnium', 'Seaborgium', 'Bohrium', 'Hassium', 'Meitnerium', 'Darmstadtium',
            'Roentgenium', 'Copernicium', 'Nihonium', 'Flerovium', 'Moscovium', 'Livermorium', 'Tennessine', 'Oganesson'
        ];
        return names[atomicNumber - 1] || 'Unknown';
    }
    
    /**
     * Get electron configuration string (e.g., "1s² 2s² 2p²")
     * @returns {string}
     */
    getConfigurationString() {
        // Group orbitals by subshell (n, l)
        const subshells = new Map();
        
        this.orbitals.forEach(orbital => {
            const key = `${orbital.n}${orbital.getType()}`;
            if (!subshells.has(key)) {
                subshells.set(key, { n: orbital.n, l: orbital.l, electrons: 0 });
            }
            subshells.get(key).electrons += orbital.electrons;
        });
        
        // Sort by energy (n+l, then n)
        const sortedSubshells = Array.from(subshells.entries()).sort((a, b) => {
            const [, shellA] = a;
            const [, shellB] = b;
            const energyA = shellA.n + shellA.l;
            const energyB = shellB.n + shellB.l;
            if (energyA !== energyB) return energyA - energyB;
            return shellA.n - shellB.n;
        });
        
        // Build configuration string with line breaks
        // Group by principal quantum number (n) for better readability
        const configParts = sortedSubshells
            .filter(([, shell]) => shell.electrons > 0)
            .map(([key, shell]) => `${key}${this.toSuperscript(shell.electrons)}`);
        
        // Add line breaks after every 4 subshells or when n changes significantly
        let result = '';
        let currentN = 0;
        let count = 0;
        
        configParts.forEach((part, index) => {
            const n = parseInt(part.charAt(0));
            
            // Add line break if we've added 4 items or if n increased by 2 or more
            if (index > 0 && (count >= 4 || (n - currentN >= 2))) {
                result += '\n';
                count = 0;
            }
            
            result += (count > 0 ? ' ' : '') + part;
            currentN = n;
            count++;
        });
        
        return result;
    }
    
    /**
     * Convert number to superscript
     * @param {number} num
     * @returns {string}
     */
    toSuperscript(num) {
        const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
        return num.toString().split('').map(d => superscripts[parseInt(d)]).join('');
    }
    
    /**
     * Get total number of electrons
     * @returns {number}
     */
    getTotalElectrons() {
        return this.orbitals.reduce((sum, orbital) => sum + orbital.electrons, 0);
    }
    
    /**
     * Get orbitals grouped by shell (n value)
     * @returns {Object}
     */
    getOrbitalsByShell() {
        const shells = {};
        this.orbitals.forEach(orbital => {
            if (!shells[orbital.n]) {
                shells[orbital.n] = [];
            }
            shells[orbital.n].push(orbital);
        });
        return shells;
    }
}


// Make classes available globally
window.Orbital = Orbital;
window.ElectronConfiguration = ElectronConfiguration;
