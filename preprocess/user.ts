import {
  createResourcesRepo,
  getProlificToken,
  getCommonResourcesNames,
  isProjectNameExistInProjectList,
  User,
  getAllProjects,
} from "./gitlabUtils";
import { resourcesRepoName } from "./constants";

export const redirectToOauth2 = () => {
  location.href =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.env.REDIRECT_URL! + `&state=${encodeURI(window.location.href)}`;
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
  user.projectList.then(async (resolvedProjectList) => {
    if (
      !isProjectNameExistInProjectList(resolvedProjectList, resourcesRepoName)
    ) {
      console.log("Creating EasyEyesResources repository, on getUserInfo ...");
      await createResourcesRepo(user);
    }
  });

  // Resources depend on project list, so make them a Promise too
  const resourcesPromise = user.projectList.then(() =>
    getCommonResourcesNames(user),
  );

  // Fetch Prolific token
  const prolificToken = await getProlificToken(user);

  return [user, resourcesPromise, prolificToken];
};
