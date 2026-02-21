/**
 * Three.js Setup and Export
 * Makes Three.js and OrbitControls available globally
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Make THREE available globally
window.THREE = THREE;
window.OrbitControls = OrbitControls;

console.log('Three.js loaded:', THREE.REVISION);
