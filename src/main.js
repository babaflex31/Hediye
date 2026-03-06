import * as THREE from 'three';
import { DecisionEngine } from './decisionEngine.js';
import { GalleryEngine } from './galleryEngine.js';
import { Entity18 } from './entity18.js';
import { ParticleEngine } from './particleEngine.js';
import confetti from 'canvas-confetti';

class Engine {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.introScreen = document.getElementById('intro-screen');
        this.audioInput = document.getElementById('audio-input');

        // Allocation of SharedArrayBuffer for Real-Time State
        // Format: [ energy, spectral_centroid, danceability, scene_state_enum, beat_impulse ... ]
        this.sharedAudioBuffer = new SharedArrayBuffer(20 * Int32Array.BYTES_PER_ELEMENT);
        this.sharedAudioState = new Int32Array(this.sharedAudioBuffer);

        this.decisionEngine = new DecisionEngine(this.sharedAudioState);

        this.audioContext = null;
        this.analyser = null;
        this.audioEl = new Audio();
        this.dataArray = null;

        // Scene 2 States
        this.scene2Active = false;
        this.scene2Timer = 0;

        this.initThree();
        this.bindEvents();
    }

    // We are bypassing the audioWorker for now as per user instruction to prioritize immediate playback
    // Once the Rust environment is established, we can offload analysis to the worker.
    initAudioWorker() {
        this.audioWorker = new Worker(new URL('./audioWorker.js', import.meta.url), { type: 'module' });
        this.audioWorker.postMessage({
            type: 'INIT',
            payload: { sharedBuffer: this.sharedAudioBuffer }
        });

        this.audioWorker.onmessage = (e) => {
            const { type, length } = e.data;
            if (type === 'READY') {
                console.log("Audio Worker is Ready");
            }
            if (type === 'DECODE_DONE') {
                console.log("Audio Processing Done, Total PCM samples:", length);
                this.beginPlayback();
            }
        };
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.z = 5;

        // Add lighting to illuminate 3D objects
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);

        this.galleryEngine = new GalleryEngine(this.scene, this.camera, this.decisionEngine);
        this.entity18 = new Entity18(this.scene);
        this.particleEngine = new ParticleEngine(this.scene);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    bindEvents() {
        let booted = false;

        // Trigger name cycling animation
        const names = ["Nuncayımız", "Tuncayımız", "Amcayımız", "Dersimcayımız"];
        let nameIdx = 0;
        const nameSpan = document.getElementById('name-changer');
        if (nameSpan) {
            setInterval(() => {
                nameSpan.style.opacity = '0';
                setTimeout(() => {
                    nameIdx = (nameIdx + 1) % names.length;
                    nameSpan.innerText = names[nameIdx];
                    nameSpan.style.opacity = '1';
                }, 400); // 400ms fade out
            }, 900); // Change name every 2.5 seconds
        }

        this.introScreen.addEventListener('click', async () => {
            if (booted) return;
            booted = true;

            this.introScreen.style.opacity = '0';
            this.introScreen.style.pointerEvents = 'none'; // Prevent any further interaction
            setTimeout(() => this.introScreen.style.display = 'none', 1000);

            await this.bootAudioContext();

            console.log("Loading default song...");
            this.audioEl.src = '/assets/audio/song.mp3';

            try {
                await this.audioEl.play();
                console.log("Engine Active");
            } catch (e) {
                console.error("Playback failed. Is the file /public/assets/audio/song.mp3 present?", e);
            }
        });
    }

    async bootAudioContext() {
        if (this.audioContext) return;

        console.log("AudioContext booting up... 🚀");
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const source = this.audioContext.createMediaElementSource(this.audioEl);
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Start render loop
        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    triggerScene2() {
        this.audioEl.pause(); // Stop song 1, but do NOT disconnect the analyser so song2 can play

        // 1. The Glitch Effect & Date Drop
        const glitchOverlay = document.getElementById('glitch-overlay');
        const dateGlitch = document.getElementById('date-glitch');
        const container = document.getElementById('canvas-container');
        const videoContainer = document.getElementById('video-container');
        const streamOverlay = document.getElementById('stream-overlay');
        const videoEl = document.getElementById('video-player');

        glitchOverlay.classList.add('glitch-anim');
        dateGlitch.style.display = 'block';

        // Glitch lasts 0.5s, then snap to black and start video + stream overlay
        setTimeout(() => {
            glitchOverlay.classList.remove('glitch-anim');
            dateGlitch.style.display = 'none';
            container.style.display = 'none'; // Completely kill 3D

            videoContainer.style.opacity = '1';
            videoContainer.style.pointerEvents = 'auto'; // allow interaction if needed
            streamOverlay.style.display = 'block'; // Show faux GUI
            videoEl.play().catch(e => console.error("Video play failed:", e));
        }, 500);

        // 2. Video Interlude -> The Final Party
        videoEl.onended = () => {
            // Glitch Effect at end of stream
            glitchOverlay.classList.add('glitch-anim');
            streamOverlay.style.display = 'none'; // Hide GUI instantly

            setTimeout(() => {
                videoContainer.style.opacity = '0';   // Hide video
                videoContainer.style.display = 'none';
                glitchOverlay.classList.remove('glitch-anim');

                // Show the finish photo
                const finishPhoto = document.getElementById('finish-photo');
                if (finishPhoto) {
                    finishPhoto.style.display = 'block';
                }

                // Wait 4 seconds viewing the photo, then move to finale
                setTimeout(() => {
                    if (finishPhoto) {
                        finishPhoto.style.display = 'none';
                    }

                    // 3. Trigger song2.mp3
                    this.audioEl.src = '/assets/audio/song2.mp3';
                    this.audioEl.play().catch(e => console.error("song2.mp3 play failed: ", e));

                    // 4. Confetti and Cinematic Text
                    const finaleDiv = document.createElement('div');
                    finaleDiv.id = 'finale-screen';
                    finaleDiv.innerHTML = `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                            <h1 id="bday-title" style="opacity: 0; color: #fca311; font-size: 4rem; text-shadow: 0 0 20px rgba(252, 163, 17, 0.5); transition: opacity 2s ease; margin-bottom: 20px; text-align: center;">YENİ YAŞIN KUTLU OLSUN TUNCAY</h1>
                            <p id="credits" style="opacity: 0; font-family: monospace; font-size: 1.5rem; color: #888; transition: opacity 2s ease; letter-spacing: 0.1em;">Developer : Babaflex</p>
                        </div>
                    `;
                    document.body.appendChild(finaleDiv);

                    setTimeout(() => {
                        finaleDiv.style.opacity = '1';
                        setTimeout(() => {
                            document.getElementById('bday-title').style.opacity = '1';

                            // Trigger confetti explosion from both sides infinitely
                            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

                            setInterval(function () {
                                const particleCount = 20; // Constant flow of confetti
                                // Left
                                confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2, y: Math.random() - 0.2 } });
                                // Right
                                confetti({ ...defaults, particleCount, origin: { x: 0.8 + Math.random() * 0.2, y: Math.random() - 0.2 } });
                            }, 250);

                            setTimeout(() => {
                                document.getElementById('credits').style.opacity = '1';
                            }, 2000);
                        }, 500);
                    }, 1000);
                }, 4000); // Wait 4 seconds viewing the photo, then move to finale
            }, 500); // Glitch duration 0.5s
        };
    }

    render(time) {
        const delta = 0.016; // fixed timestep approx

        if (this.scene2Active) {
            this.scene2Timer += delta;

            // Artificial decay of energy to zero
            Atomics.store(this.sharedAudioState, 0, 0);

            // Make the world cold and still over 5 seconds
            const lerpFactor = Math.min(this.scene2Timer / 5.0, 1.0);

            // Turn off 18 emission
            this.entity18.material.emissiveIntensity = THREE.MathUtils.lerp(this.entity18.material.emissiveIntensity, 0, lerpFactor * 0.1);
            this.entity18.material.color.lerp(new THREE.Color(0x222222), lerpFactor * 0.05); // turn it to ash

            // Stop particles
            for (let v of this.particleEngine.velocities) {
                v.x *= 0.95;
                v.y *= 0.95;
                v.z *= 0.95;
            }
            this.particleEngine.material.color.lerp(new THREE.Color(0x333333), lerpFactor * 0.05);
            this.particleEngine.material.size = THREE.MathUtils.lerp(this.particleEngine.material.size, 0.02, lerpFactor * 0.1);

            // Turn off scene background color completely to void black
            this.scene.background.lerp(new THREE.Color(0x000000), lerpFactor * 0.1);
        } else if (this.analyser) {
            this.analyser.getByteFrequencyData(this.dataArray);

            let sum = 0;
            let weightedSum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
                weightedSum += this.dataArray[i] * i;
            }

            const energy = (sum / this.dataArray.length) / 255.0; // 0 to 1
            const centroid = sum > 0 ? weightedSum / sum : 0;

            // Write simulated advanced logic to shared audio state
            Atomics.store(this.sharedAudioState, 0, Math.floor(energy * 100)); // index 0: energy
            // Atomics.store(this.sharedAudioState, 1, centroid);
        }

        this.decisionEngine.update(delta);
        this.galleryEngine.update(delta); // Run the gallery!

        const energy = this.decisionEngine.getEnergy();

        // Update the 18 entity and particles
        this.entity18.update(delta, energy, time);
        this.particleEngine.update(delta, energy, time);

        if (!this.scene2Active) {
            // Apply Decision Engine output to visual properties
            const currentFOV = this.decisionEngine.getFOV();
            this.camera.fov = currentFOV;
            this.camera.updateProjectionMatrix();

            // Adjust background intensity and color based on energy significantly more visible
            this.scene.background = new THREE.Color().setHSL((time * 0.0001) % 1, 0.8, 0.1 + (energy * 0.4));

            // Failsafe trigger: If the user hasn't explicitly cut the file, force Scene 2 at exactly 1:04 (64s)
            if (this.audioEl && this.audioEl.currentTime >= 64) {
                console.log("64-second mark reached. Transitioning to Scene 2 ✨");
                this.scene2Active = true;
                this.triggerScene2();
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.engine = new Engine();
});
