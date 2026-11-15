import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Vault, VaultError, deleteStoredVault } from "../lib/vaultService";
import type { EntryInfo } from "../lib/vaultService";
import { ApiError, authApi } from "../lib/apiClient";

export interface AuthUser {
  id: string;
  email: string;
}

interface VaultContextValue {
  // Account Auth State
  user: AuthUser | null;
  authLoading: boolean;
  hasVault: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Vault State & Operations (existing interface preserved)
  unlocked: boolean;
  entries: EntryInfo[];
  createVault: (masterPassword: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  lock: () => void;
  resetVault: () => Promise<void>;
  saveEntry: (domain: string, username: string, password: string) => Promise<void>;
  removeEntry: (domain: string) => Promise<boolean>;
  revealPassword: (domain: string) => Promise<string | null>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  // Account authentication state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasVault, setHasVault] = useState(false);

  // The Vault (which holds the CryptoKeys) lives in a ref, not in React state or storage.
  const vaultRef = useRef<Vault | null>(null);
  const [entries, setEntries] = useState<EntryInfo[]>([]);
  const [unlocked, setUnlocked] = useState(false);

  const lock = useCallback(() => {
    vaultRef.current = null; // drop the keys so they can be garbage collected
    setEntries([]);
    setUnlocked(false);
  }, []);

  const adopt = useCallback((vault: Vault) => {
    vaultRef.current = vault;
    setEntries(vault.list());
    setUnlocked(true);
    setHasVault(true);
  }, []);

  // Check active session cookie on initial page load
  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((res) => {
        if (!active) return;
        setUser(res.user);
        setHasVault(res.hasVault);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setHasVault(false);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Automatically lock & clear session state if any vault API call returns 401
  const handleSessionExpiry = useCallback(
    (err: unknown) => {
      if (
        (err instanceof VaultError && err.kind === "unauthorized") ||
        (err instanceof ApiError && err.status === 401)
      ) {
        lock();
        setUser(null);
        setHasVault(false);
      }
      throw err;
    },
    [lock]
  );

  const value = useMemo<VaultContextValue>(
    () => ({
      user,
      authLoading,
      hasVault,

      login: async (email, password) => {
        const res = await authApi.login(email, password);
        setUser(res.user);
        setHasVault(res.hasVault);
      },

      register: async (email, password) => {
        const res = await authApi.register(email, password);
        setUser(res.user);
        setHasVault(res.hasVault);
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          lock();
          setUser(null);
          setHasVault(false);
        }
      },

      unlocked,
      entries,

      createVault: async (pw) => {
        try {
          adopt(await Vault.create(pw));
        } catch (err) {
          handleSessionExpiry(err);
        }
      },

      unlock: async (pw) => {
        try {
          adopt(await Vault.unlock(pw));
        } catch (err) {
          handleSessionExpiry(err);
        }
      },

      lock,

      resetVault: async () => {
        try {
          await deleteStoredVault();
          lock();
          setHasVault(false);
        } catch (err) {
          handleSessionExpiry(err);
        }
      },

      saveEntry: async (domain, username, password) => {
        if (!vaultRef.current) throw new Error("Vault is locked");
        try {
          await vaultRef.current.save(domain, username, password);
          setEntries(vaultRef.current.list());
        } catch (err) {
          handleSessionExpiry(err);
        }
      },

      removeEntry: async (domain) => {
        if (!vaultRef.current) throw new Error("Vault is locked");
        try {
          const ok = await vaultRef.current.remove(domain);
          setEntries(vaultRef.current.list());
          return ok;
        } catch (err) {
          handleSessionExpiry(err);
          return false;
        }
      },

      revealPassword: async (domain) => {
        if (!vaultRef.current) throw new Error("Vault is locked");
        return vaultRef.current.getPassword(domain);
      },
    }),
    [user, authLoading, hasVault, unlocked, entries, adopt, lock, handleSessionExpiry]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside <VaultProvider>");
  return ctx;
}