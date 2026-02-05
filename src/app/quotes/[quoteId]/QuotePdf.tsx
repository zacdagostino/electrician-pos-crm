import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type QuoteItem = {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type QuotePdfProps = {
  orgName: string;
  orgLogoUrl?: string | null;
  quoteNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  siteLine1: string;
  siteLine2?: string | null;
  siteSuburb?: string | null;
  siteState?: string | null;
  sitePostcode?: string | null;
  status: string;
  items: QuoteItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  notes?: string | null;
  blocks: Array<{ type: string }>;
  createdAt: string;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#0f172a" },
  section: { marginBottom: 16 },
  heading: { fontSize: 18, fontWeight: 700 },
  subheading: { fontSize: 12, fontWeight: 600, marginBottom: 4 },
  label: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#64748b" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 56, height: 56, objectFit: "cover", borderRadius: 8 },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0", paddingBottom: 6 },
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderColor: "#f1f5f9" },
  cellItem: { width: "46%" },
  cellQty: { width: "14%", textAlign: "right" },
  cellUnit: { width: "20%", textAlign: "right" },
  cellTotal: { width: "20%", textAlign: "right" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  muted: { color: "#64748b" },
});

const formatAddress = (props: QuotePdfProps) =>
  [props.siteLine1, props.siteLine2, props.siteSuburb, props.siteState, props.sitePostcode]
    .filter(Boolean)
    .join(", ");

export default function QuotePdf(props: QuotePdfProps) {
  const blocks = props.blocks.length ? props.blocks : [{ type: "header" }, { type: "customer" }, { type: "items" }, { type: "totals" }, { type: "notes" }, { type: "footer" }];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {blocks.map((block, index) => {
          switch (block.type) {
            case "header":
              return (
                <View key={`${block.type}-${index}`} style={styles.section}>
                  <View style={styles.headerRow}>
                    <View>
                      <Text style={styles.label}>{props.orgName}</Text>
                      <Text style={styles.heading}>Quote</Text>
                    </View>
                    {props.orgLogoUrl ? (
                      <View style={styles.logoBox}>
                        <Image src={props.orgLogoUrl} style={styles.logo} />
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.row, { marginTop: 8 }]}>
                    <Text style={styles.muted}>Quote ID</Text>
                    <Text>{props.quoteNumber}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.muted}>Status</Text>
                    <Text>{props.status}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.muted}>Created</Text>
                    <Text>{props.createdAt}</Text>
                  </View>
                </View>
              );
            case "customer":
              return (
                <View key={`${block.type}-${index}`} style={styles.section}>
                  <Text style={styles.subheading}>Customer</Text>
                  <Text>{props.customerName}</Text>
                  {props.customerEmail ? <Text style={styles.muted}>{props.customerEmail}</Text> : null}
                  {props.customerPhone ? <Text style={styles.muted}>{props.customerPhone}</Text> : null}
                  <Text style={[styles.muted, { marginTop: 6 }]}>Site address</Text>
                  <Text>{formatAddress(props) || "—"}</Text>
                </View>
              );
            case "items":
              return (
                <View key={`${block.type}-${index}`} style={styles.section}>
                  <Text style={styles.subheading}>Scope of works</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.label, styles.cellItem]}>Item</Text>
                    <Text style={[styles.label, styles.cellQty]}>Qty</Text>
                    <Text style={[styles.label, styles.cellUnit]}>Unit</Text>
                    <Text style={[styles.label, styles.cellTotal]}>Line total</Text>
                  </View>
                  {props.items.map((item, rowIndex) => (
                    <View key={`${item.name}-${rowIndex}`} style={styles.tableRow}>
                      <View style={styles.cellItem}>
                        <Text>{item.name}</Text>
                        {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
                      </View>
                      <Text style={styles.cellQty}>{item.quantity}</Text>
                      <Text style={styles.cellUnit}>${item.unitPrice.toFixed(2)}</Text>
                      <Text style={styles.cellTotal}>${item.lineTotal.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              );
            case "totals":
              return (
                <View key={`${block.type}-${index}`} style={styles.section}>
                  <Text style={styles.subheading}>Totals</Text>
                  <View style={styles.totalsRow}>
                    <Text>Subtotal</Text>
                    <Text>${props.subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text>GST</Text>
                    <Text>${props.gstAmount.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.totalsRow, { fontWeight: 700 }]}>
                    <Text>Total</Text>
                    <Text>${props.total.toFixed(2)}</Text>
                  </View>
                </View>
              );
            case "notes":
              return (
                <View key={`${block.type}-${index}`} style={styles.section}>
                  <Text style={styles.subheading}>Notes</Text>
                  <Text>{props.notes ?? "—"}</Text>
                </View>
              );
            case "footer":
              return (
                <View key={`${block.type}-${index}`} style={styles.section}>
                  <Text style={styles.muted}>Thank you for the opportunity to quote.</Text>
                </View>
              );
            default:
              return null;
          }
        })}
      </Page>
    </Document>
  );
}
