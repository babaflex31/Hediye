import * as THREE from 'three';

export class ParticleEngine {
    constructor(scene) {
        this.scene = scene;

        // Max particles to render
        this.particleCount = 5000;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);

        // Extra attributes for physics
        this.velocities = [];
        this.lifetimes = [];
        this.phases = [];

        // Initialize particles in a wide sphere
        for (let i = 0; i < this.particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 2 + Math.random() * 20;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Velocity components
            this.velocities.push({
                x: (Math.random() - 0.5) * 0.1,
                y: (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1
            });

            this.lifetimes.push(Math.random());
            this.phases.push(Math.random() * Math.PI * 2);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create a custom shader material for the particles
        this.material = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(geometry, this.material);
        this.scene.add(this.particleSystem);
    }

    update(delta, energy, time) {
        const positions = this.particleSystem.geometry.attributes.position.array;

        // Apply physical forces
        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 3;

            const vx = this.velocities[i].x;
            const vy = this.velocities[i].y;
            const vz = this.velocities[i].z;

            // Base movement
            positions[idx] += vx * delta * 60;
            positions[idx + 1] += vy * delta * 60;
            positions[idx + 2] += vz * delta * 60;

            // Energy injection (explosion effect outward from center)
            if (energy > 0.6) {
                const dist = Math.sqrt(
                    Math.pow(positions[idx], 2) +
                    Math.pow(positions[idx + 1], 2) +
                    Math.pow(positions[idx + 2], 2)
                );

                if (dist > 0.1) {
                    const force = (energy * 0.2) / dist;
                    positions[idx] += (positions[idx] / dist) * force;
                    positions[idx + 1] += (positions[idx + 1] / dist) * force;
                    positions[idx + 2] += (positions[idx + 2] / dist) * force;
                }
            }

            // Swirl effect based on time
            const angle = this.phases[i] + time * 0.001;
            positions[idx] += Math.sin(angle) * 0.01;
            positions[idx + 2] += Math.cos(angle) * 0.01;

            // Reset bounds
            if (Math.abs(positions[idx]) > 30 || Math.abs(positions[idx + 1]) > 30 || Math.abs(positions[idx + 2]) > 30) {
                positions[idx] = (Math.random() - 0.5) * 10;
                positions[idx + 1] = (Math.random() - 0.5) * 10;
                positions[idx + 2] = (Math.random() - 0.5) * 10;
            }
        }

        this.particleSystem.geometry.attributes.position.needsUpdate = true;

        // Dynamic color shifting based on energy
        this.material.color.setHSL(energy, 1.0, 0.6);
        this.material.size = 0.05 + energy * 0.2;

        // Global particle rotation
        this.particleSystem.rotation.y = time * 0.0005;
    }
}
