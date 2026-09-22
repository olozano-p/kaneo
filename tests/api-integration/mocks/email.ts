import type { EmailResult } from "../../../packages/email/src/send-email";

export async function sendMagicLinkEmail(
  _to: string,
  _subject: string,
  _data: unknown,
): Promise<void> {
  return undefined;
}

export async function sendOtpEmail(
  _to: string,
  _subject: string,
  _data: unknown,
): Promise<void> {
  return undefined;
}

// Recorded so password-reset tests can assert the mail was handed off with the
// link Better Auth built, without reaching for a real SMTP server.
export const sentPasswordResetEmails: Array<{
  to: string;
  subject: string;
  data: unknown;
}> = [];

export async function sendPasswordResetEmail(
  to: string,
  subject: string,
  data: unknown,
): Promise<void> {
  sentPasswordResetEmails.push({ to, subject, data });
  return undefined;
}

export async function sendWorkspaceInvitationEmail(
  _to: string,
  _subject: string,
  _data: unknown,
): Promise<EmailResult> {
  return { success: true };
}

export function isSmtpConfigured(): boolean {
  return false;
}
