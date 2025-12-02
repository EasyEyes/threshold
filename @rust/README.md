# Rust/WASM Modules

Rust code compiled to WebAssembly for the EasyEyes threshold experiment.

## Adding a New Feature

1. Create `src/my_feature.rs`
2. Add `pub mod my_feature;` to `src/lib.rs`
3. Run `npm run build:rust`

See DEVELOPMENT.md for additional details.

## Available Modules

### font_instancer

Generates static font instances from variable fonts.

```javascript
import init, {
  generate_static_font_instance,
} from "@rust/pkg/easyeyes_wasm.js";

await init();
const staticFontBytes = generate_static_font_instance(
  fontBytes,
  '"wght" 625, "wdth" 25',
);
```

## Project Structure

```
@rust/
├── Cargo.toml      # Single crate config
├── src/
│   ├── lib.rs      # Exports all modules
│   └── font_instancer.rs
└── pkg/            # Built WASM output (committed)
```

## Build Commands

From the `threshold/` directory:

- `npm run check:rust` - Uses pre-built WASM; only builds if missing
- `npm run build:rust` - Rebuilds WASM (requires Rust toolchain)
