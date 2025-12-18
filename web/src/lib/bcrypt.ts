// Thin wrapper around bcryptjs for server-side usage.
// Using require with a ts-ignore avoids TypeScript needing a module declaration on Vercel.

// @ts-ignore - allow requiring bcryptjs without a type declaration in some environments
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs") as {
  hash(data: string, saltOrRounds: string | number): Promise<string>;
  compare(data: string, encrypted: string): Promise<boolean>;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
