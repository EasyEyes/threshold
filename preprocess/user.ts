import {
  createEmptyRepo,
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

  // Resources depend on project list, so make them a Promise too
  const resourcesPromise = user.projectList.then(() =>
    getCommonResourcesNames(user),
  );

  // Handle resource repo creation asynchronously in the background
  user.projectList
    .then(async (projectList) => {
      if (!isProjectNameExistInProjectList(projectList, resourcesRepoName)) {
        console.log("Creating EasyEyesResources repository...");
        await createEmptyRepo(resourcesRepoName, user);
        user.projectList = getAllProjects(user);
      }
    })
    .catch(console.error);

  // Fetch Prolific token
  const prolificToken = await getProlificToken(user);

  return [user, resourcesPromise, prolificToken];
};
