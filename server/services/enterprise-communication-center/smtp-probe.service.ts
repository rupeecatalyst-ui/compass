/**
 * CO-C1-OPERATIONAL-EMAIL-001B — Controlled SMTP connectivity probe.
 * Verifies TLS reachability and AUTH only — does not send mail. ENCE remains OFF.
 */

import tls from "node:tls";
import type { EnterpriseCommunicationProfileRecord } from "@/types/enterprise-communication-center";
import {
  isSmtpSecretConfigured,
  resolveSmtpSecret,
} from "@/lib/enterprise-communication-center/smtp-secret-resolver";

export type SmtpProbeResult = {
  ok: boolean;
  profileCode: string;
  host: string | null;
  port: number | null;
  credentialSource: "env" | "missing";
  tlsConnected: boolean;
  authVerified: boolean;
  message: string;
};

function readSmtpResponse(socket: tls.TLSSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      cleanup();
      resolve(chunk.toString("utf8"));
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP probe timed out"));
    }, 12_000);
    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.once("data", onData);
    socket.once("error", onError);
  });
}

function writeLine(socket: tls.TLSSocket, line: string) {
  socket.write(`${line}\r\n`);
}

function base64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

async function verifySmtpAuth(input: {
  host: string;
  port: number;
  username: string;
  password: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: input.host, port: input.port, servername: input.host, rejectUnauthorized: true },
      async () => {
        try {
          const greeting = await readSmtpResponse(socket);
          if (!greeting.startsWith("220")) {
            socket.end();
            resolve(false);
            return;
          }
          writeLine(socket, "EHLO catalyst-one-probe");
          const ehlo = await readSmtpResponse(socket);
          if (!ehlo.includes("250")) {
            socket.end();
            resolve(false);
            return;
          }
          writeLine(socket, "AUTH LOGIN");
          const authPrompt = await readSmtpResponse(socket);
          if (!authPrompt.startsWith("334")) {
            socket.end();
            resolve(false);
            return;
          }
          writeLine(socket, base64(input.username));
          const userPrompt = await readSmtpResponse(socket);
          if (!userPrompt.startsWith("334")) {
            socket.end();
            resolve(false);
            return;
          }
          writeLine(socket, base64(input.password));
          const authResult = await readSmtpResponse(socket);
          writeLine(socket, "QUIT");
          socket.end();
          resolve(authResult.startsWith("235"));
        } catch {
          try {
            socket.destroy();
          } catch {
            /* ignore */
          }
          resolve(false);
        }
      },
    );
    socket.setTimeout(12_000, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

export async function probeSmtpProfile(
  profile: Pick<
    EnterpriseCommunicationProfileRecord,
    "profileCode" | "smtpProvider" | "smtpHost" | "smtpPort" | "smtpUsername" | "active"
  >,
): Promise<SmtpProbeResult> {
  const host = profile.smtpHost?.trim() || null;
  const port = profile.smtpPort ?? null;
  const username = profile.smtpUsername?.trim() || null;
  const secret = resolveSmtpSecret(profile.profileCode);
  const credentialSource = secret ? ("env" as const) : ("missing" as const);

  if (!profile.active || profile.smtpProvider !== "smtp") {
    return {
      ok: false,
      profileCode: profile.profileCode,
      host,
      port,
      credentialSource,
      tlsConnected: false,
      authVerified: false,
      message: "Profile is inactive or provider is not SMTP.",
    };
  }
  if (!host || !port || !username) {
    return {
      ok: false,
      profileCode: profile.profileCode,
      host,
      port,
      credentialSource,
      tlsConnected: false,
      authVerified: false,
      message: "SMTP host, port, and username must be configured.",
    };
  }
  if (!secret) {
    return {
      ok: false,
      profileCode: profile.profileCode,
      host,
      port,
      credentialSource,
      tlsConnected: false,
      authVerified: false,
      message: "SMTP credential is not configured in server environment.",
    };
  }

  const authVerified = await verifySmtpAuth({
    host,
    port,
    username,
    password: secret,
  });

  return {
    ok: authVerified,
    profileCode: profile.profileCode,
    host,
    port,
    credentialSource,
    tlsConnected: authVerified,
    authVerified,
    message: authVerified
      ? "SMTP connectivity and authentication verified (no message sent)."
      : "SMTP probe failed — check host, port, username, and server credential.",
  };
}

export function smtpCredentialStatusForProfile(
  profileCode: EnterpriseCommunicationProfileRecord["profileCode"],
): boolean {
  return isSmtpSecretConfigured(profileCode);
}
