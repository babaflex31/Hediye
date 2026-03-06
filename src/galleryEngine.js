import * as THREE from 'three';

export class GalleryEngine {
    constructor(scene, camera, decisionEngine) {
        this.scene = scene;
        this.camera = camera;
        this.decisionEngine = decisionEngine;

        this.photos = [];
        this.textures = [];
        this.textureLoader = new THREE.TextureLoader();
        this.photoGeometry = new THREE.PlaneGeometry(3, 4); // Standard portrait ratio

        // Load all 20 user photos
        const photoNames = [
            '1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.jpeg', '9.png',
            '10.png', '11.png', '12.png', '13.png', '14.png', '15.png', '16.png', '17.png', '18.png', '19.png', '20.png'
        ];
        this.loadAssets(photoNames);

        this.spawnTimer = 0;
        this.lastEnergy = 0;
    }

    loadAssets(filenames) {
        filenames.forEach(file => {
            this.textureLoader.load(`./assets/photos/${file}`, (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                this.textures.push(texture);
                console.log(`[Gallery Engine] Loaded ${file}`);
            });
        });
    }

    spawnPhoto() {
        if (this.textures.length === 0) return;

        // Pick a random texture
        const texIndex = Math.floor(Math.random() * this.textures.length);
        const material = new THREE.MeshBasicMaterial({
            map: this.textures[texIndex],
            transparent: true,
            opacity: 0
        });

        const mesh = new THREE.Mesh(this.photoGeometry, material);

        // Spawn position: somewhat random within the camera's view, slightly forward
        mesh.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 8,
            (Math.random() * -10) - 5 // Z: from -5 to -15
        );

        // Initial scale slightly popped
        mesh.scale.set(0.1, 0.1, 0.1);

        // Add physics/motion tracking data
        mesh.userData = {
            velocity: new THREE.Vector3(0, 0, 1.5 + Math.random()), // Moving towards camera
            targetOpacity: 1,
            life: 0,
            maxLife: 10 + Math.random() * 5
        };

        this.photos.push(mesh);
        this.scene.add(mesh);
    }

    update(delta) {
        const energy = this.decisionEngine.getEnergy();
        const isHighEnergy = energy > 0.6;

        // Beat Detection: Check if energy spiked suddenly
        if (energy - this.lastEnergy > 0.15) {
            if (this.photos.length < 15) { // Cap max photos on screen
                this.spawnPhoto();
                if (isHighEnergy) this.spawnPhoto(); // Double spawn on big beats
            }
        }

        // Regular steady spawn if empty
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0 && this.photos.length < 5) {
            this.spawnPhoto();
            this.spawnTimer = isHighEnergy ? 0.5 : 2.0; // Spawn faster on high energy
        }

        this.lastEnergy = energy;

        // Update Physics
        for (let i = this.photos.length - 1; i >= 0; i--) {
            const p = this.photos[i];
            p.userData.life += delta;

            // Motion
            p.position.addScaledVector(p.userData.velocity, delta * (1 + energy));

            // Floating wobble
            p.rotation.z = Math.sin(p.userData.life * 2) * 0.1;
            p.rotation.y = Math.cos(p.userData.life * 1.5) * 0.1;

            // Pop in effect
            if (p.userData.life < 0.5) {
                p.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
                p.material.opacity = p.userData.life * 2;
            }

            // Fade out and Kill
            if (p.userData.life > p.userData.maxLife || p.position.z > this.camera.position.z + 2) {
                p.material.opacity -= delta * 2;
                if (p.material.opacity <= 0 || p.position.z > this.camera.position.z + 2) {
                    this.scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                    this.photos.splice(i, 1);
                }
            }
        }
    }
}
