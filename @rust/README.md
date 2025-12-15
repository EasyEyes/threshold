# Rust/WASM Modules

Rust code compiled to WebAssembly for the EasyEyes threshold experiment.

## Adding a New Feature

1. Create `src/my_feature.rs`
2. Add `pub mod my_feature;` to `src/lib.rs`
3. Run `npm run build:rust`

See DEVELOPMENT.md for additional details.

## Available Modules

### font_instancer

Processes fonts: generates static instances from variable fonts and applies OpenType stylistic sets.

```javascript
import init, {
  process_font,
  generate_static_font_instance,
  apply_stylistic_sets,
} from "@rust/pkg/easyeyes_wasm.js";

await init();

// Process both variable settings and stylistic sets
const processedFontBytes = process_font(
  fontBytes,
  '"wght" 625, "wdth" 25', // variable settings (or empty string)
  "SS01, SS19", // stylistic sets (or empty string)
);

// Or use individual functions:
const staticFontBytes = generate_static_font_instance(
  fontBytes,
  '"wght" 625, "wdth" 25',
);

const styledFontBytes = apply_stylistic_sets(fontBytes, "SS01, SS19");
```

#### Stylistic Sets

OpenType fonts can define up to 20 stylistic sets (SS01-SS20) for alternate glyph designs. The `apply_stylistic_sets` function injects the requested stylistic set lookups into the font's `ccmp` (Glyph Composition/Decomposition) feature, which browsers apply by default. This approach preserves ligatures and contextual alternates.

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
