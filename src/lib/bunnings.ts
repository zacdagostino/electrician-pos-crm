type BunningsItem = {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  imageUrl?: string;
};

const getBunningsConfig = () => {
  const baseUrl = process.env.BUNNINGS_API_BASE_URL ?? "";
  const apiKey = process.env.BUNNINGS_API_KEY ?? "";
  const keyHeader = process.env.BUNNINGS_API_KEY_HEADER ?? "x-api-key";
  const searchPath = process.env.BUNNINGS_API_SEARCH_PATH ?? "/catalog/search";

  return { baseUrl, apiKey, keyHeader, searchPath };
};

export const searchBunnings = async (query: string): Promise<BunningsItem[]> => {
  const { baseUrl, apiKey, keyHeader, searchPath } = getBunningsConfig();
  if (!baseUrl || !apiKey) {
    throw new Error("Bunnings API not configured");
  }

  const url = new URL(searchPath, baseUrl);
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      [keyHeader]: apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Bunnings API error");
  }

  const payload = (await response.json()) as {
    items?: {
      id?: string;
      name?: string;
      sku?: string;
      price?: number;
      imageUrl?: string;
    }[];
  };

  return (payload.items ?? []).map((item, index) => ({
    id: item.id ?? `${index}`,
    name: item.name ?? "Unnamed item",
    sku: item.sku,
    price: item.price,
    imageUrl: item.imageUrl,
  }));
};
