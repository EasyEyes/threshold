# Rust/WASM Development

## For Regular Developers

- The built WASM files are committed to the repository
- You don't need Rust tooling installed
- If WASM files are missing and Rust isn't installed, you'll get a helpful error message

## For Rust Developers

To modify the Rust code:

1. Install Rust: https://rustup.rs/
2. Install wasm32 target: `rustup target add wasm32-unknown-unknown`
3. Install wasm-bindgen-cli: `cargo install wasm-bindgen-cli --version 0.2.105`
4. Rebuild: `npm run build:rust`
5. Commit the updated WASM files in `pkg/`

**Note**: The wasm-bindgen-cli version must match the version in `Cargo.toml`.

## Adding New Features

Just add a new `.rs` file and export it:

1. Create `src/my_feature.rs` with your `#[wasm_bindgen]` functions
2. Add `pub mod my_feature;` to `src/lib.rs`
3. Run `npm run build:rust`

## Build Commands

- `npm run check:rust` - Uses pre-built WASM if available; builds only if missing
- `npm run build:rust` - Force rebuilds WASM (requires Rust + wasm-bindgen-cli)
