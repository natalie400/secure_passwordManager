import { Keychain } from "../crypto/password-manager.generated.js";
import { ApiError, vaultApi } from "./apiClient.js";

/**
 * Wraps the graded Keychain for the app.
 *
 * The Keychain cannot list its domains (they are HMAC'd), and values are limited to 64 characters,
 * so the app keeps an encrypted index *inside the same keychain*, using reserved names:
 *   __sv_count__          -> number of entries (as a string)
 *   __sv_slot_<i>__       -> domain stored in slot i
 *   __sv_user__<domain>   -> username for that domain
 * Every one of these is encrypted and HMAC'd by the real library like any other record.
 *
 * The master password is only ever passed as a function argument; it is never stored.
 * Backend persistence stores ONLY the Keychain dump (ciphertext + salt) and its SHA-256 checksum.
 */

const COUNT = "__sv_count__";
const slotName = (i: number) => `__sv_slot_${i}__`;
const userName = (d: string) => `__sv_user__${d}`;

export const MAX_FIELD_LENGTH = 64; // library limit for every stored value

export type VaultErrorKind =
  | "no-vault"
  | "wrong-password"
  | "tampered"
  | "invalid-input"
  | "corrupt"
  | "conflict"
  | "unauthorized";

export class VaultError extends Error {
  kind: VaultErrorKind;
  constructor(kind: VaultErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface EntryInfo {
  domain: string;
  username: string;
}

export async function hasStoredVault(): Promise<boolean> {
  try {
    await vaultApi.fetch();
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return false;
    throw e;
  }
}

export async function deleteStoredVault(): Promise<void> {
  try {
    await vaultApi.remove();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return;
    throw e;
  }
}

export class Vault {
  private kc: Keychain;
  private domains: string[];
  private usernames: Map<string, string>;
  private version: number;

  private constructor(
    kc: Keychain,
    domains: string[],
    usernames: Map<string, string>,
    version: number
  ) {
    this.kc = kc;
    this.domains = domains;
    this.usernames = usernames;
    this.version = version;
  }

  /** Creates a brand new empty vault and saves it to the backend. */
  static async create(masterPassword: string): Promise<Vault> {
    const kc = await Keychain.init(masterPassword);
    await kc.set(COUNT, "0");
    const [repr, checksum] = await kc.dump();

    try {
      const created = await vaultApi.create(repr, checksum);
      return new Vault(kc, [], new Map(), created.version);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        throw new VaultError("unauthorized", "Please log in to create a vault.");
      }
      throw e;
    }
  }

  /** Fetches and unlocks the remote vault. Throws VaultError on wrong password or tampering. */
  static async unlock(masterPassword: string): Promise<Vault> {
    let remote;
    try {
      remote = await vaultApi.fetch();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404) throw new VaultError("no-vault", "No vault found for this account.");
        if (e.status === 401) throw new VaultError("unauthorized", "Session expired. Please log in again.");
      }
      throw e;
    }

    return Vault.fromRepresentation(
      masterPassword,
      remote.repr,
      remote.checksum,
      remote.version
    );
  }

  static async fromRepresentation(
    masterPassword: string,
    repr: string,
    checksum?: string,
    version = 1
  ): Promise<Vault> {
    let kc: Keychain;
    try {
      kc = await Keychain.load(masterPassword, repr, checksum);
    } catch (e) {
      const msg = String(e);
      if (msg.includes("checksum")) {
        throw new VaultError(
          "tampered",
          "The vault data does not match its integrity checksum. It may have been modified or rolled back."
        );
      }
      if (msg.includes("Invalid password")) {
        throw new VaultError("wrong-password", "Incorrect master password.");
      }
      throw new VaultError("corrupt", "The vault could not be read.");
    }

    try {
      const count = Number(await kc.get(COUNT));
      if (!Number.isInteger(count) || count < 0) {
        throw new VaultError("corrupt", "Vault index is damaged.");
      }
      const domains: string[] = [];
      const usernames = new Map<string, string>();
      for (let i = 0; i < count; i++) {
        const d = await kc.get(slotName(i));
        if (d === null) throw new VaultError("corrupt", "Vault index is damaged.");
        domains.push(d);
        usernames.set(d, (await kc.get(userName(d))) ?? "");
      }
      return new Vault(kc, domains, usernames, version);
    } catch (e) {
      if (e instanceof VaultError) throw e;
      throw new VaultError("tampered", "A vault record failed its integrity check.");
    }
  }

  list(): EntryInfo[] {
    return this.domains.map((domain) => ({
      domain,
      username: this.usernames.get(domain) ?? "",
    }));
  }

  async getPassword(domain: string): Promise<string | null> {
    return this.kc.get(domain);
  }

  /** Adds a new entry or updates an existing one (the library's set() overwrites). */
  async save(domain: string, username: string, password: string): Promise<void> {
    domain = domain.trim();
    if (!domain) throw new VaultError("invalid-input", "Website is required.");
    if (domain.startsWith("__sv_")) {
      throw new VaultError("invalid-input", "That website name is reserved.");
    }
    if (domain.length > MAX_FIELD_LENGTH) {
      throw new VaultError("invalid-input", `Website must be at most ${MAX_FIELD_LENGTH} characters.`);
    }
    if (username.length > MAX_FIELD_LENGTH) {
      throw new VaultError("invalid-input", `Username must be at most ${MAX_FIELD_LENGTH} characters.`);
    }
    if (password.length > MAX_FIELD_LENGTH) {
      throw new VaultError("invalid-input", `Password must be at most ${MAX_FIELD_LENGTH} characters.`);
    }
    if (!password) throw new VaultError("invalid-input", "Password is required.");

    if (!this.domains.includes(domain)) {
      await this.kc.set(slotName(this.domains.length), domain);
      this.domains.push(domain);
      await this.kc.set(COUNT, String(this.domains.length));
    }
    await this.kc.set(userName(domain), username);
    await this.kc.set(domain, password);
    this.usernames.set(domain, username);
    await this.persist();
  }

  async remove(domain: string): Promise<boolean> {
    const idx = this.domains.indexOf(domain);
    if (idx === -1) return false;
    const lastIdx = this.domains.length - 1;
    const last = this.domains[lastIdx];
    if (idx !== lastIdx) {
      await this.kc.set(slotName(idx), last);
      this.domains[idx] = last;
    }
    await this.kc.remove(slotName(lastIdx));
    this.domains.pop();
    await this.kc.set(COUNT, String(this.domains.length));
    await this.kc.remove(userName(domain));
    await this.kc.remove(domain);
    this.usernames.delete(domain);
    await this.persist();
    return true;
  }

  /** Returns [representation, checksum] of the encrypted vault for backups. */
  async exportEncrypted(): Promise<[string, string]> {
    return this.kc.dump();
  }

  private async persist(): Promise<void> {
    const [repr, checksum] = await this.kc.dump();
    try {
      const updated = await vaultApi.update(repr, checksum, this.version);
      this.version = updated.version;
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) {
          throw new VaultError(
            "conflict",
            "Your vault was updated on another device or tab. Please lock and unlock again to sync."
          );
        }
        if (e.status === 401) {
          throw new VaultError("unauthorized", "Your session has expired. Please log in again.");
        }
      }
      throw e;
    }
  }
}