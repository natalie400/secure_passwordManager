export class Keychain {
  static init(password: string): Promise<Keychain>;
  static load(password: string, repr: string, trustedDataCheck?: string): Promise<Keychain>;
  dump(): Promise<[string, string]>;
  get(name: string): Promise<string | null>;
  set(name: string, value: string): Promise<void>;
  remove(name: string): Promise<boolean>;
}