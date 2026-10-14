export function releaseConfig(env) {
  const production = env.NETLIFY_CONTEXT === "production";
  if (
    !["production", "branch-deploy", "deploy-preview"].includes(
      env.NETLIFY_CONTEXT,
    ) ||
    !/^[a-f0-9]{24}$/.test(env.NETLIFY_DEPLOY_ID ?? "") ||
    !/^[a-f0-9]{40}$/.test(env.ENGINE_SOURCE_SHA ?? "")
  )
    throw new Error("Missing verified Netlify release identity");
  const base = new URL(env.EASYEYES_BASE_URL);
  if (
    base.origin !== `https://${env.NETLIFY_DEPLOY_ID}--easyeyes.netlify.app` ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    base.username ||
    base.password
  )
    throw new Error("Release must target its immutable Netlify deployment");
  const version = `2026.${Number.parseInt(
    env.NETLIFY_DEPLOY_ID.slice(0, 12),
    16,
  )}.${Number.parseInt(env.NETLIFY_DEPLOY_ID.slice(-12), 16)}${
    production ? "" : `-staging.${env.ENGINE_SOURCE_SHA.slice(0, 12)}`
  }`;
  return {
    base: base.origin,
    version,
    tag: production ? "latest" : "staging",
    production,
  };
}
export const digest = async (bytes) => {
  const { createHash } = await import("node:crypto");
  return `sha256-${createHash("sha256").update(bytes).digest("base64")}`;
};
