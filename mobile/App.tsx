import { useEffect, useMemo, useState } from "react";
import {
  Linking as NativeLinking,
  NativeModules,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ComponentType, ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { WebView } from "react-native-webview";
import {
  completeTerminalPaymentIntent,
  createTerminalConnectionToken,
  createTerminalPaymentIntent,
  getTerminalSale,
  type SparkDeskApiConfig,
  type TerminalSaleSummary,
} from "./src/api/sparkdesk";

type TerminalReader = { id: string; label?: string };

type TerminalRuntime = {
  StripeTerminalProvider: ComponentType<{
    tokenProvider: () => Promise<string>;
    logLevel?: "none" | "verbose";
    children: ReactNode;
  }>;
  useStripeTerminal: (props?: {
    onUpdateDiscoveredReaders?: (readers: TerminalReader[]) => void;
  }) => {
    initialize: () => Promise<{ error?: { message?: string } }>;
    discoverReaders: (params: {
      discoveryMethod: "tapToPay";
      simulated?: boolean;
      locationId?: string;
    }) => Promise<{ error?: { message?: string } }>;
    connectReader: (
      params: { reader: TerminalReader; locationId?: string },
      discoveryMethod: "tapToPay"
    ) => Promise<{ error?: { message?: string } }>;
    retrievePaymentIntent: (
      clientSecret: string
    ) => Promise<{ paymentIntent?: { id: string }; error?: { message?: string } }>;
    collectPaymentMethod: (params: {
      paymentIntent: { id: string };
      enableCustomerCancellation?: boolean;
    }) => Promise<{ paymentIntent?: { id: string }; error?: { message?: string } }>;
    confirmPaymentIntent: (params: {
      paymentIntent: { id: string };
    }) => Promise<{ paymentIntent?: { id: string }; error?: { message?: string } }>;
    connectedReader?: TerminalReader | null;
  };
};

const getTerminalRuntime = (): TerminalRuntime | null => {
  if (!NativeModules?.StripeTerminalReactNative) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@stripe/stripe-terminal-react-native");
    return {
      StripeTerminalProvider: mod.StripeTerminalProvider,
      useStripeTerminal: mod.useStripeTerminal,
    } as TerminalRuntime;
  } catch {
    return null;
  }
};

const terminalRuntime = getTerminalRuntime();
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://app.sparkdesk.com.au").replace(/\/$/, "");
const DISABLE_ZOOM_JS = `
  (function() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    document.documentElement.style.webkitTextSizeAdjust = '100%';
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
    document.addEventListener('touchmove', function(e) {
      if (e.scale && e.scale !== 1) e.preventDefault();
    }, { passive: false });
  })();
  true;
`;

const parseDeepLink = (url: string | null) => {
  if (!url) return null;
  const parsed = Linking.parse(url);
  const saleId = typeof parsed.queryParams?.saleId === "string" ? parsed.queryParams.saleId.trim() : "";
  const token = typeof parsed.queryParams?.token === "string" ? parsed.queryParams.token.trim() : "";
  if (!saleId || !token) return null;
  return { saleId, token };
};

export default function App() {
  const [handoff, setHandoff] = useState<{ saleId: string; token: string } | null>(null);

  useEffect(() => {
    const loadInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      const parsed = parseDeepLink(initialUrl);
      if (parsed) setHandoff(parsed);
    };

    void loadInitialUrl();

    const subscription = Linking.addEventListener("url", ({ url }: { url: string }) => {
      const parsed = parseDeepLink(url);
      if (parsed) {
        setHandoff(parsed);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const apiConfig = useMemo<SparkDeskApiConfig | null>(() => {
    if (!handoff?.token) return null;
    return {
      baseUrl: API_BASE_URL,
      handoffToken: handoff.token,
    };
  }, [handoff]);

  const tokenProvider = async () => {
    if (!apiConfig) throw new Error("Missing handoff token.");
    const result = await createTerminalConnectionToken(apiConfig);
    return result.secret;
  };

  const handleWebViewRequest = (url: string) => {
    if (url.startsWith("sparkdesk://")) {
      const parsed = parseDeepLink(url);
      if (parsed) {
        setHandoff(parsed);
      }
      return false;
    }

    if (/^https?:\/\//i.test(url)) {
      return true;
    }

    void NativeLinking.openURL(url).catch(() => undefined);
    return false;
  };

  const showTapToPay = Boolean(handoff);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={showTapToPay ? "light" : "dark"} />

      {!showTapToPay ? (
        <View style={styles.webviewWrap}>
          <WebView
            source={{ uri: API_BASE_URL }}
            style={styles.webview}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            javaScriptEnabled
            domStorageEnabled
            cacheEnabled
            incognito={false}
            bounces={false}
            pullToRefreshEnabled={false}
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={DISABLE_ZOOM_JS}
            onShouldStartLoadWithRequest={(request) => handleWebViewRequest(request.url)}
          />
        </View>
      ) : (
        <View style={styles.tapContainer}>
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>Tap to Pay</Text>
            <TouchableOpacity onPress={() => setHandoff(null)} style={styles.topBarButton}>
              <Text style={styles.topBarButtonText}>Back to app</Text>
            </TouchableOpacity>
          </View>

          {terminalRuntime && apiConfig ? (
            <terminalRuntime.StripeTerminalProvider tokenProvider={tokenProvider} logLevel="verbose">
              <TapToPayScreen apiConfig={apiConfig} saleId={handoff?.saleId ?? ""} terminalRuntime={terminalRuntime} />
            </terminalRuntime.StripeTerminalProvider>
          ) : (
            <View style={styles.warningWrap}>
              <Text style={styles.warningTitle}>Terminal SDK unavailable in this runtime.</Text>
              <Text style={styles.warningText}>Use a native iOS build (not Expo Go).</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

type TapToPayScreenProps = {
  apiConfig: SparkDeskApiConfig;
  saleId: string;
  terminalRuntime: TerminalRuntime;
};

function TapToPayScreen({ apiConfig, saleId, terminalRuntime }: TapToPayScreenProps) {
  const [sale, setSale] = useState<TerminalSaleSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [simulateReader, setSimulateReader] = useState(false);
  const [lastResult, setLastResult] = useState("Ready to collect payment.");
  const [readers, setReaders] = useState<TerminalReader[]>([]);

  const {
    initialize,
    discoverReaders,
    connectReader,
    retrievePaymentIntent,
    collectPaymentMethod,
    confirmPaymentIntent,
    connectedReader,
  } = terminalRuntime.useStripeTerminal({
    onUpdateDiscoveredReaders: setReaders,
  });

  useEffect(() => {
    const loadSale = async () => {
      try {
        const nextSale = await getTerminalSale(apiConfig, saleId);
        setSale(nextSale);
      } catch (error) {
        setLastResult(error instanceof Error ? error.message : "Could not load sale.");
      }
    };

    void loadSale();
  }, [apiConfig, saleId]);

  const runTapPayment = async () => {
    setBusy(true);
    try {
      const initResult = await initialize();
      if (initResult.error) {
        throw new Error(initResult.error.message ?? "Failed to initialize terminal SDK.");
      }

      const discoverResult = await discoverReaders({
        discoveryMethod: "tapToPay",
        simulated: simulateReader,
      });
      if (discoverResult.error) {
        throw new Error(discoverResult.error.message ?? "Reader discovery failed.");
      }

      const reader = readers[0];
      if (!reader) {
        throw new Error("No Tap to Pay reader discovered. Check device/region/account setup.");
      }

      const connectResult = await connectReader({ reader }, "tapToPay");
      if (connectResult.error) {
        throw new Error(connectResult.error.message ?? "Failed to connect reader.");
      }

      const intent = await createTerminalPaymentIntent(apiConfig, saleId);
      if (!intent.clientSecret) {
        throw new Error("Payment intent returned without client secret.");
      }

      const retrieved = await retrievePaymentIntent(intent.clientSecret);
      if (retrieved.error || !retrieved.paymentIntent) {
        throw new Error(retrieved.error?.message ?? "Failed to retrieve payment intent on device.");
      }

      const collected = await collectPaymentMethod({
        paymentIntent: retrieved.paymentIntent,
        enableCustomerCancellation: true,
      });
      if (collected.error || !collected.paymentIntent) {
        throw new Error(collected.error?.message ?? "Card collection failed.");
      }

      const confirmed = await confirmPaymentIntent({
        paymentIntent: collected.paymentIntent,
      });
      if (confirmed.error || !confirmed.paymentIntent) {
        throw new Error(confirmed.error?.message ?? "Payment confirmation failed.");
      }

      const confirmedIntent = confirmed.paymentIntent;
      await completeTerminalPaymentIntent(apiConfig, confirmedIntent.id);
      setSale((current) => (current ? { ...current, status: "paid", reference: confirmedIntent.id } : current));
      setLastResult(`Paid successfully on ${connectedReader?.label ?? connectedReader?.id ?? "reader"}.`);
    } catch (error) {
      setLastResult(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Sale ready</Text>
      <Text style={styles.metaText}>{sale?.jobTitle || "Linked job"}</Text>
      <Text style={styles.metaText}>{sale?.customerName || "Customer"}</Text>
      <Text style={styles.amount}>{sale ? `$${sale.total.toFixed(2)}` : "Loading..."}</Text>

      <TouchableOpacity
        disabled={busy}
        onPress={() => setSimulateReader((prev) => !prev)}
        style={[styles.secondaryButton, busy && styles.buttonDisabled]}
      >
        <Text style={styles.secondaryButtonText}>Simulated reader: {simulateReader ? "ON" : "OFF"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={busy || !sale || sale.status === "paid"}
        onPress={runTapPayment}
        style={[styles.button, (busy || !sale || sale.status === "paid") && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{sale?.status === "paid" ? "Already paid" : busy ? "Processing..." : "Tap & Pay"}</Text>
      </TouchableOpacity>

      <Text style={styles.resultLabel}>Discovered readers</Text>
      <Text style={styles.resultText}>{readers.length ? readers.map((r) => r.label ?? r.id).join(", ") : "None"}</Text>

      <Text style={styles.resultLabel}>Result</Text>
      <Text style={styles.resultText}>{lastResult}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  webviewWrap: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  tapContainer: {
    flex: 1,
    backgroundColor: "#0b1220",
    padding: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topBarTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
  },
  topBarButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topBarButtonText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  panel: {
    backgroundColor: "#111a2d",
    borderWidth: 1,
    borderColor: "#243247",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "700",
  },
  metaText: {
    color: "#cbd5e1",
    fontSize: 13,
  },
  amount: {
    color: "#22c55e",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 2,
  },
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#052e16",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },
  resultLabel: {
    color: "#94a3b8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  resultText: {
    color: "#e2e8f0",
    fontSize: 13,
  },
  warningWrap: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 12,
    padding: 14,
  },
  warningTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  warningText: {
    color: "#cbd5e1",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
