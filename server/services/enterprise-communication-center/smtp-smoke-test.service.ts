/**
 * CO-C1-OPERATIONAL-EMAIL-001C — Super Admin SMTP smoke test.
 * Sends exactly one message to an explicitly entered recipient via CUSTOMERS profile.
 * Does not enable ENCE or unrestricted operational delivery.
 */

import tls from "node:tls";
import type { EnterpriseCommunicationProfileRecord } from "@/types/enterprise-communication-center";
import { resolveSmtpSecret } from "@/lib/enterprise-communication-center/smtp-secret-resolver";

export type SmtpSmokeTestResult = {
  ok: boolean;
  profileCode: string;
  recipientEmail: string;
  senderEmail: string | null;
  host: string | null;
  port: number | null;
  credentialSource: "env" | "missing";
  message: string;
  smtpResponse: string | null;
};

const SUBJECT = "Catalyst One — Connect SMTP Live Test";
const TIMEOUT_MS = 20_000;

function base64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function createLineReader(socket: tls.TLSSocket) {
  let buffer = "";
  const queue: string[] = [];
  const waiters: Array<{
    resolve: (line: string) => void;
    reject: (err: Error) => void;
  }> = [];

  const flush = () => {
    let idx = buffer.indexOf("\r\n");
    while (idx !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const waiter = waiters.shift();
      if (waiter) waiter.resolve(line);
      else queue.push(line);
      idx = buffer.indexOf("\r\n");
    }
  };

  socket.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    flush();
  });

  return (): Promise<string> =>
    new Promise((resolve, reject) => {
      const next = queue.shift();
      if (next !== undefined) {
        resolve(next);
        return;
      }
      waiters.push({ resolve, reject });
    });
}

function writeLine(socket: tls.TLSSocket, line: string) {
  socket.write(`${line}\r\n`);
}

async function readResponse(readLine: () => Promise<string>): Promise<string> {
  const first = await readLine();
  const code = first.slice(0, 3);
  if (first.length >= 4 && first[3] === "-") {
    let line = first;
    while (line.length >= 4 && line[3] === "-") {
      line = await readLine();
    }
    return line;
  }
  if (first.startsWith(code)) return first;
  return first;
}

async function expectCode(
  readLine: () => Promise<string>,
  prefixes: string[],
): Promise<string> {
  const line = await readResponse(readLine);
  if (!prefixes.some((p) => line.startsWith(p))) {
    throw new Error(`Unexpected SMTP response: ${line}`);
  }
  return line;
}

function buildMessage(input: {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  toEmail: string;
  subject: string;
  textBody: string;
}): string {
  const date = new Date().toUTCString();
  return [
    `From: ${input.fromName} <${input.fromEmail}>`,
    `Reply-To: ${input.replyToEmail}`,
    `To: ${input.toEmail}`,
    `Subject: ${input.subject}`,
    `Date: ${date}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.textBody,
  ].join("\r\n");
}

async function sendOneSmtpMessage(input: {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  toEmail: string;
}): Promise<{ ok: boolean; message: string; smtpResponse: string | null }> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: input.host,
        port: input.port,
        servername: input.host,
        rejectUnauthorized: true,
      },
      async () => {
        const readLine = createLineReader(socket);
        try {
          await expectCode(readLine, ["220"]);
          writeLine(socket, "EHLO catalyst-one-smoke-test");
          await expectCode(readLine, ["250"]);

          writeLine(socket, "AUTH LOGIN");
          await expectCode(readLine, ["334"]);
          writeLine(socket, base64(input.username));
          await expectCode(readLine, ["334"]);
          writeLine(socket, base64(input.password));
          await expectCode(readLine, ["235"]);

          writeLine(socket, `MAIL FROM:<${input.fromEmail}>`);
          await expectCode(readLine, ["250"]);
          writeLine(socket, `RCPT TO:<${input.toEmail}>`);
          await expectCode(readLine, ["250"]);

          writeLine(socket, "DATA");
          await expectCode(readLine, ["354"]);

          const body = buildMessage({
            fromEmail: input.fromEmail,
            fromName: input.fromName,
            replyToEmail: input.replyToEmail,
            toEmail: input.toEmail,
            subject: SUBJECT,
            textBody:
              "This is a controlled Catalyst One operational email test from connect@rupeecatalyst.com.",
          });
          writeLine(socket, body);
          writeLine(socket, ".");
          const sent = await expectCode(readLine, ["250"]);

          writeLine(socket, "QUIT");
          socket.end();
          resolve({
            ok: true,
            message: "SMTP smoke test message accepted by server.",
            smtpResponse: sent,
          });
        } catch (err) {
          try {
            writeLine(socket, "QUIT");
            socket.end();
          } catch {
            socket.destroy();
          }
          resolve({
            ok: false,
            message: err instanceof Error ? err.message : "SMTP smoke test failed",
            smtpResponse: null,
          });
        }
      },
    );

    socket.setTimeout(TIMEOUT_MS, () => {
      socket.destroy();
      resolve({ ok: false, message: "SMTP smoke test timed out", smtpResponse: null });
    });
    socket.on("error", (err) => {
      resolve({
        ok: false,
        message: err.message || "SMTP connection error",
        smtpResponse: null,
      });
    });
  });
}

export async function runCustomersSmtpSmokeTest(input: {
  profile: Pick<
    EnterpriseCommunicationProfileRecord,
    | "profileCode"
    | "displayName"
    | "senderEmail"
    | "replyToEmail"
    | "smtpProvider"
    | "smtpHost"
    | "smtpPort"
    | "smtpUsername"
    | "active"
  >;
  recipientEmail: string;
}): Promise<SmtpSmokeTestResult> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  const host = input.profile.smtpHost?.trim() || null;
  const port = input.profile.smtpPort ?? null;
  const username = input.profile.smtpUsername?.trim() || null;
  const senderEmail = input.profile.senderEmail?.trim() || null;
  const replyToEmail =
    input.profile.replyToEmail?.trim() || input.profile.senderEmail?.trim() || null;
  const secret = resolveSmtpSecret(input.profile.profileCode);
  const credentialSource = secret ? ("env" as const) : ("missing" as const);

  if (input.profile.profileCode !== "CUSTOMERS") {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "Smoke test is limited to the CUSTOMERS profile.",
      smtpResponse: null,
    };
  }

  if (!input.profile.active || input.profile.smtpProvider !== "smtp") {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "CUSTOMERS profile is inactive or SMTP provider is not configured.",
      smtpResponse: null,
    };
  }

  if (!host || !port || !username || !senderEmail || !replyToEmail) {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "SMTP host, port, username, sender email, and reply-to must be configured.",
      smtpResponse: null,
    };
  }

  if (!secret) {
    return {
      ok: false,
      profileCode: input.profile.profileCode,
      recipientEmail,
      senderEmail,
      host,
      port,
      credentialSource,
      message: "Hostinger SMTP credential is not configured (ECC_CUSTOMERS_SMTP_PASSWORD).",
      smtpResponse: null,
    };
  }

  const send = await sendOneSmtpMessage({
    host,
    port,
    username,
    password: secret,
    fromEmail: senderEmail,
    fromName: input.profile.displayName?.trim() || "Rupee Catalyst Connect",
    replyToEmail,
    toEmail: recipientEmail,
  });

  return {
    ok: send.ok,
    profileCode: input.profile.profileCode,
    recipientEmail,
    senderEmail,
    host,
    port,
    credentialSource,
    message: send.message,
    smtpResponse: send.smtpResponse,
  };
}
