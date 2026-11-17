export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public uncertain = false,
  ) {
    super(message);
  }
}
let expired: (() => void) | undefined;
export function onSessionExpired(handler: () => void) {
  expired = handler;
  return () => {
    if (expired === handler) expired = undefined;
  };
}
export async function request<T>(
  path: string,
  token?: string,
  options: { method?: string; body?: unknown; key?: string } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`/api/v1${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.key ? { "Idempotency-Key": options.key } : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      signal: controller.signal,
    });
    if (response.status === 401) {
      if (token) expired?.();
      throw new ApiError(
        token
          ? "Your session has expired. Please sign in again."
          : "Email or password is incorrect.",
        401,
      );
    }
    if (response.status === 204 && response.ok) return undefined as T;
    const data: unknown = await response.json().catch(() => null);
    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      typeof data.detail === "string"
        ? data.detail
        : undefined;
    if (!response.ok)
      throw new ApiError(
        detail ||
          (response.status === 403
            ? "You do not have permission to perform this action."
            : response.status >= 500
              ? "The banking service is unavailable. Please try again."
              : "This request could not be completed."),
        response.status,
        !!options.key && response.status >= 500,
      );
    if (data === null) {
      throw new ApiError(
        "The banking service returned an unexpected response. Please try again.",
        response.status,
        !!options.key,
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      options.key
        ? "We could not confirm the result. Keep this window open and retry the same request to avoid a duplicate."
        : "Unable to reach FinCore. Check that the banking API is running and try again.",
      0,
      !!options.key,
    );
  } finally {
    globalThis.clearTimeout(timer);
  }
}
