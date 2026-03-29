export const MIN_PASSWORD_LENGTH = 8;

const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export type PasswordComplexityErrorCode =
  | "too_short"
  | "missing_uppercase"
  | "missing_number"
  | "missing_special";

export function validatePasswordComplexity(password: string): PasswordComplexityErrorCode[] {
  const errors: PasswordComplexityErrorCode[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push("too_short");
  }
  if (!UPPERCASE_REGEX.test(password)) {
    errors.push("missing_uppercase");
  }
  if (!NUMBER_REGEX.test(password)) {
    errors.push("missing_number");
  }
  if (!SPECIAL_CHAR_REGEX.test(password)) {
    errors.push("missing_special");
  }

  return errors;
}

export function isPasswordComplexEnough(password: string): boolean {
  return validatePasswordComplexity(password).length === 0;
}

export const PASSWORD_POLICY_SUMMARY =
  "Your password must be at least 8 characters long, include at least one uppercase letter (A-Z), one number (0-9), and one special character (for example ! @ # $ %). You also can't reuse any of your last 3 passwords.";
