export type ReleaseGateRole =
  | "viewer"
  | "deployer-alpha-preview"
  | "deployer-beta"
  | "deployer-gamma"
  | "policy-admin";

export type Identity = {
  Subject: string;
  Role: ReleaseGateRole;
  Issuer: string;
};

export type EnvironmentState = {
  Name: string;
  DigestTag: string;
  Mode: string;
  Approvers: string[] | null;
  LastRunID: string;
  Status: string;
  DisableHint: string;
};

export type Release = {
  Tag: string;
  Title: string;
  ImagesRunID: string;
  Revision: string;
  IsProduct: boolean;
};

const TOKEN_KEY = "vdp-release-gate-token";

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = readToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}

export function loginLocal(email: string, password: string): Promise<{ token: string; identity: Identity }> {
  return api("/api/v1/auth/local", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchMe(): Promise<Identity> {
  return api("/api/v1/me");
}

export function fetchEnvironments(): Promise<EnvironmentState[]> {
  return api("/api/v1/environments");
}

export function fetchReleases(): Promise<Release[]> {
  return api("/api/v1/releases");
}

export function promote(env: string, imagesRunId: string, tag: string): Promise<{ status: string }> {
  return api(`/api/v1/environments/${env}/promote`, {
    method: "POST",
    body: JSON.stringify({ images_run_id: imagesRunId, tag }),
  });
}

export function rollback(env: string, imagesRunId: string, tag: string): Promise<{ status: string }> {
  return api(`/api/v1/environments/${env}/rollback`, {
    method: "POST",
    body: JSON.stringify({ images_run_id: imagesRunId, tag }),
  });
}

export function setSchedule(env: string, mode: string, window: string): Promise<{ status: string }> {
  return api(`/api/v1/environments/${env}/schedule`, {
    method: "PUT",
    body: JSON.stringify({ mode, window }),
  });
}

export function setApprovers(env: string, logins: string[]): Promise<{ status: string }> {
  return api(`/api/v1/environments/${env}/approvers`, {
    method: "PUT",
    body: JSON.stringify({ logins }),
  });
}
