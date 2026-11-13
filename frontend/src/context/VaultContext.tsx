import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Vault } from "../lib/vaultService";
import type { EntryInfo } from "../lib/vaultService";

interface VaultContextValue {
  unlocked: boolean;
  entries: EntryInfo[];
  createVault: (masterPassword: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  lock: () => void;
  saveEntry: (domain: string, username: string, password: string) => Promise<void>;
  removeEntry: (domain: string) => Promise<boolean>;
  revealPassword: (domain: string) => Promise<string | null>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  // The Vault (which holds the CryptoKeys) lives in a ref, not in React state or storage.
  const vaultRef = useRef<Vault | null>(null);
  const [entries, setEntries] = useState<EntryInfo[]>([]);
  const [unlocked, setUnlocked] = useState(false);

  const adopt = useCallback((vault: Vault) => {
    vaultRef.current = vault;
    setEntries(vault.list());
    setUnlocked(true);
  }, []);

  const value = useMemo<VaultContextValue>(() => ({
    unlocked,
    entries,
    createVault: async (pw) => adopt(await Vault.create(pw)),
    unlock: async (pw) => adopt(await Vault.unlock(pw)),
    lock: () => {
      vaultRef.current = null; // drop the keys so they can be garbage collected
      setEntries([]);
      setUnlocked(false);
    },
    saveEntry: async (domain, username, password) => {
      if (!vaultRef.current) throw new Error("Vault is locked");
      await vaultRef.current.save(domain, username, password);
      setEntries(vaultRef.current.list());
    },
    removeEntry: async (domain) => {
      if (!vaultRef.current) throw new Error("Vault is locked");
      const ok = await vaultRef.current.remove(domain);
      setEntries(vaultRef.current.list());
      return ok;
    },
    revealPassword: async (domain) => {
      if (!vaultRef.current) throw new Error("Vault is locked");
      return vaultRef.current.getPassword(domain);
    },
  }), [unlocked, entries, adopt]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used inside <VaultProvider>");
  return ctx;
}