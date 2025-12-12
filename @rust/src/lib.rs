//! WASM modules for EasyEyes threshold experiment.
//!
//! To add a new feature:
//! 1. Create a new file: src/my_feature.rs
//! 2. Add `pub mod my_feature;` below
//! 3. Run `npm run build:rust` to rebuild

pub mod font_instancer;

// Re-export public functions for convenience
pub use font_instancer::generate_static_font_instance;
pub use font_instancer::apply_stylistic_sets;
pub use font_instancer::process_font;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Initialize the WASM module
#[wasm_bindgen]
pub fn init() {
    log("EasyEyes WASM module initialized");
}

