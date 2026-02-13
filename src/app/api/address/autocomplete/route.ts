import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";

type PhotonFeature = {
  properties?: Record<string, string | undefined>;
};

type AddressSuggestion = {
  description: string;
  line1: string;
  suburb: string;
  state: string;
  postcode: string;
};

export const GET = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const input = String(searchParams.get("q") ?? "").trim();

  if (input.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    input
  )}&limit=6&lat=-25.2744&lon=133.7751`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.features) {
    return NextResponse.json({ suggestions: [] });
  }

  const features: PhotonFeature[] = Array.isArray(payload.features) ? payload.features : [];
  const inputHouseMatch = input.match(/^\s*(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\b/);
  const inputHouse = inputHouseMatch ? inputHouseMatch[1] : "";

  const suggestions = features.map((feature): AddressSuggestion | null => {
    const props = feature?.properties ?? {};
    const street = props.street ?? props.name ?? "";
    const house = props.housenumber ?? "";
    const baseLine1 = [house, street].filter(Boolean).join(" ").trim() || props.name || "";
    const shouldInjectHouse =
      Boolean(inputHouse) &&
      Boolean(street) &&
      !house &&
      !baseLine1.toLowerCase().startsWith(inputHouse.toLowerCase());
    const line1 = shouldInjectHouse ? `${inputHouse} ${street}` : baseLine1;
    const suburb = props.city ?? props.town ?? props.village ?? props.suburb ?? "";
    const state = props.state ?? "";
    const postcode = props.postcode ?? "";
    const country = props.country ?? "";
    const countryCode = props.countrycode ?? props.country_code ?? "";
    const description = [line1, suburb, state, postcode].filter(Boolean).join(", ");
    const isAustralia =
      countryCode === "au" ||
      countryCode === "aus" ||
      country.toLowerCase() === "australia";
    if (!isAustralia) return null;
    return { description, line1, suburb, state, postcode };
  });

  return NextResponse.json({
    suggestions: suggestions.filter((suggestion): suggestion is AddressSuggestion =>
      Boolean(suggestion)
    ),
  });
};
