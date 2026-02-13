export type TerminalCreatePaymentIntentResponse = {
  saleId: string;
  paymentIntentId: string;
  clientSecret: string | null;
};

export type TerminalCompleteResponse = {
  ok: boolean;
  saleId: string;
  paymentIntentId: string;
};

export type TerminalConnectionTokenResponse = {
  secret: string;
};

export type SparkDeskApiConfig = {
  baseUrl: string;
  handoffToken: string;
};

export type TerminalSaleSummary = {
  id: string;
  status: "draft" | "paid" | "refunded" | "void";
  total: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  reference: string | null;
  jobId: string | null;
  jobTitle: string | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

const parseErrorMessage = async (res: Response) => {
  const payload = await res.json().catch(() => ({}));
  const message = payload?.error ? String(payload.error) : `HTTP ${res.status}`;
  return message;
};

const postJson = async <T>(config: SparkDeskApiConfig, path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.handoffToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return (await res.json()) as T;
};

const getJson = async <T>(config: SparkDeskApiConfig, path: string): Promise<T> => {
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.handoffToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return (await res.json()) as T;
};

export const createTerminalConnectionToken = async (
  config: SparkDeskApiConfig
): Promise<TerminalConnectionTokenResponse> => {
  return postJson<TerminalConnectionTokenResponse>(config, "/api/terminal/connection-token", {});
};

export const createTerminalPaymentIntent = async (
  config: SparkDeskApiConfig,
  saleId: string
): Promise<TerminalCreatePaymentIntentResponse> => {
  return postJson<TerminalCreatePaymentIntentResponse>(config, "/api/terminal/payment-intents", {
    saleId,
  });
};

export const completeTerminalPaymentIntent = async (
  config: SparkDeskApiConfig,
  paymentIntentId: string
): Promise<TerminalCompleteResponse> => {
  return postJson<TerminalCompleteResponse>(
    config,
    `/api/terminal/payment-intents/${encodeURIComponent(paymentIntentId)}/complete`,
    {}
  );
};

export const getTerminalSale = async (config: SparkDeskApiConfig, saleId: string): Promise<TerminalSaleSummary> => {
  const payload = await getJson<{ sale: TerminalSaleSummary }>(
    config,
    `/api/terminal/sale?saleId=${encodeURIComponent(saleId)}`
  );
  return payload.sale;
};
