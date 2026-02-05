type AddressParts = {
  line1?: string | null;
  line2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
};

export const buildAddressString = (parts: AddressParts) =>
  [parts.line1, parts.line2, parts.suburb, parts.state, parts.postcode]
    .filter((value) => value && String(value).trim().length > 0)
    .join(", ");

export const verifyAddressWithGoogle = async (parts: AddressParts) => {
  const address = buildAddressString(parts);
  if (!address) {
    return { ok: true, skipped: true };
  }

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`;
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.features?.length) {
    return { ok: false, error: "Address could not be verified." };
  }
  return { ok: true };
};
