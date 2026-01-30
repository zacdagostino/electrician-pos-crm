import { Prisma } from "@prisma/client";

type QuoteLineInput = {
  name: string;
  description?: string | null;
  quantity?: number;
  unitPrice?: number;
  type: "fixed" | "addon" | "labour" | "adjustment";
  pricingItemId?: string | null;
};

type PricingProfileInput = {
  minimumCharge: Prisma.Decimal;
  travelSurchargeEnabled: boolean;
  travelSurchargeAmount: Prisma.Decimal | null;
  gstRate: Prisma.Decimal;
  pricesIncludeGst: boolean;
};

export const computeQuoteTotals = (
  items: QuoteLineInput[],
  profile: PricingProfileInput,
  travelSurchargeApplied: boolean
) => {
  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? 0);
    const lineTotal = quantity * unitPrice;
    return {
      ...item,
      quantity,
      unitPrice,
      lineTotal,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const minimumCharge = Number(profile.minimumCharge);
  const minimumChargeApplied = subtotal < minimumCharge;
  const minimumChargeAmount = minimumChargeApplied ? minimumCharge : 0;

  const travelSurchargeAmount =
    travelSurchargeApplied && profile.travelSurchargeEnabled
      ? Number(profile.travelSurchargeAmount ?? 0)
      : 0;

  let totalBeforeTax = minimumChargeApplied ? minimumCharge : subtotal;
  totalBeforeTax += travelSurchargeAmount;

  const gstRate = Number(profile.gstRate ?? 0.1);
  let gstAmount = 0;
  let total = totalBeforeTax;

  if (profile.pricesIncludeGst) {
    gstAmount = totalBeforeTax - totalBeforeTax / (1 + gstRate);
  } else {
    gstAmount = totalBeforeTax * gstRate;
    total = totalBeforeTax + gstAmount;
  }

  return {
    normalizedItems,
    subtotal,
    total,
    gstAmount,
    minimumChargeApplied,
    minimumChargeAmount,
    travelSurchargeAmount,
  };
};
