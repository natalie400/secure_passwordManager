const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // Required to send/receive HttpOnly sv_session cookie
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error ?? "REQUEST_FAILED",
      data.message ?? "An error occurred while communicating with the server."
    );
  }

  return data as T;
}

export interface AuthSessionResponse {
  user: { id: string; email: string };
  hasVault: boolean;
  vaultVersion?: number | null;
}

export interface RemoteVaultResponse {
  repr: string;
  checksum: string;
  version: number;
  updatedAt: string;
}

export const authApi = {
  register: (email: string, password: string) =>
    request<AuthSessionResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthSessionResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ success: boolean }>("/auth/logout", {
      method: "POST",
    }),

  me: () => request<AuthSessionResponse>("/auth/me"),
};

export const vaultApi = {
  fetch: () => request<RemoteVaultResponse>("/vault"),

  create: (repr: string, checksum: string) =>
    request<{ version: number; updatedAt: string }>("/vault", {
      method: "POST",
      body: JSON.stringify({ repr, checksum }),
    }),

  update: (repr: string, checksum: string, expectedVersion: number) =>
    request<{ version: number; updatedAt: string }>("/vault", {
      method: "PUT",
      body: JSON.stringify({ repr, checksum, expectedVersion }),
    }),

  remove: () =>
    request<{ success: boolean }>("/vault", {
      method: "DELETE",
    }),
};