/**
 * CO-C1-OPERATIONAL-EMAIL-002 — Shared Hostinger SMTP transport (server-only).
 * Used by smoke test and operational document-request dispatch.
 */

import tls from "node:tls";

const DEFAULT_TIMEOUT_MS = 20_000;

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

function buildMimeMessage(input: {
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  to: string[];
  cc: string[];
  subject: string;
  textBody: string;
  messageId?: string;
}): string {
  const date = new Date().toUTCString();
  const toHeader = input.to.join(", ");
  const lines = [
    `From: ${input.fromName} <${input.fromEmail}>`,
    `Reply-To: ${input.replyToEmail}`,
    `To: ${toHeader}`,
  ];
  if (input.cc.length) {
    lines.push(`Cc: ${input.cc.join(", ")}`);
  }
  lines.push(
    `Subject: ${input.subject}`,
    `Date: ${date}`,
  );
  if (input.messageId?.trim()) {
    lines.push(`Message-ID: ${input.messageId.trim()}`);
  }
  lines.push(
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.textBody,
  );
  return lines.join("\r\n");
}

export type OperationalSmtpSendInput = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  textBody: string;
  ehloName?: string;
  timeoutMs?: number;
  messageId?: string;
};

export type OperationalSmtpSendResult = {
  ok: boolean;
  message: string;
  smtpResponse: string | null;
};

export async function sendOperationalSmtpMessage(
  input: OperationalSmtpSendInput,
): Promise<OperationalSmtpSendResult> {
  const to = input.to.map((e) => e.trim()).filter(Boolean);
  const cc = (input.cc ?? []).map((e) => e.trim()).filter(Boolean);
  if (!to.length) {
    return { ok: false, message: "At least one TO recipient is required.", smtpResponse: null };
  }

  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ehloName = input.ehloName ?? "catalyst-one-operational";

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
          writeLine(socket, `EHLO ${ehloName}`);
          await expectCode(readLine, ["250"]);

          writeLine(socket, "AUTH LOGIN");
          await expectCode(readLine, ["334"]);
          writeLine(socket, base64(input.username));
          await expectCode(readLine, ["334"]);
          writeLine(socket, base64(input.password));
          await expectCode(readLine, ["235"]);

          writeLine(socket, `MAIL FROM:<${input.fromEmail}>`);
          await expectCode(readLine, ["250"]);

          for (const addr of [...to, ...cc]) {
            writeLine(socket, `RCPT TO:<${addr}>`);
            await expectCode(readLine, ["250"]);
          }

          writeLine(socket, "DATA");
          await expectCode(readLine, ["354"]);

          const body = buildMimeMessage({
            fromEmail: input.fromEmail,
            fromName: input.fromName,
            replyToEmail: input.replyToEmail,
            to,
            cc,
            subject: input.subject,
            textBody: input.textBody,
            messageId: input.messageId,
          });
          writeLine(socket, body);
          writeLine(socket, ".");
          const sent = await expectCode(readLine, ["250"]);

          writeLine(socket, "QUIT");
          socket.end();
          resolve({
            ok: true,
            message: "SMTP message accepted by server.",
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
            message: err instanceof Error ? err.message : "SMTP send failed",
            smtpResponse: null,
          });
        }
      },
    );

    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve({ ok: false, message: "SMTP send timed out", smtpResponse: null });
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
