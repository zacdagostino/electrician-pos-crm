import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { parseReceiptText } from "@/lib/receiptParser";

const MAX_FILE_SIZE_MB = 8;

export const POST = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Receipt file is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: "Receipt file too large" }, { status: 400 });
  }

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await worker.recognize(buffer);
    await worker.terminate();

    const text = result?.data?.text ?? "";
    const parsed = parseReceiptText(text);
    const parsedDate = parsed.receiptDate ? new Date(parsed.receiptDate) : null;
    const receiptDate =
      parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate : null;

    const receipt = await db.receipt.create({
      data: {
        orgId,
        vendorName: parsed.vendorName,
        receiptDate,
        total: parsed.total ?? null,
        tax: parsed.tax ?? null,
        rawText: text,
        status: "parsed",
        items: {
          create: parsed.items.map((item) => ({
            name: item.name,
            quantity: item.quantity ?? null,
            unitPrice: item.unitPrice ?? null,
          })),
        },
      },
    });

    return NextResponse.json({ receiptId: receipt.id, text, parsed });
  } catch (error) {
    return NextResponse.json({ error: "Unable to process receipt" }, { status: 500 });
  }
};
