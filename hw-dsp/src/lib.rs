use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct AudioProcessor {
    buffer: Vec<f32>,
}

#[wasm_bindgen]
impl AudioProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> AudioProcessor {
        AudioProcessor {
            buffer: Vec::new(),
        }
    }

    #[wasm_bindgen]
    pub fn process_chunk(&mut self, _chunk: &[f32], out_energy: &mut [f32]) {
        // Dummy implementation for now
        // Calculate RMS or simple sum of squares
        let mut sum = 0.0;
        for &sample in _chunk.iter() {
            sum += sample * sample;
        }
        let energy = (sum / _chunk.len() as f32).sqrt();
        
        if out_energy.len() > 0 {
            out_energy[0] = energy;
        }
    }
}
