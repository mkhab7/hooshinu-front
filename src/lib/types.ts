// TypeScript types mirroring the Hooshinu backend API contract (v1).

export type Locale = "fa" | "en";

export type ApiError = {
  message: string;
  type: string;
};

/** Generic single-resource envelope. */
export type ResourceEnvelope<T> = { data: T };

// ---- Auth ----
export type OtpRequestBody = { phone: string };
export type OtpVerifyBody = { phone: string; code: string };
export type OtpVerifyResponse = { token: string; token_type: "Bearer" };

// ---- Profile ----
export type UserPlan = {
  level: number;
  name: string | null;
  expires_at: string | null;
};

export type User = {
  id: number;
  name: string | null;
  phone: string;
  role: "user" | "admin";
  locale: Locale;
  profession: string | null;
  credits: number;
  plan: UserPlan;
};

export type UpdateProfileBody = {
  name?: string;
  profession?: string | null;
  locale?: Locale;
};

// ---- Models ----
export type ModelCategory = "text" | "image" | "video" | "audio";
export type PricingUnit =
  | "per_token"
  | "per_image"
  | "per_second"
  | "per_video"
  | "per_request";

export type SchemaFieldType =
  | "text"
  | "textarea"
  | "select"
  | "dialogue"
  | "audio_file";

export type SchemaSelectOption = string | { value: string; label: string };

export type SchemaField = {
  name: string;
  label: string;
  type: SchemaFieldType;
  required?: boolean;
  default?: string;
  options?: SchemaSelectOption[];
};

export type AiModel = {
  id: string;
  object: "model";
  owned_by: string;
  name: string;
  category: ModelCategory;
  unit: PricingUnit;
  price: number;
  min_plan_level: number;
  locked: boolean;
  schema?: SchemaField[];
};

export type ModelsResponse = { object: "list"; data: AiModel[] };

// ---- Conversations (persisted chat) ----
export type MessageRole = "system" | "user" | "assistant";

export type ConversationSummary = {
  id: number;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: number;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ChatMessage[];
};

// ---- OpenAI-compatible chat ----
export type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatCompletionMessage = {
  role: MessageRole;
  content: string | ChatContentPart[];
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatCompletionMessage[];
  stream?: boolean;
  web_search?: boolean;
  reasoning_effort?: ReasoningEffort;
};

export type ChatCompletionResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: MessageRole; content: string };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type ChatCompletionChunk = {
  id: string;
  object: "chat.completion.chunk";
  choices: {
    index: number;
    delta: { role?: MessageRole; content?: string };
    finish_reason: string | null;
  }[];
};

// ---- Media generation ----
export type GenerationStatus =
  | "pending"
  | "queued"
  | "processing"
  | "success"
  | "failed";

export type GenerationTask = {
  id: number;
  model: string;
  category: ModelCategory;
  status: GenerationStatus;
  input: Record<string, unknown>;
  results: string[];
  credits_cost: number | null;
  fail_reason: string | null;
  created_at: string;
};

export type CreateGenerationBody = {
  model: string;
  input: Record<string, unknown>;
};

// ---- Wallet / payments / plans ----
export type TransactionType = "topup" | "usage" | "refund" | "bonus";

export type WalletTransaction = {
  id: number;
  type: TransactionType;
  credits: number;
  balance_after: number;
  reference: string | null;
  created_at: string;
};

export type Wallet = {
  credits: number;
  transactions: WalletTransaction[];
};

export type PaymentStatus = "pending" | "paid" | "failed";

export type Payment = {
  id: number;
  amount_toman: number;
  credits: number;
  status: PaymentStatus;
  created_at: string;
};

export type RedirectResponse = { redirect_url: string };

export type Plan = {
  id: number;
  slug: string;
  name: string;
  price_toman: number;
  credits: number;
  level: number;
  duration_days: number;
};

// ---- API keys ----
export type ApiKey = {
  id: number;
  name: string;
  prefix: string;
  revoked: boolean;
  last_used_at: string | null;
  created_at: string;
};

export type CreateApiKeyResponse = {
  data: ApiKey;
  token: string;
};
