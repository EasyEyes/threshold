import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    root: '.',
    publicDir: false,
    // Disable CSS minification since we transform CSS to JS (css-in-js plugin)
    // The CSS minifier would fail trying to parse JS as CSS
    css: {
      devSourcemap: isDev,
    },
    build: {
      outDir: 'js',
      sourcemap: true,
      target: 'esnext',
      minify: !isDev ? 'terser' : false,
      // Disable CSS minification - our CSS is transformed to JS by the css-in-js plugin
      cssMinify: false,
      // Inline all assets for offline capability (experiments must work without internet)
      assetsInlineLimit: Infinity,
      // Prevent CSS extraction - bundle in JS for offline capability
      cssCodeSplit: false,
      rollupOptions: {
        input: {
          first: resolve(__dirname, 'first.js'),
          threshold: resolve(__dirname, 'threshold.js'),
        },
        // Suppress warnings from dependencies we can't control
        onwarn(warning, warn) {
          // Suppress mathjs PURE annotation warnings (dependency issue)
          if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('mathjs')) {
            return;
          }
          // Suppress eval warnings from dependencies (log4javascript, jsQUEST, file-type)
          if (warning.code === 'EVAL' && (
            warning.id?.includes('node_modules/') ||
            warning.id?.includes('jsQUEST')
          )) {
            return;
          }
          // Suppress fs/path externalization warnings for nodeLocal.js (Node-only code)
          if (warning.message?.includes('Module "fs"') || warning.message?.includes('Module "path"')) {
            return;
          }
          warn(warning);
        },
        output: {
          entryFileNames: '[name].min.js',
          chunkFileNames: '[name]-[hash].js',
          assetFileNames: '[name][extname]',
          sourcemapFileNames: '[name].min.js.map',
          // Prevent automatic code splitting - each entry bundles its own dependencies
          // This ensures offline capability (all assets load before experiment starts)
          manualChunks: () => null,
        },
      },
      chunkSizeWarningLimit: 10000,
    },
    server: {
      port: 5500,
      open: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    define: {
      'process.env.debug': JSON.stringify(isDev),
      'process.env.FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY || ''),
      'process.env.FIREBASE_API_KEY_SOUND': JSON.stringify(process.env.FIREBASE_API_KEY_SOUND || ''),
      'process.env.SENTRY_ENVIRONMENT': JSON.stringify(
        process.env.SENTRY_ENVIRONMENT || (isDev ? 'development' : 'production')
      ),
    },
    optimizeDeps: {
      exclude: ['@rust/pkg/easyeyes_wasm'],
    },
    plugins: [
      wasm(),
      topLevelAwait(),
      {
        name: 'css-in-js',
        transform(code, id) {
          // Convert CSS imports to JS that injects styles (matching Webpack's style-loader)
          if (id.endsWith('.css') && !id.includes('node_modules')) {
            return {
              code: `const css = ${JSON.stringify(code)};
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}
export default css;`,
              map: null,
            };
          }
        },
      },
      {
        name: 'disable-css-extraction',
        generateBundle(options, bundle) {
          // Remove any CSS assets from bundle - we want CSS in JS only
          // CSS is transformed to JS by css-in-js plugin and injected at runtime
          for (const fileName of Object.keys(bundle)) {
            if (fileName.endsWith('.css')) {
              delete bundle[fileName];
            }
          }
        },
        closeBundle() {
          // Fallback: delete any CSS files that were written despite generateBundle cleanup
          // This handles cases where Vite writes CSS after bundle generation
          const cssPath = resolve(__dirname, 'js', 'style.css');
          if (existsSync(cssPath)) {
            unlinkSync(cssPath);
          }
        },
      },
      {
        name: 'inject-modulepreload',
        writeBundle() {
          const jsDir = resolve(__dirname, 'js');
          if (!existsSync(jsDir)) return;

          // Find all chunk files (files with hash pattern: name-hash.js, excluding entry files)
          const allFiles = readdirSync(jsDir);
          const chunkFiles = allFiles
            .filter(file => {
              // Match pattern: name-hash.js (has a dash before the hash)
              const hasHashPattern = /^[^-]+-[A-Za-z0-9]+\.js$/.test(file);
              const isNotEntry = !file.includes('first.min.js') && !file.includes('threshold.min.js');
              const isNotMap = !file.endsWith('.map');
              return hasHashPattern && isNotEntry && isNotMap;
            });

          if (chunkFiles.length === 0) return;

          // Find all HTML files in the threshold directory
          const allHtmlFiles = readdirSync(__dirname)
            .filter(file => file.endsWith('.html'));

          allHtmlFiles.forEach(htmlFile => {
            const htmlPath = resolve(__dirname, htmlFile);
            let html = readFileSync(htmlPath, 'utf-8');

            // Remove any existing modulepreload tags we may have added
            html = html.replace(/<!-- Vite modulepreload -->[\s\S]*?<!-- End Vite modulepreload -->/g, '');

            // Generate modulepreload tags
            const preloadTags = chunkFiles
              .map(chunk => `    <link rel="modulepreload" href="js/${chunk}" />`)
              .join('\n');

            // Insert before closing </head> tag
            // This ensures first.min.js still loads and executes first (it's a script tag)
            const headCloseIndex = html.lastIndexOf('</head>');
            if (headCloseIndex !== -1) {
              const insertPoint = headCloseIndex;
              html = html.slice(0, insertPoint) +
                `\n    <!-- Vite modulepreload -->\n${preloadTags}\n    <!-- End Vite modulepreload -->\n` +
                html.slice(insertPoint);
              writeFileSync(htmlPath, html, 'utf-8');
            }
          });
        },
      },
    ],
  };
});