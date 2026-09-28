import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { appUrl } from "./auth.service.js";

export const githubOAuthEnabled = () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

/** Goes through the Next.js /api proxy so the session cookies land on the app's own domain. */
export const githubRedirectUri = () => `${appUrl()}/api/auth/github/callback`;

export const githubAuthorizeUrl = (state: string) => {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  u.searchParams.set("redirect_uri", githubRedirectUri());
  u.searchParams.set("scope", "read:user user:email");
  u.searchParams.set("state", state);
  u.searchParams.set("allow_signup", "true");
  return u.toString();
};

export interface GithubProfile {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  /** Primary, verified email (null if the user has none verified). */
  email: string | null;
}

export const fetchGithubProfile = async (code: string): Promise<GithubProfile> => {
  const { data: token } = await axios.post<{ access_token?: string; error?: string; error_description?: string }>(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: githubRedirectUri(),
    },
    { headers: { Accept: "application/json" }, timeout: 15_000 }
  );
  if (!token.access_token) throw new ApiError(400, token.error_description || "GitHub sign-in failed.");

  const gh = axios.create({
    baseURL: "https://api.github.com",
    timeout: 15_000,
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json" },
  });
  const [{ data: user }, { data: emails }] = await Promise.all([
    gh.get<{ id: number; login: string; name: string | null; avatar_url: string | null }>("/user"),
    gh.get<{ email: string; primary: boolean; verified: boolean }[]>("/user/emails"),
  ]);
  const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified) ?? null;
  // The access token isn't stored: we only need identity, not ongoing API access.
  return { id: String(user.id), login: user.login, name: user.name, avatarUrl: user.avatar_url, email: primary?.email.toLowerCase() ?? null };
};
