declare module "bcryptjs" {
  /**
   * Hash a password with a salt or number of rounds.
   * This is a minimal subset of the real bcryptjs API, enough for this app.
   */
  export function hash(
    data: string,
    saltOrRounds: string | number
  ): Promise<string>;

  /**
   * Compare a plaintext password to a hash.
   */
  export function compare(data: string, encrypted: string): Promise<boolean>;
}
