// Shared shape for server-action results. Lets client forms read structured
// errors via React 19's useActionState instead of crashing the dev overlay.

export type ActionState = { ok?: true; error?: string; message?: string } | null;

export function ok(message?: string): ActionState { return { ok: true, message }; }
export function fail(message: string): ActionState { return { error: message }; }

export async function safeAction<T = any>(
  fn: () => Promise<T>
): Promise<ActionState> {
  try {
    const res = await fn();
    if (res && typeof res === "object" && "message" in res) {
      return { ok: true, message: String((res as any).message) };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: msg };
  }
}
