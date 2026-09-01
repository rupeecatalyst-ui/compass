/**
 * Amount in words (INR) for invoice totals — presentation helper.
 */

function chunkToWords(n: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
  if (n < 1000) {
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${chunkToWords(n % 100)}` : ""}`.trim();
  }
  return String(n);
}

export function amountInWordsInr(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return "Invalid Amount";
  const rupees = Math.floor(amount + Number.EPSILON);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  if (crore) parts.push(`${chunkToWords(crore)} Crore`);
  if (lakh) parts.push(`${chunkToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${chunkToWords(thousand)} Thousand`);
  if (hundred) parts.push(chunkToWords(hundred));

  let out = parts.join(" ").trim() || "Zero";
  out = `${out} Rupees`;
  if (paise > 0) out += ` and ${chunkToWords(paise)} Paise`;
  return `${out} Only`;
}
