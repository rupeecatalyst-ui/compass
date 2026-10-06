/** Transaction identity is supplied only by the dispatcher's authenticated User resolver. */
export function appendTransactionEmailSignature(body: string, authenticatedUserName: string): string {
  const name = authenticatedUserName.trim();
  if (!name) throw new Error("Authenticated sender name is unavailable");
  return `${body}\n\nRegards,\n\n${name}\nRupee Catalyst`;
}

/** Equivalent HTML representation; preserve the caller's message HTML verbatim. */
export function appendTransactionEmailHtmlSignature(bodyHtml: string, authenticatedUserName: string): string {
  const name = authenticatedUserName.trim();
  if (!name) throw new Error("Authenticated sender name is unavailable");
  const escaped = name.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
  return `${bodyHtml}<p>Regards,</p><p>${escaped}<br>Rupee Catalyst</p>`;
}
