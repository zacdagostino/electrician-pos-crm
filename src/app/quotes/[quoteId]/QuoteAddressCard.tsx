import AddressCard from "@/components/AddressCard";

type QuoteAddressCardProps = {
  siteLine1?: string | null;
  siteLine2?: string | null;
  siteSuburb?: string | null;
  siteState?: string | null;
  sitePostcode?: string | null;
};

export default function QuoteAddressCard({
  siteLine1,
  siteLine2,
  siteSuburb,
  siteState,
  sitePostcode,
}: QuoteAddressCardProps) {
  return (
    <AddressCard
      label="Site address"
      line1={siteLine1}
      line2={siteLine2}
      suburb={siteSuburb}
      state={siteState}
      postcode={sitePostcode}
    />
  );
}
