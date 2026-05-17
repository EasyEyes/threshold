import { GitLabOAuthClient } from "./auth/gitlabOAuthClient";
import { getAuthConfig } from "./auth/config";

interface UserLike {
  id: string | number;
}

function getClient(): GitLabOAuthClient {
  const { clientId, redirectUri } = getAuthConfig();
  const client = GitLabOAuthClient.loadFromStorage(clientId, redirectUri);
  if (!client) throw new Error("AUTH_TOKEN_INVALID");
  return client;
}

export async function searchProjectByName(
  user: UserLike,
  name: string,
): Promise<any | null> {
  const client = getClient();
  const response = await client.apiRequest(
    `/users/${user.id}/projects?search=${encodeURIComponent(name)}&per_page=100`,
  );
  const projects: any[] = await response.json();
  return projects.find((p) => p.name === name) ?? null;
}

export async function searchProjectsByName(
  user: UserLike,
  name: string,
): Promise<any[]> {
  const client = getClient();
  const response = await client.apiRequest(
    `/users/${user.id}/projects?search=${encodeURIComponent(name)}&per_page=100`,
  );
  return response.json();
}

export async function getProjectsPage(
  user: UserLike,
  page: number,
): Promise<{ projects: any[]; hasMore: boolean }> {
  const client = getClient();
  const response = await client.apiRequest(
    `/users/${user.id}/projects?per_page=100&page=${page}`,
  );
  const totalPages = parseInt(
    response.headers.get("x-total-pages") ?? "1",
    10,
  );
  const projects: any[] = await response.json();
  return { projects, hasMore: page < totalPages };
}
