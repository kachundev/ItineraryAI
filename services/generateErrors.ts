/**
 * Client-side failure mapping for generate-itinerary.
 *
 * The Edge Function aborts xAI at UPSTREAM_TIMEOUT_MS (45s). The platform
 * still idle-kills a function that never responds and replaces the body
 * with IDLE_TIMEOUT at 150s. The browser aborts on its own 45s signal so
 * Home never waits for that platform cutoff.
 *
 * @supabase/functions-js@2.90.0 accepts both `signal` and `timeout` on
 * invoke. This client passes `signal` from the AbortController below.
 */

export const CLIENT_GENERATE_TIMEOUT_MS = 45_000;

/** Button copy steps forward while generate is still in flight. The last mark is just before the abort. */
export const GENERATE_LOADING_STAGES_MS = [15_000, 30_000, 40_000] as const;

export const GENERATE_ERROR_CODES = [
  'timeout',
  'IDLE_TIMEOUT',
  'unauthorized',
  'upstream_error',
  'parse_error',
  'invalid_input',
] as const;

export type GenerateErrorCode = (typeof GENERATE_ERROR_CODES)[number];

export const GENERATE_ERROR_TRANSLATION_KEYS: Record<GenerateErrorCode, string> = {
  timeout: 'generate_error_timeout',
  IDLE_TIMEOUT: 'generate_error_idle',
  unauthorized: 'generate_error_unauthorized',
  upstream_error: 'generate_error_upstream',
  parse_error: 'generate_error_parse',
  invalid_input: 'generate_error_invalid',
};

export const GENERATE_MESSAGES: Record<GenerateErrorCode | 'generic', string> = {
  timeout: 'Itinerary generation timed out. Please try again or choose a shorter trip.',
  IDLE_TIMEOUT: 'The planner took too long and the connection closed. Please try again.',
  unauthorized: 'Please sign in again to generate an itinerary.',
  upstream_error: 'The travel planner could not complete this request. Please try again.',
  parse_error: 'The travel planner returned an unreadable itinerary. Please try again.',
  invalid_input: 'Check the destination and dates, then try again.',
  generic: 'Failed to generate itinerary. Please try again.',
};

const KNOWN_CODES = new Set<string>(GENERATE_ERROR_CODES);

export class GenerateItineraryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GenerateItineraryError';
    this.code = code;
  }
}

export function startClientAbort(timeoutMs = CLIENT_GENERATE_TIMEOUT_MS): {
  signal: AbortSignal;
  finish: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    finish() {
      clearTimeout(timer);
    },
  };
}

export type InvokeFailure = {
  code: string | null;
  detail: string | null;
  status: number | null;
};

export async function readInvokeFailure(error: unknown): Promise<InvokeFailure> {
  const context = error && typeof error === 'object'
    ? (error as { context?: unknown }).context
    : undefined;
  const status = isResponseLike(context) ? context.status : null;
  const fromBody = parsePayload(await readBodyText(context));
  let code = fromBody.code;
  let detail = fromBody.detail;

  if (!code && context && typeof context === 'object' && !isResponseLike(context)) {
    const record = context as Record<string, unknown>;
    code = codeFromValue(record.code);
    detail = detail ?? firstString(record.error, record.message);
  }

  if (!code && (status === 401 || status === 403)) code = 'unauthorized';
  if (!code && detail && /IDLE_TIMEOUT/.test(detail)) code = 'IDLE_TIMEOUT';

  const name = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
  const causeName = context && typeof context === 'object' ? (context as { name?: unknown }).name : undefined;
  const abortedCause = causeName === 'AbortError' || causeName === 'TimeoutError';
  if (!code && !abortedCause && (name === 'FunctionsFetchError' || name === 'FunctionsRelayError')) {
    code = 'upstream_error';
  }

  return { code, detail, status };
}

export function resolveGenerateFailure(input: {
  aborted: boolean;
  code: string | null;
  detail: string | null;
}): { code: string; message: string } {
  if (input.aborted) {
    return { code: 'timeout', message: GENERATE_MESSAGES.timeout };
  }

  const code = normalizeCode(input.code, input.detail);
  if (isGenerateErrorCode(code)) {
    return { code, message: GENERATE_MESSAGES[code] };
  }
  return { code, message: GENERATE_MESSAGES.generic };
}

export function failureFromPayload(payload: unknown): { code: string | null; detail: string | null } | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.error !== 'string' || !record.error.trim()) return null;
  return {
    code: codeFromValue(record.code),
    detail: record.error.trim(),
  };
}

export function visibleGenerateMessage(
  err: unknown,
  translate: (key: string) => string | undefined,
): string {
  if (err instanceof GenerateItineraryError) {
    const key = isGenerateErrorCode(err.code) ? GENERATE_ERROR_TRANSLATION_KEYS[err.code] : undefined;
    const translated = key ? translate(key) : undefined;
    if (translated) return translated;
    return err.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return translate('generate_error_generic') || GENERATE_MESSAGES.generic;
}

function isGenerateErrorCode(code: string): code is GenerateErrorCode {
  return KNOWN_CODES.has(code);
}

function normalizeCode(code: string | null, detail: string | null): string {
  if (code && KNOWN_CODES.has(code)) return code;
  if (code === '401' || code === '403') return 'unauthorized';
  if (detail && /IDLE_TIMEOUT/.test(detail)) return 'IDLE_TIMEOUT';
  return code || 'unknown';
}

function codeFromValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value === 401 || value === 403) return 'unauthorized';
  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function isResponseLike(value: unknown): value is Response {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { text?: unknown; status?: unknown };
  return typeof candidate.text === 'function' && typeof candidate.status === 'number';
}

async function readBodyText(source: unknown): Promise<string | null> {
  if (isResponseLike(source)) {
    try {
      return await source.clone().text();
    } catch {
      try {
        return await source.text();
      } catch {
        return null;
      }
    }
  }

  if (source && typeof source === 'object' && 'body' in source) {
    const body = (source as { body?: unknown }).body;
    if (typeof body === 'string') return body;
    if (body instanceof ReadableStream) {
      try {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
        return result;
      } catch {
        return null;
      }
    }
  }

  if (typeof source === 'string') return source;
  return null;
}

function parsePayload(text: string | null): { code: string | null; detail: string | null } {
  if (!text) return { code: null, detail: null };
  const trimmed = text.trim();
  if (!trimmed) return { code: null, detail: null };
  if (trimmed === 'IDLE_TIMEOUT') return { code: 'IDLE_TIMEOUT', detail: null };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      return {
        code: codeFromValue(record.code),
        detail: firstString(record.error, record.message, record.msg),
      };
    }
  } catch {
    if (/IDLE_TIMEOUT/.test(trimmed)) return { code: 'IDLE_TIMEOUT', detail: null };
  }

  return { code: null, detail: trimmed };
}
