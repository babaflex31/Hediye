// Format of SharedAudioState:
// 0: Energy (RMS)
// 1: Spectral Centroid
// 2: Scene State Enum (0: Calm, 1: Groove, 2: Aggressive, 3: Celebratory, 4: Emotional)
// 3: Beat Impulse (1 if beat hit just now, decays quickly)
// 4: Playback Progress (0.0 to 1.0)

export const SCENE_STATES = {
    CALM: 0,
    GROOVE: 1,
    AGGRESSIVE: 2,
    CELEBRATORY: 3,
    EMOTIONAL: 4
};

export class DecisionEngine {
    constructor(sharedAudioState) {
        this.audioState = sharedAudioState;
        console.log("Decision Engine initialized");

        // Smooth targets for camera and scene
        this.targetFOV = 75;
        this.currentFOV = 75;

        // Add logic state
        this.lastBeatTime = 0;
    }

    update(delta) {
        // 1. Read from SharedArrayBuffer (zero overhead, real-time)
        // AudioWorker will write these as Uint32 representations of floats or ints.
        // For simplicity right now, we simulated ints in the SAB.
        const rawEnergy = Atomics.load(this.audioState, 0);
        const isBeat = Atomics.load(this.audioState, 3);
        const sceneIdx = Atomics.load(this.audioState, 2);

        const energy = rawEnergy / 100.0;

        // 2. Logic graph based on Energy & Scene State
        if (energy > 0.8) {
            if (sceneIdx !== SCENE_STATES.AGGRESSIVE) Atomics.store(this.audioState, 2, SCENE_STATES.AGGRESSIVE);
            this.targetFOV = 100; // Widen camera on high energy
        } else if (energy > 0.4) {
            if (sceneIdx !== SCENE_STATES.GROOVE) Atomics.store(this.audioState, 2, SCENE_STATES.GROOVE);
            this.targetFOV = 80;
        } else {
            if (sceneIdx !== SCENE_STATES.CALM) Atomics.store(this.audioState, 2, SCENE_STATES.CALM);
            this.targetFOV = 60; // Zoom in slightly for calm
        }

        // 3. Apply smoothing for visual properties
        this.currentFOV += (this.targetFOV - this.currentFOV) * 2.5 * delta;
    }

    getFOV() {
        return this.currentFOV;
    }

    getEnergy() {
        return Atomics.load(this.audioState, 0) / 100.0;
    }

    getBeatImpulse() {
        return Atomics.load(this.audioState, 3) / 100.0;
    }
}
