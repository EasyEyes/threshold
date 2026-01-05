# EasyEyes Threshold

📖 [**Manual**](https://docs.google.com/document/d/e/2PACX-1vTTrqaSyva2afVupLchBjfTHc_YW5jAbEexGbudXMJ9xMKPBDA3nxQmHXa4wjnAoSVabeEA8T9CGIMa/pub)<br />
📝 [**Parameter Glossary**](https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8QswX_5h_oNS2Ly6VgoONGIxJHqDFjdZqWY_HUxH2Nr_LNkGDBL8FXz74l9BxVNR2AIXGhHir9GAd/pub?gid=1287694458&single=true&output=pdf)<br />
🌏 [**Webapp**](https://easyeyes.app/experiment/) (beta)

A PsychoJS-based experiment generator for the measuring various psychometric thresholds, e.g., crowding. Please visit [https://easyeyes.app/experiment](https://easyeyes.app/experiment/) for more instructions.

## Development

To clone this repo, use

```shell
git clone --recurse-submodules https://github.com/EasyEyes/threshold.git
```

Then, run the following for the initial setup

```shell
npm install
npm run build
```

To develop based on a specific experiment table, use

```shell
npm run examples [tableName].[xlsx] # you may also run `npm run examples` to prepare for all tables in your examples/tables folder
npm start # interactive selection of built examples
npm start -- --name=[tableName] # start hot-reload development for specific example
```

You need to rerun `npm run examples [your table name]` every time you edit the HTML or table files.

## PsychoJS Version

We build EasyEyes Threshold with PsychoJS `2022.1.3`.

## Vite Build System (Experimental)

We've added Vite as an experimental alternative to Webpack for faster builds. The existing Webpack setup remains fully functional.

### New Scripts

- `npm run vite-start` - Start Vite development server
- `npm run vite-build` - Build with Vite
- `npm run vite-preview` - Preview Vite production build
- `npm run compare-builds` - Compare Webpack vs Vite build performance (requires Rust)

### Performance Comparison

To compare build performance between Webpack and Vite:

```bash
npm run compare-builds
```

This Rust-based tool runs each build 3 times and provides detailed statistics including:

- Average build times
- Standard deviation
- Statistical significance
- Percentage improvement

### Notes

- Vite configuration is in `vite.config.js`
- Both build systems output to the same `js/` directory
- The Rust comparison tool requires Rust to be installed
- Existing Webpack scripts (`npm start`, `npm run build`) remain unchanged
