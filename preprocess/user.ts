import {
  createResourcesRepo,
  getProlificToken,
  getCommonResourcesNames,
  isProjectNameExistInProjectList,
  User,
} from "./gitlabUtils";
import { resourcesRepoName } from "./constants";
import { getTokenInfo } from "./pkceUtils";
import { GitLabAuth } from "./auth/gitlabAuth";
import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { getAuthConfig } from "./auth/config";

export const redirectToOauth2 = async () => {
  // Use GitLabAuth class for cleaner PKCE implementation with state validation
  const config = getAuthConfig();
  const auth = new GitLabAuth(config);

  // This will generate PKCE parameters, state, and redirect to GitLab
  await auth.startAuthorization();
};

/**
 * Load stored session from localStorage if it exists and is valid
 * @returns Tuple of [User, resourcesPromise, prolificToken] or null if no valid session
 */
export const loadStoredSession = async (): Promise<
  [User, Promise<{ [key: string]: string[] }>, string] | null
> => {
  try {
    const config = getAuthConfig();

    // Try to load OAuth client from localStorage
    const oauthClient = GitLabOAuthClient.loadFromStorage(
      config.clientId,
      config.redirectUri,
    );

    if (!oauthClient) {
      return null;
    }

    // Validate token with GitLab
    try {
      await getTokenInfo(oauthClient.getAccessToken());
    } catch (error) {
      // Token is invalid, clear storage and return null
      console.warn("Stored token is invalid:", error);
      oauthClient.clearTokens();
      return null;
    }

    //todo: check if it should remove and use getUserInfo method below

    // Token is valid, create User instance
    const user = new User(oauthClient.getAccessToken());

    // Initialize user details
    await user.initUserDetails();

    // Initialize project list
    user.initProjectList();

    // Check/ensure EasyEyesResources exists
    const resolvedProjectList = await user.projectList;
    if (
      !isProjectNameExistInProjectList(resolvedProjectList, resourcesRepoName)
    ) {
      console.log("Creating EasyEyesResources repository...");
      await createResourcesRepo(user);
      await user.initProjectList(true);
    }

    // Get resources and prolific token
    const resourcesPromise = user.projectList.then(() =>
      getCommonResourcesNames(user),
    );

    const prolificToken = await getProlificToken(user);

    return [user, resourcesPromise, prolificToken];
  } catch (error) {
    console.error("Error loading stored session:", error);
    return null;
  }
};

export const getUserInfo = async (
  accessToken: string,
): Promise<[User, Promise<{ [key: string]: string[] }>, string]> => {
  const user = new User(accessToken);

  // initialize account details
  await user.initUserDetails();

  // initialize project list
  user.initProjectList();

  // check/ensure EasyEyesResources exists, on projectList resolve
  const resolvedProjectList = await user.projectList;
  if (
    !isProjectNameExistInProjectList(resolvedProjectList, resourcesRepoName)
  ) {
    console.log("Creating EasyEyesResources repository, on getUserInfo ...");
    await createResourcesRepo(user);
    await user.initProjectList(true);
  }

  // Resources depend on project list, so make them a Promise too
  const resourcesPromise = user.projectList.then(() =>
    getCommonResourcesNames(user),
  );

  // Fetch Prolific token
  const prolificToken = await getProlificToken(user);

  return [user, resourcesPromise, prolificToken];
};
