/**
 * Engine-side replacement for preprocess/gitlabUtils.ts (a shell/transport
 * module). The engine bundle must not carry the GitLab commit machinery.
 *
 * Per ADR 0001, Prolific participant-group validation stays shell-side:
 * shell-held credentials never cross the compile() boundary. Reporting no
 * token here makes main.ts skip that check silently (exactly as production
 * does for a scientist with no PROLIFIC_TOKEN in their resources repo); the
 * shell appends its own Prolific diagnostics after compile().
 */
export const getProlificToken = async (_user: unknown): Promise<string> => "";

/**
 * Login/session-flow functions imported by preprocess/user.ts (bundled for
 * its getUserInfo helper). They are unreachable from compile(); calling one
 * would mean the engine wandered into shell territory — fail loudly.
 */
const shellOnly = (name: string) => (): never => {
  throw new Error(`${name}() is shell-side; not available in threshold-engine`);
};

export const createUser = shellOnly("createUser");
export const createResourcesRepo = shellOnly("createResourcesRepo");
export const getCommonResourcesNames = shellOnly("getCommonResourcesNames");
