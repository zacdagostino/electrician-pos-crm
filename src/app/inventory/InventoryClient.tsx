"use client";

import { useEffect, useState } from "react";

type CatalogItem = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  imageUrl?: string;
  source?: string;
  sourceRef?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  sku?: string | null;
  unitCost?: number | null;
  sellPrice?: number | null;
  totalOnHand: number;
  vendorName?: string | null;
};

type ParsedReceipt = {
  vendorName?: string;
  receiptDate?: string;
  total?: number;
  tax?: number;
  items: { name: string; quantity?: number; unitPrice?: number }[];
};

type OcrResponse = {
  text: string;
  parsed: ParsedReceipt;
  receiptId?: string;
};

export default function InventoryClient() {
  const [query, setQuery] = useState("");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [bunningsError, setBunningsError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);

  const [manualName, setManualName] = useState("");
  const [manualSku, setManualSku] = useState("");
  const [manualCost, setManualCost] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [isManualSaving, setIsManualSaving] = useState(false);

  const [receipts, setReceipts] = useState<
    { id: string; vendorName?: string | null; total?: number | null; createdAt: string }[]
  >([]);
  const [activeTab, setActiveTab] = useState<"add" | "view">("add");

  const loadInventory = async () => {
    setIsInventoryLoading(true);
    setInventoryError(null);
    try {
      const response = await fetch("/api/inventory/items");
      const payload = await response.json();
      if (!response.ok) {
        setInventoryError(payload?.error ?? "Unable to load inventory");
        return;
      }
      setInventoryItems(payload.items ?? []);
    } catch (error) {
      setInventoryError("Unable to load inventory");
    } finally {
      setIsInventoryLoading(false);
    }
  };

  const loadReceipts = async () => {
    try {
      const response = await fetch("/api/inventory/receipts");
      const payload = await response.json();
      if (!response.ok) return;
      const mapped = (payload.receipts ?? []).map((receipt: any) => ({
        id: receipt.id,
        vendorName: receipt.vendorName,
        total: receipt.total ? Number(receipt.total) : null,
        createdAt: receipt.createdAt,
      }));
      setReceipts(mapped);
    } catch (error) {
      // ignore for now
    }
  };

  useEffect(() => {
    void loadInventory();
    void loadReceipts();
  }, []);

  const handleBunningsSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setBunningsError(null);
    setCatalogItems([]);

    try {
      const response = await fetch(`/api/inventory/bunnings/search?q=${encodeURIComponent(query)}`);
      const payload = await response.json();

      if (!response.ok) {
        setBunningsError(payload?.error ?? "Unable to search Bunnings");
        return;
      }

      setCatalogItems(payload.items ?? []);
    } catch (error) {
      setBunningsError("Unable to search Bunnings");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCatalogItem = async (item: CatalogItem) => {
    setManualError(null);
    try {
      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          sku: item.sku ?? null,
          unitCost: item.price ?? null,
          source: item.source ?? "catalog",
          sourceRef: item.sourceRef ?? item.id,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setManualError(payload?.error ?? "Unable to add catalog item");
        return;
      }
      await loadInventory();
    } catch (error) {
      setManualError("Unable to add catalog item");
    }
  };

  const handleManualSave = async () => {
    if (!manualName.trim()) {
      setManualError("Item name is required");
      return;
    }

    setIsManualSaving(true);
    setManualError(null);
    try {
      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualName,
          sku: manualSku || null,
          unitCost: manualCost || null,
          sellPrice: manualPrice || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setManualError(payload?.error ?? "Unable to save item");
        return;
      }
      setManualName("");
      setManualSku("");
      setManualCost("");
      setManualPrice("");
      await loadInventory();
    } catch (error) {
      setManualError("Unable to save item");
    } finally {
      setIsManualSaving(false);
    }
  };

  const handleReceiptUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receiptFile) return;

    setIsOcrLoading(true);
    setOcrError(null);
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append("file", receiptFile);

      const response = await fetch("/api/inventory/receipts/ocr", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        setOcrError(payload?.error ?? "Unable to process receipt");
        return;
      }

      setOcrResult(payload);
      await loadReceipts();
    } catch (error) {
      setOcrError("Unable to process receipt");
    } finally {
      setIsOcrLoading(false);
    }
  };

  const totalItems = inventoryItems.length;
  const totalReceipts = receipts.length;
  const totalOnHand = inventoryItems.reduce((sum, item) => sum + (item.totalOnHand ?? 0), 0);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Inventory home</p>
            <h2 className="mt-2 text-xl font-semibold">Overview & quick actions</h2>
            <p className="text-sm text-slate-400">
              Keep stock clean and fast to update. Start by adding items or reviewing on-hand totals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className="rounded-full border border-emerald-500/50 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Add inventory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("view")}
              className="rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-950"
            >
              View inventory
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Items</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{totalItems}</p>
            <p className="text-xs text-slate-500">Active catalog entries</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">On hand</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{totalOnHand}</p>
            <p className="text-xs text-slate-500">Total units across locations</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Receipts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{totalReceipts}</p>
            <p className="text-xs text-slate-500">Recent scans stored</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="inline-flex w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950/60 p-1 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                activeTab === "add"
                  ? "bg-emerald-400 text-slate-900"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Add inventory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("view")}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                activeTab === "view"
                  ? "bg-emerald-400 text-slate-900"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              View inventory
            </button>
          </div>
        </div>
      </section>

      {activeTab === "add" ? (
      <>
      <section id="add-items" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <header className="mb-5 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Add inventory</p>
          <h2 className="text-lg font-semibold">Create items for your catalog</h2>
          <p className="text-sm text-slate-400">
            Search supplier catalogs or add custom items manually.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <header className="mb-4 space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Catalog search</p>
              <p className="text-sm text-slate-400">
                Pull items from Bunnings or the mock catalog while approvals are paused.
              </p>
            </header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for cable, fittings, breakers..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={handleBunningsSearch}
              disabled={isSearching}
              className="rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950 disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
          {bunningsError ? (
            <p className="mt-3 text-sm text-rose-400">{bunningsError}</p>
          ) : null}
          {catalogItems.length ? (
            <ul className="mt-4 space-y-3">
              {catalogItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.sku ? `SKU ${item.sku}` : "SKU pending"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-300">
                      {item.price != null ? `$${item.price.toFixed(2)}` : "Price TBD"}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddCatalogItem(item)}
                      className="mt-2 rounded-lg border border-emerald-500/50 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Add
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <header className="mb-4 space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Manual entry</p>
              <p className="text-sm text-slate-400">
                Add custom items, service fees, or one-off parts.
              </p>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                placeholder="Item name"
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
              <input
                placeholder="SKU / barcode"
                value={manualSku}
                onChange={(event) => setManualSku(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
              <input
                placeholder="Unit cost"
                value={manualCost}
                onChange={(event) => setManualCost(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
              <input
                placeholder="Sell price"
                value={manualPrice}
                onChange={(event) => setManualPrice(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleManualSave}
                disabled={isManualSaving}
                className="rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950 disabled:opacity-50"
              >
                {isManualSaving ? "Saving..." : "Save item"}
              </button>
              {manualError ? <p className="text-sm text-rose-400">{manualError}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section id="scan-receipts" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <header className="mb-5 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Receipts</p>
          <h2 className="text-lg font-semibold">Scan receipts</h2>
          <p className="text-sm text-slate-400">
            Upload photos or PDFs. We extract totals and line items automatically.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <form onSubmit={handleReceiptUpload} className="space-y-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              />
              <button
                type="submit"
                disabled={!receiptFile || isOcrLoading}
                className="w-full rounded-lg border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-950 disabled:opacity-50"
              >
                {isOcrLoading ? "Scanning..." : "Scan receipt"}
              </button>
            </form>
            {ocrError ? <p className="mt-3 text-sm text-rose-400">{ocrError}</p> : null}
            {ocrResult ? (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Extracted</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Vendor</p>
                    <p>{ocrResult.parsed.vendorName ?? "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p>{ocrResult.parsed.receiptDate ?? "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p>{ocrResult.parsed.total != null ? `$${ocrResult.parsed.total}` : "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">GST</p>
                    <p>{ocrResult.parsed.tax != null ? `$${ocrResult.parsed.tax}` : "Unknown"}</p>
                  </div>
                </div>
                {ocrResult.parsed.items.length ? (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Line items</p>
                    <ul className="mt-2 space-y-2 text-xs text-slate-300">
                      {ocrResult.parsed.items.slice(0, 6).map((item, index) => (
                        <li
                          key={`${item.name}-${index}`}
                          className="flex items-center justify-between"
                        >
                          <span>{item.name}</span>
                          <span>
                            {item.quantity ? `${item.quantity} x ` : ""}
                            {item.unitPrice != null ? `$${item.unitPrice}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer">View raw text</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-400">
                    {ocrResult.text}
                  </pre>
                </details>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Recent scans</p>
            <p className="mt-2 text-sm text-slate-400">
              Keep a short list of recent receipts for reconciliation.
            </p>
            <div className="mt-4">
              {receipts.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Receipt</p>
                      <p className="mt-1 font-semibold">
                        {receipt.vendorName ?? "Unknown vendor"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(receipt.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-emerald-300">
                        {receipt.total != null ? `$${receipt.total}` : "Total pending"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No receipts uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
      </>
      ) : null}

      {activeTab === "view" ? (
      <section id="inventory-list" className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <header className="mb-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Inventory list</p>
          <h2 className="text-lg font-semibold">Review stock levels</h2>
          <p className="text-sm text-slate-400">
            See what’s on hand across all locations. Adjustments will appear here next.
          </p>
        </header>
        {inventoryError ? <p className="text-sm text-rose-400">{inventoryError}</p> : null}
        {isInventoryLoading ? (
          <p className="text-sm text-slate-400">Loading inventory...</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">On hand</th>
                  <th className="px-4 py-3">Unit cost</th>
                  <th className="px-4 py-3">Sell price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {inventoryItems.length ? (
                  inventoryItems.map((item) => (
                    <tr key={item.id} className="bg-slate-950/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-100">{item.name}</p>
                        {item.vendorName ? (
                          <p className="text-xs text-slate-500">{item.vendorName}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{item.sku ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{item.totalOnHand}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.unitCost != null ? `$${item.unitCost}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.sellPrice != null ? `$${item.sellPrice}` : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                      No inventory items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}

    </div>
  );
}
