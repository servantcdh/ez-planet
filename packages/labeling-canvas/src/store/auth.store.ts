import { create } from "zustand";

export type ApiIdentity = {
  accountId?: string;
  orgId?: string;
  zoneId?: string;
  userId?: string;
  userName?: string;
};

export type TokenBundle = {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  scope?: string;
  tokenType?: string;
  expiresIn?: number;
};

interface AuthState {
  identity: ApiIdentity | null;
  tokens: TokenBundle | null;
  rememberMe: boolean;
  hydrated: boolean;
  setIdentity: (identity: ApiIdentity | null) => void;
  setTokens: (tokens: TokenBundle | null) => void;
  setRemember: (remember: boolean) => void;
  setSession: (session: {
    identity?: ApiIdentity | null;
    tokens?: TokenBundle | null;
    rememberMe?: boolean;
  }) => void;
  clearAuth: () => void;
}

export function decodeJwtPayload(
  token?: string
): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = atob(
      parts[1].replace(/-/g, "+").replace(/_/g, "/")
    );
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isJwtExpired(token?: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (!exp || typeof exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return now >= exp;
}

/**
 * Stub auth store for labeling-canvas library.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  identity: null,
  tokens: null,
  rememberMe: false,
  hydrated: true,
  setIdentity: (identity) => set({ identity }),
  setTokens: (tokens) => set({ tokens }),
  setRemember: (remember) => set({ rememberMe: remember }),
  setSession: ({ identity, tokens, rememberMe }) => {
    set({
      identity: identity ?? get().identity,
      tokens: tokens ?? get().tokens,
      rememberMe: rememberMe ?? get().rememberMe,
    });
  },
  clearAuth: () =>
    set((state) => ({
      tokens: null,
      identity: state.rememberMe ? state.identity : null,
      rememberMe: state.rememberMe,
    })),
}));

export function getValidIdToken(): string | null {
  const token = useAuthStore.getState().tokens?.idToken;
  if (!token) return null;
  return isJwtExpired(token) ? null : token;
}

export function getContentApiHeaders(
  overrides?: Partial<Record<string, string>>
): Record<string, string> {
  const identity = useAuthStore.getState().identity ?? {};
  return {
    ...identity,
    ...(overrides ?? {}),
  } as Record<string, string>;
}
