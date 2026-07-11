import { authErrorCopy } from "./copy";

/**
 * Map a Supabase/GoTrue auth error (English, sometimes with a status code) to
 * a neutral Hebrew message. Matches on stable substrings so upstream wording
 * tweaks fall through to the generic message instead of leaking English.
 */
export function mapAuthError(error: unknown): string {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) return authErrorCopy.invalidCredentials;
  if (m.includes("email not confirmed")) return authErrorCopy.emailNotConfirmed;
  if (m.includes("already registered") || m.includes("already been registered"))
    return authErrorCopy.userExists;
  if (m.includes("password")) return authErrorCopy.weakPassword;
  if (m.includes("network") || m.includes("fetch")) return authErrorCopy.network;
  return authErrorCopy.generic;
}
