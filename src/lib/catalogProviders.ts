export type CatalogItem = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  imageUrl?: string;
  source: "mock" | "bunnings";
  sourceRef?: string;
};

const mockCatalog: CatalogItem[] = [
  {
    id: "mock-1",
    name: "2.5mm TPS Cable 100m",
    sku: "TPS-2.5-100",
    price: 189.0,
    source: "mock",
  },
  {
    id: "mock-2",
    name: "20A Double Pole RCBO",
    sku: "RCBO-20A-DP",
    price: 89.5,
    source: "mock",
  },
  {
    id: "mock-3",
    name: "Clipsal Iconic Power Point",
    sku: "CLP-ICONIC-PP",
    price: 12.9,
    source: "mock",
  },
];

const searchMockCatalog = async (query: string): Promise<CatalogItem[]> => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return mockCatalog.filter((item) => item.name.toLowerCase().includes(normalized));
};

export const searchCatalog = async (query: string): Promise<CatalogItem[]> => {
  const provider = (process.env.INVENTORY_CATALOG_PROVIDER ?? "mock").toLowerCase();

  if (provider === "bunnings") {
    const { searchBunnings } = await import("./bunnings");
    const items = await searchBunnings(query);
    return items.map((item) => ({
      ...item,
      source: "bunnings",
      sourceRef: item.id,
    }));
  }

  return searchMockCatalog(query);
};
