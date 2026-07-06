// Tiny in-process pub/sub for SSE. Single-instance dev only — swap to
// Postgres LISTEN/NOTIFY or Redis for multi-instance production.

type Controller = ReadableStreamDefaultController<Uint8Array>;
const channels = new Map<string, Set<Controller>>();
const enc = new TextEncoder();

export function publish(topic: string, payload: unknown) {
  const subs = channels.get(topic);
  if (!subs) return;
  const data = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
  const bytes = enc.encode(data);
  for (const ctrl of subs) {
    try {
      ctrl.enqueue(bytes);
    } catch {
      subs.delete(ctrl);
    }
  }
}

export function subscribe(topic: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let set = channels.get(topic);
      if (!set) {
        set = new Set();
        channels.set(topic, set);
      }
      set.add(controller);

      // initial comment to flush headers
      controller.enqueue(enc.encode(`: connected to ${topic}\n\n`));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // store on the controller so cancel() can clean it
      (controller as Controller & { __hb?: NodeJS.Timeout }).__hb = heartbeat;
    },
    cancel(controller) {
      const set = channels.get(topic);
      set?.delete(controller as Controller);
      const hb = (controller as Controller & { __hb?: NodeJS.Timeout }).__hb;
      if (hb) clearInterval(hb);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
