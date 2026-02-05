import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";

const pickComponent = (components: any[], type: string) =>
  components.find((component) => component.types?.includes(type));

export const GET = async (req: Request) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Address lookup unavailable." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const placeId = String(searchParams.get("placeId") ?? "").trim();

  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId." }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=address_component,formatted_address&key=${apiKey}`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.status !== "OK") {
    return NextResponse.json({ error: "Address lookup failed." }, { status: 400 });
  }

  const components = payload.result?.address_components ?? [];
  const streetNumber = pickComponent(components, "street_number")?.long_name ?? "";
  const route = pickComponent(components, "route")?.long_name ?? "";
  const suburb =
    pickComponent(components, "locality")?.long_name ??
    pickComponent(components, "postal_town")?.long_name ??
    pickComponent(components, "sublocality")?.long_name ??
    "";
  const state = pickComponent(components, "administrative_area_level_1")?.short_name ?? "";
  const postcode = pickComponent(components, "postal_code")?.long_name ?? "";
  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();

  return NextResponse.json({
    address: {
      line1,
      suburb,
      state,
      postcode,
      formatted: payload.result?.formatted_address ?? "",
    },
  });
};
