import { randomUUID } from "node:crypto";
import { desc, eq, like } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { resetTestDatabase } from "./helpers/database";
import { sentPasswordResetEmails } from "./mocks/email";

const origin = "http://localhost:5173";
const RESET_IDENTIFIER_PREFIX = "reset-password:";

function post(
  app: ReturnType<typeof createApp>["app"],
  path: string,
  body: unknown,
) {
  return app.request(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Origin: origin,
      Cookie: "csrf=1",
    },
    body: JSON.stringify(body),
  });
}

async function signUp(
  app: ReturnType<typeof createApp>["app"],
  email: string,
  password: string,
) {
  const response = await post(app, "/api/auth/sign-up/email", {
    name: "Password reset user",
    email,
    password,
  });
  expect(response.status).toBe(200);
}

async function findResetTokens() {
  return db
    .select()
    .from(schema.verificationTable)
    .where(
      like(schema.verificationTable.identifier, `${RESET_IDENTIFIER_PREFIX}%`),
    )
    .orderBy(desc(schema.verificationTable.createdAt));
}

async function requestReset(
  app: ReturnType<typeof createApp>["app"],
  email: string,
) {
  return post(app, "/api/auth/request-password-reset", {
    email,
    redirectTo: `${origin}/auth/reset-password`,
  });
}

describe("API integration: password reset", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    sentPasswordResetEmails.length = 0;
  });

  it("issues a single-use token and mails the reset link", async () => {
    const { app } = createApp();
    const email = `reset-${randomUUID()}@example.com`;
    await signUp(app, email, "original-password");

    const response = await requestReset(app, email);
    expect(response.status).toBe(200);

    const tokens = await findResetTokens();
    expect(tokens).toHaveLength(1);

    expect(sentPasswordResetEmails).toHaveLength(1);
    const sent = sentPasswordResetEmails[0];
    expect(sent?.to).toBe(email);
    const resetLink =
      (sent?.data as { resetLink?: string } | undefined)?.resetLink ?? "";
    const token = tokens[0]?.identifier.slice(RESET_IDENTIFIER_PREFIX.length);
    expect(resetLink).toContain(`/api/auth/reset-password/${token}`);
    expect(resetLink).toContain(
      `callbackURL=${encodeURIComponent(`${origin}/auth/reset-password`)}`,
    );
  });

  it("answers the same way for an unknown email and mails nothing", async () => {
    const { app } = createApp();

    const response = await requestReset(
      app,
      `ghost-${randomUUID()}@example.com`,
    );

    expect(response.status).toBe(200);
    expect(await findResetTokens()).toHaveLength(0);
    expect(sentPasswordResetEmails).toHaveLength(0);
  });

  it("sets the new password, retires the old one, and burns the token", async () => {
    const { app } = createApp();
    const email = `cycle-${randomUUID()}@example.com`;
    await signUp(app, email, "original-password");

    await requestReset(app, email);
    const [issued] = await findResetTokens();
    const token = issued?.identifier.slice(RESET_IDENTIFIER_PREFIX.length);

    const reset = await post(app, "/api/auth/reset-password", {
      token,
      newPassword: "brand-new-password",
    });
    expect(reset.status).toBe(200);

    const signInNew = await post(app, "/api/auth/sign-in/email", {
      email,
      password: "brand-new-password",
    });
    expect(signInNew.status).toBe(200);

    const signInOld = await post(app, "/api/auth/sign-in/email", {
      email,
      password: "original-password",
    });
    expect(signInOld.status).toBe(401);

    const replay = await post(app, "/api/auth/reset-password", {
      token,
      newPassword: "third-password",
    });
    expect(replay.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const { app } = createApp();
    const email = `expired-${randomUUID()}@example.com`;
    await signUp(app, email, "original-password");

    await requestReset(app, email);
    const [issued] = await findResetTokens();
    const token = issued?.identifier.slice(RESET_IDENTIFIER_PREFIX.length);

    await db
      .update(schema.verificationTable)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.verificationTable.id, issued?.id ?? ""));

    const reset = await post(app, "/api/auth/reset-password", {
      token,
      newPassword: "brand-new-password",
    });
    expect(reset.status).toBe(400);

    const signInOld = await post(app, "/api/auth/sign-in/email", {
      email,
      password: "original-password",
    });
    expect(signInOld.status).toBe(200);
  });
});
