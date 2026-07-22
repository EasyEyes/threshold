import { defineConfig } from "vite";
import { resolve } from "path";
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

  // Proxy /.netlify/functions/* to a Netlify backend so that examples served
  // by Vite (port 5500) can call functions like the glossary endpoint without
  // requiring `netlify dev` to be running locally. Defaults to the deployed
  // site; override with NETLIFY_PROXY_TARGET=http://localhost:8888 (or any
  // other URL) when running `netlify dev` alongside Vite.
  const netlifyProxyTarget =
    process.env.NETLIFY_PROXY_TARGET || "https://easyeyes.app";
  const netlifyFunctionsProxy = {
    "/.netlify/functions": {
      target: netlifyProxyTarget,
      changeOrigin: true,
      secure: true,
    },
  };
  console.log(`Vite: proxying /.netlify/functions/* -> ${netlifyProxyTarget}`);

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
          // VITE_NO_OPEN: sim/e2e runs spawn headless Chromium themselves;
          // opening the user's default browser would hijack their session.
          open: !process.env.VITE_NO_OPEN,
          headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
          },
          fs: {
            deny: ["js/**"],
          },
          proxy: netlifyFunctionsProxy,
        }
      : {
          port: 5500,
          open: !process.env.VITE_NO_OPEN,
          headers: {
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
          },
          proxy: netlifyFunctionsProxy,
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
      // Strip sourceMappingURL comments from source code in dev
      isDev && {
        name: "strip-sourcemap-url-dev",
        transform(code) {
          return code.replace(/\/\/# sourceMappingURL=.*$/gm, "");
        },
      },
      wasm(),
      topLevelAwait(),

      // Sentry source map upload (production only, when auth token available)
      !isDev &&
        process.env.SENTRY_AUTH_TOKEN &&
        sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: "easyeyes",
          project: "easyeyes-experiment",
          telemetry: false,
          release: { inject: false },
        }),
    ].filter(Boolean),
  };
});
