import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { sentryVitePlugin } from '@sentry/vite-plugin';

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
          for (const fileName of Object.keys(bundle)) {
            if (fileName.endsWith('.css')) {
              delete bundle[fileName];
            }
          }
        },
        closeBundle() {
          const cssPath = resolve(__dirname, 'js', 'style.css');
          if (existsSync(cssPath)) {
            unlinkSync(cssPath);
          }
        },
      },
      // Sentry source map upload (production only, when auth token available)
      !isDev && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: 'easyeyes',
        project: 'easyeyes-experiment',
        telemetry: false,
      }),
    ].filter(Boolean),
  };
});