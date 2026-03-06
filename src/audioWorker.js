import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// We implement Essentia WASM locally or via npm.
// The SAB is passed from main thread.

let sharedAudioState;
let ffmpeg;
let audioContextReady = false;

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        sharedAudioState = new Float32Array(payload.sharedBuffer);
        console.log("[Worker] Initialized with SharedArrayBuffer");

        // Boot up FFmpeg.wasm
        ffmpeg = new FFmpeg();
        ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
        await ffmpeg.load({
            // Provide custom core options if needed
        });
        console.log("[Worker] FFmpeg loaded");

        // We would initialize Essentia WASM here as well
        self.postMessage({ type: 'READY' });
    }

    if (type === 'PROCESS_FILE') {
        const file = payload.file;
        await processAudioFile(file);
    }
};

async function processAudioFile(file) {
    // Use FFmpeg to decode and normalize
    const fileName = file.name;
    await ffmpeg.writeFile(fileName, await fetchFile(file));

    // Downmix to mono (-ac 1), float32 PCM (-f f32le), output rate 44100 (-ar 44100)
    // Also normalize loudness if needed, e.g., -af loudnorm, but for now just raw decode
    const outName = 'output.pcm';
    await ffmpeg.exec(['-i', fileName, '-ac', '1', '-ar', '44100', '-f', 'f32le', outName]);

    const pcmData = await ffmpeg.readFile(outName);
    // pcmData is Uint8Array containing 32-bit floats
    const floatData = new Float32Array(pcmData.buffer);

    console.log("[Worker] Decoded Float32 Audio Data Length: ", floatData.length);

    // Here we would run Essentia.js and custom DSP
    // ...

    self.postMessage({ type: 'DECODE_DONE', length: floatData.length });
}
