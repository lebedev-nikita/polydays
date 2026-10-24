export type AccountAccessConfig = {
  readonly allowedEmails?: string;
  readonly ownerEmail?: string;
};

type AccountIdentity = { readonly email: string; readonly emailVerified: boolean };
export type AccountAccess = (user: AccountIdentity | null | undefined) => boolean;

export function createAccountAccess(config: AccountAccessConfig = {}): AccountAccess {
  const configured = config.allowedEmails ?? (config.ownerEmail?.trim() || "*");
  const emails = new Set(
    configured
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!emails.size || (emails.has("*") && emails.size !== 1))
    throw new Error("ALLOWED_EMAILS должен содержать * или список адресов через запятую.");
  return (user) =>
    Boolean(
      user?.emailVerified &&
      user.email.trim() &&
      (emails.has("*") || emails.has(user.email.trim().toLowerCase())),
    );
}
