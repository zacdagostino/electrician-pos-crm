import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type PosSalePdfItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type PosSalePdfProps = {
  orgName: string;
  orgLogoUrl?: string | null;
  saleId: string;
  status: string;
  paymentMethod: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  jobTitle?: string | null;
  subtotal: number;
  gstAmount: number;
  total: number;
  notes?: string | null;
  createdAt: string;
  paidAt?: string | null;
  items: PosSalePdfItem[];
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

export default function PosSalePdf(props: PosSalePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.label}>{props.orgName}</Text>
              <Text style={styles.heading}>Tax invoice / receipt</Text>
            </View>
            {props.orgLogoUrl ? (
              <View style={styles.logoBox}>
                {/* react-pdf Image does not support alt text props */}
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={props.orgLogoUrl} style={styles.logo} />
              </View>
            ) : null}
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Text style={styles.muted}>Sale ID</Text>
            <Text>{props.saleId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Status</Text>
            <Text>{props.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Payment</Text>
            <Text>{props.paymentMethod}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>Created</Text>
            <Text>{props.createdAt}</Text>
          </View>
          {props.paidAt ? (
            <View style={styles.row}>
              <Text style={styles.muted}>Paid</Text>
              <Text>{props.paidAt}</Text>
            </View>
          ) : null}
          {props.jobTitle ? (
            <View style={styles.row}>
              <Text style={styles.muted}>Job</Text>
              <Text>{props.jobTitle}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Customer</Text>
          <Text>{props.customerName}</Text>
          {props.customerEmail ? <Text style={styles.muted}>{props.customerEmail}</Text> : null}
          {props.customerPhone ? <Text style={styles.muted}>{props.customerPhone}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.label, styles.cellItem]}>Item</Text>
            <Text style={[styles.label, styles.cellQty]}>Qty</Text>
            <Text style={[styles.label, styles.cellUnit]}>Unit</Text>
            <Text style={[styles.label, styles.cellTotal]}>Line total</Text>
          </View>
          {props.items.map((item, rowIndex) => (
            <View key={`${item.name}-${rowIndex}`} style={styles.tableRow}>
              <Text style={styles.cellItem}>{item.name}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellUnit}>${item.unitPrice.toFixed(2)}</Text>
              <Text style={styles.cellTotal}>${item.lineTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
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

        <View style={styles.section}>
          <Text style={styles.subheading}>Notes</Text>
          <Text>{props.notes ?? "-"}</Text>
        </View>
      </Page>
    </Document>
  );
}
