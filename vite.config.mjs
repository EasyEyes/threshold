import { defineConfig } from "vite";
import { resolve, join } from "path";
import { existsSync, unlinkSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { sentryVitePlugin } from "@sentry/vite-plugin";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const exampleName = process.env.VITE_EXAMPLE_NAME;

  // Log example name if provided (dev server will open the example's index.html)
  if (exampleName) {
    console.log(
      `Vite: Serving example '${exampleName}' with HMR from project root`,
    );
  }

  // Single configuration - always serve from project root for HMR support
  return {
    root: ".",
    publicDir: false,
    css: {
      devSourcemap: isDev,
    },
    build: {
      outDir: "js",
      sourcemap: true,
      target: "esnext",
      minify: !isDev ? "terser" : false,
      // Inline all assets for offline capability (experiments must work without internet)
      assetsInlineLimit: Infinity,
      rollupOptions: {
        input: {
          first: resolve(__dirname, "first.js"),
          threshold: resolve(__dirname, "threshold.js"),
        },
        // Suppress warnings from dependencies we can't control
        onwarn(warning, warn) {
          // Suppress mathjs PURE annotation warnings (dependency issue)
          if (
            warning.code === "INVALID_ANNOTATION" &&
            warning.id?.includes("mathjs")
          ) {
            return;
          }
          // Suppress eval warnings from dependencies (log4javascript, jsQUEST, file-type)
          if (
            warning.code === "EVAL" &&
            (warning.id?.includes("node_modules/") ||
              warning.id?.includes("jsQUEST"))
          ) {
            return;
          }
          // Suppress fs/path externalization warnings for nodeLocal.js (Node-only code)
          if (
            warning.message?.includes('Module "fs"') ||
            warning.message?.includes('Module "path"')
          ) {
            return;
          }
          warn(warning);
        },
        output: {
          entryFileNames: "[name].min.js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name][extname]",
          sourcemapFileNames: "[name].min.js.map",
          // Prevent automatic code splitting - each entry bundles its own dependencies
          // This ensures offline capability (all assets load before experiment starts)
          manualChunks: () => null,
        },
      },
      chunkSizeWarningLimit: 10000,
    },
    server: isDev
      ? {
          port: 5500,
          open: true,
          headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
          },
          fs: {
            deny: ["js/**"],
          },
        }
      : {
          port: 5500,
          open: true,
          headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
          },
        },
    resolve: {
      extensions: [".ts", ".js"],
    },
    define: {
      "process.env.debug": JSON.stringify(isDev),
      "process.env.FIREBASE_API_KEY": JSON.stringify(
        process.env.FIREBASE_API_KEY || "",
      ),
      "process.env.FIREBASE_API_KEY_SOUND": JSON.stringify(
        process.env.FIREBASE_API_KEY_SOUND || "",
      ),
      "process.env.SENTRY_ENVIRONMENT": JSON.stringify(
        process.env.SENTRY_ENVIRONMENT ||
          (isDev ? "development" : "production"),
      ),
    },
    optimizeDeps: {
      exclude: ["@rust/pkg/easyeyes_wasm"],
    },
    plugins: [
      // Redirect root to example when VITE_EXAMPLE_NAME set
      exampleName && {
        name: "example-redirect",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === "/" || req.url === "/index.html") {
              res.writeHead(302, {
                Location: `/examples/generated/${exampleName}/index.html`,
              });
              res.end();
              return;
            }
            next();
          });
        },
      },
      // Clean up i18n built file source map references (dev only)
      isDev && {
        name: "cleanup-i18n-sourcemap-dev",
        configureServer() {
          const i18nJsPath = join(__dirname, "js", "i18n.js");
          const i18nMapPath = join(__dirname, "js", "i18n.min.js.map");
          if (existsSync(i18nJsPath)) {
            let content = readFileSync(i18nJsPath, "utf-8");
            const original = content;
            content = content.replace(/\/\/# sourceMappingURL=.*$/gm, "");
            if (content !== original) {
              writeFileSync(i18nJsPath, content, "utf-8");
            }
          }
          if (existsSync(i18nMapPath)) {
            unlinkSync(i18nMapPath);
          }
        },
      },

      // Strip sourceMappingURL comments from source code in dev
      isDev && {
        name: "strip-sourcemap-url-dev",
        transform(code) {
          return code.replace(/\/\/# sourceMappingURL=.*$/gm, "");
        },
      },
      wasm(),
      topLevelAwait(),

      // Delete i18n source map file and strip sourceMappingURL comment (production only)
      !isDev && {
        name: "remove-i18n-sourcemap",
        apply: "build",
        async closeBundle() {
          const mapFile = join(__dirname, "js", "i18n.min.js.map");
          const i18nJsFile = join(__dirname, "js", "i18n.js");
          if (existsSync(mapFile)) {
            unlinkSync(mapFile);
          }
          if (existsSync(i18nJsFile)) {
            let content = readFileSync(i18nJsFile, "utf-8");
            const original = content;
            content = content.replace(/\/\/# sourceMappingURL=.*$/gm, "");
            if (content !== original) {
              writeFileSync(i18nJsFile, content, "utf-8");
            }
          }
        },
      },
      // Sentry source map upload (production only, when auth token available)
      !isDev &&
        process.env.SENTRY_AUTH_TOKEN &&
        sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: "easyeyes",
          project: "easyeyes-experiment",
          telemetry: false,
        }),
    ].filter(Boolean),
  };
});
