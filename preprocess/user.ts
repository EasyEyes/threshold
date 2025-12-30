import {
  createResourcesRepo,
  getProlificToken,
  getCommonResourcesNames,
  isProjectNameExistInProjectList,
  User,
} from "./gitlabUtils";
import { resourcesRepoName } from "./constants";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  storeCodeVerifier,
} from "./pkceUtils";

export const redirectToOauth2 = async () => {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier for later use in token exchange
  storeCodeVerifier(codeVerifier);

  // Redirect to OAuth authorization with PKCE parameters
  const authUrl =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.REDIRECT_URL! +
    `&state=${encodeURI(window.location.href)}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  location.href = authUrl;
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
