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
  const exampleName = process.env.VITE_EXAMPLE_NAME;

  // If example name is provided, serve static files from example directory
  if (exampleName) {
    console.log(`Vite config: Serving example '${exampleName}' from examples/${exampleName}/`);
    const exampleRoot = `examples/${exampleName}/`;

    return {
      root: exampleRoot,
      publicDir: false,
      css: {
        devSourcemap: isDev,
      },
      build: {
        // Disable building in example mode (already built)
        emptyOutDir: false,
        rollupOptions: {
          // No entry points - static serving only
          input: {},
        },
      },
      server: {
        port: 5500,
        open: true,
        hmr: false, // Disable HMR for built files
        watch: false, // Disable file watching for static files
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
        noDiscovery: true,
        include: [],
      },
      plugins: [],
    };
  }

  // Original configuration for normal development
  return {
    root: '.',
    publicDir: false,
    css: {
      devSourcemap: isDev,
    },
    build: {
      outDir: 'js',
      sourcemap: true,
      target: 'esnext',
      minify: !isDev ? 'terser' : false,
      // Inline all assets for offline capability (experiments must work without internet)
      assetsInlineLimit: Infinity,
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
          chunkFileNames: '[name].js',
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
      // Remove i18n.js sourcemap (pure data, no debugging value, saves 7.2MB)
      !isDev && {
        name: 'remove-i18n-sourcemap',
        apply: 'build',
        async closeBundle() {
          const fs = await import('fs');
          const path = await import('path');
          const mapFile = path.join(__dirname, 'js', 'i18n.min.js.map');
          if (fs.existsSync(mapFile)) {
            fs.unlinkSync(mapFile);
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
