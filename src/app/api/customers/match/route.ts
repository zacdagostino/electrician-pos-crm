import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/\s+/g, "").trim();

const nameSimilarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[a.length][b.length];
  return 1 - distance / Math.max(a.length, b.length, 1);
};

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();
  const siteLine1 = String(body.siteLine1 ?? "").trim();
  const siteSuburb = String(body.siteSuburb ?? "").trim();
  const siteState = String(body.siteState ?? "").trim();
  const sitePostcode = String(body.sitePostcode ?? "").trim();

  if (!email && !phone && !siteLine1) {
    return NextResponse.json({ matches: [] });
  }

  const candidates = await db.customer.findMany({
    where: {
      orgId,
      OR: [
        email ? { email: { equals: email, mode: "insensitive" } } : undefined,
        phone ? { phone: { equals: phone } } : undefined,
      ].filter(Boolean) as any,
    },
    take: 5,
  });

  const normalizedAddress = normalize([siteLine1, siteSuburb, siteState, sitePostcode].join(" "));

  const matches = candidates
    .map((customer) => {
      const reasons: string[] = [];
      if (email && customer.email?.toLowerCase() === email) reasons.push("email");
      if (phone && customer.phone === phone) reasons.push("phone");

      const customerAddress = normalize(
        [customer.siteLine1, customer.siteSuburb, customer.siteState, customer.sitePostcode].join(
          " "
        )
      );

      if (normalizedAddress && customerAddress && normalizedAddress === customerAddress) {
        reasons.push("address");
      }

      const similarity = nameSimilarity(normalize(name), normalize(customer.name));
      if (similarity >= 0.85) reasons.push("name");

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        siteLine1: customer.siteLine1,
        siteSuburb: customer.siteSuburb,
        siteState: customer.siteState,
        sitePostcode: customer.sitePostcode,
        reasons,
      };
    })
    .filter((match) => match.reasons.length);

  return NextResponse.json({ matches });
};
