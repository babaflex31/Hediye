import * as THREE from 'three';

export class Entity18 {
    constructor(scene) {
        this.scene = scene;

        // Golden shader-like material
        const material = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x442200,
            emissiveIntensity: 0.5
        });

        // Manually create the "1" shape
        const shape1 = new THREE.Shape();
        shape1.moveTo(0, 0);
        shape1.lineTo(1, 0);
        shape1.lineTo(1, 5);
        shape1.lineTo(0.5, 5);
        shape1.lineTo(-0.5, 4);
        shape1.lineTo(0, 4);
        shape1.lineTo(0, 0);

        // Manually create the "8" shape using arcs for smooth curves
        const shape8 = new THREE.Shape();
        shape8.absarc(4, 3.5, 1.5, 0, Math.PI * 2, false);

        const hole1 = new THREE.Path();
        hole1.absarc(4, 3.5, 0.7, 0, Math.PI * 2, true);
        shape8.holes.push(hole1);

        const shape8Bottom = new THREE.Shape();
        shape8Bottom.absarc(4, 1, 1.8, 0, Math.PI * 2, false);

        const hole2 = new THREE.Path();
        hole2.absarc(4, 1, 0.8, 0, Math.PI * 2, true);
        shape8Bottom.holes.push(hole2);

        const extrudeSettings = {
            depth: 0.5,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 2,
            bevelSize: 0.15,
            bevelThickness: 0.15
        };

        const geo1 = new THREE.ExtrudeGeometry(shape1, extrudeSettings);
        const geo8Top = new THREE.ExtrudeGeometry(shape8, extrudeSettings);
        const geo8Bot = new THREE.ExtrudeGeometry(shape8Bottom, extrudeSettings);

        const mesh1 = new THREE.Mesh(geo1, material);
        const mesh8Top = new THREE.Mesh(geo8Top, material);
        const mesh8Bot = new THREE.Mesh(geo8Bot, material);

        this.group = new THREE.Group();
        this.group.add(mesh1);
        this.group.add(mesh8Top);
        this.group.add(mesh8Bot);

        // Center it
        this.group.position.set(-2, -2.5, -2);

        this.scene.add(this.group);

        this.material = material;
    }

    update(delta, energy, time) {
        // Breathing based on energy
        const targetScale = 1 + (energy * 0.3);
        this.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Dynamic Rotation
        this.group.rotation.y = Math.sin(time * 0.001) * 0.3;
        this.group.rotation.x = Math.cos(time * 0.0015) * 0.1;

        // Glowing pulse on beats
        this.material.emissiveIntensity = 0.5 + energy * 2.0;
    }
}
