import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { requireTerminalSalesPermission } from "@/lib/terminalAuth";
export const POST = async (req: Request) => {
  const auth = await requireTerminalSalesPermission(req);
  if ("error" in auth) {
    return auth.error;
  }

  const stripe = getStripeClient();
  const token = await stripe.terminal.connectionTokens.create();
  return NextResponse.json({ secret: token.secret });
};
