// Shared shape for server-action results. Lets client forms read structured
// errors via React 19's useActionState instead of crashing the dev overlay.

export type ActionState = { ok?: true; error?: string } | null;

export function ok(): ActionState { return { ok: true }; }
export function fail(message: string): ActionState { return { error: message }; }

export async function safeAction(
  fn: () => Promise<void>
): Promise<ActionState> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { error: msg };
  }
}
