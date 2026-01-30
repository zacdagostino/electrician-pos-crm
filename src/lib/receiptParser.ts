export type ParsedReceipt = {
  vendorName?: string;
  receiptDate?: string;
  total?: number;
  tax?: number;
  items: { name: string; quantity?: number; unitPrice?: number }[];
};

const currencyFromLine = (line: string) => {
  const match = line.match(/([0-9]+(?:\.[0-9]{2})?)/g);
  if (!match) return null;
  const value = Number(match[match.length - 1]);
  return Number.isNaN(value) ? null : value;
};

const parseLineItem = (line: string) => {
  const qtyMatch = line.match(/(\d+)\s*x\s*([0-9]+(?:\.[0-9]{2})?)/i);
  if (qtyMatch) {
    const quantity = Number(qtyMatch[1]);
    const unitPrice = Number(qtyMatch[2]);
    const name = line.replace(qtyMatch[0], "").trim();
    if (name) {
      return { name, quantity, unitPrice };
    }
  }

  const priceMatch = line.match(/^(.*)\s+([0-9]+(?:\.[0-9]{2})?)$/);
  if (priceMatch) {
    const name = priceMatch[1].trim();
    const unitPrice = Number(priceMatch[2]);
    if (name) {
      return { name, unitPrice };
    }
  }

  return null;
};

export const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const vendorName = lines.find((line) => /bunnings/i.test(line))
    ? "Bunnings"
    : lines[0];

  const dateLine = lines.find((line) => /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(line));
  const receiptDate = dateLine?.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/)?.[0];

  const totalLine = lines.find((line) => /\btotal\b/i.test(line)) ?? "";
  const total = totalLine ? currencyFromLine(totalLine) ?? undefined : undefined;

  const taxLine = lines.find((line) => /\b(gst|tax)\b/i.test(line)) ?? "";
  const tax = taxLine ? currencyFromLine(taxLine) ?? undefined : undefined;

  const items = lines
    .map(parseLineItem)
    .filter((item): item is { name: string; quantity?: number; unitPrice?: number } =>
      Boolean(item)
    );

  return {
    vendorName,
    receiptDate,
    total,
    tax,
    items,
  };
};
