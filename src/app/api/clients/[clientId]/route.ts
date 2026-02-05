import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { verifyAddressWithGoogle } from "@/lib/addressVerification";

type Params = { params: Promise<{ clientId: string }> };

const getClientId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.clientId;
};

export const GET = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const clientId = await getClientId(params);
  const client = await db.customer.findFirst({
    where: { id: clientId, orgId },
    include: { jobs: true, quotes: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
};

export const PATCH = async (req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const clientId = await getClientId(params);
  const body = await req.json().catch(() => ({}));

  if (body.siteLine1) {
    const verification = await verifyAddressWithGoogle({
      line1: body.siteLine1,
      line2: body.siteLine2,
      suburb: body.siteSuburb,
      state: body.siteState,
      postcode: body.sitePostcode,
    });
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error ?? "Invalid address." }, { status: 400 });
    }
  }

  const updated = await db.customer.update({
    where: { id: clientId, orgId },
    data: {
      name: body.name ? String(body.name).trim() : undefined,
      email: body.email ? String(body.email).trim() : undefined,
      phone: body.phone ? String(body.phone).trim() : undefined,
      siteLine1: body.siteLine1 ? String(body.siteLine1).trim() : undefined,
      siteLine2: body.siteLine2 ? String(body.siteLine2).trim() : undefined,
      siteSuburb: body.siteSuburb ? String(body.siteSuburb).trim() : undefined,
      siteState: body.siteState ? String(body.siteState).trim() : undefined,
      sitePostcode: body.sitePostcode ? String(body.sitePostcode).trim() : undefined,
    },
  });

  return NextResponse.json({ client: updated });
};

export const DELETE = async (_req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const clientId = await getClientId(params);
  const jobsCount = await db.job.count({ where: { orgId, customerId: clientId } });
  const quotesCount = await db.quote.count({ where: { orgId, customerId: clientId } });

  if (jobsCount > 0 || quotesCount > 0) {
    return NextResponse.json(
      { error: "This client has jobs or quotes. Delete those first." },
      { status: 400 }
    );
  }

  await db.customer.delete({ where: { id: clientId, orgId } });
  return NextResponse.json({ ok: true });
};
