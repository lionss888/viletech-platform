import { roleTitle } from "./roles";

/** Place line for root — outside org accounts, not an empty org field. */
export const ROOT_PROFILE_PLACE_LINE = "Вне учётных записей";

export type RootProfileCardFields = {
  fullName: string;
  roleLabel: string;
  email: string;
  placeLine: string;
};

type RootProfileCardInput = {
  role: string | undefined;
  fullName?: string;
  email?: string;
};

/**
 * Builds the read-only identity card for the signed-in root.
 * Returns null for any other role — those keep notifications-only profile.
 */
export function buildRootProfileCard(input: RootProfileCardInput): RootProfileCardFields | null {
  if (input.role !== "root") {
    return null;
  }
  const email = input.email?.trim() ?? "";
  const fullName = input.fullName?.trim() || email || "—";
  return {
    fullName,
    roleLabel: roleTitle("root"),
    email,
    placeLine: ROOT_PROFILE_PLACE_LINE,
  };
}
