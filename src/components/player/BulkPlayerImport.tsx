"use client";
import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field, Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { bulkImportPlayersAction, type BulkImportResult } from "@/server/actions/bulkPlayer";
import { parsePlayers, CSV_TEMPLATE, MAX_ROWS, TEMPLATE_HEADERS } from "@/lib/bulkPlayers";
import { formatM } from "@/lib/validators";

export function BulkPlayerImport() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState<BulkImportResult, FormData>(
    (prev, fd) => bulkImportPlayersAction(prev, fd),
    null,
  );

  // Live client-side preview using the exact same parser the server runs.
  const preview = useMemo(() => (text.trim() ? parsePlayers(text) : null), [text]);

  const onFile = async (f: File | null) => {
    if (!f) return;
    const content = await f.text();
    setText(content);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arenacast-players-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-gold text-sm">⬆ Bulk Import Players</button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div className="card !p-5 sm:!p-6 max-w-2xl w-full my-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl">Bulk Import Players</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Upload a CSV, or paste rows copied straight from Excel / Google Sheets. Imported players land in the
              <span className="text-slate-200"> Pending</span> queue for you to approve. Max {MAX_ROWS} rows.
            </p>

            {/* success report */}
            {state?.ok ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-brand-500/10 ring-1 ring-brand-500/30 px-4 py-3 text-sm text-brand-200">
                  ✅ Imported <b>{state.imported}</b> player{state.imported === 1 ? "" : "s"}.
                  {state.skipped ? <> · <span className="text-amber-300">{state.skipped} skipped</span></> : null}
                  <div className="mt-1 text-xs text-slate-400">
                    Auto-generated logins use <code>name@{state.emailDomain}</code> · shared password:{" "}
                    <code className="text-slate-200">{state.defaultPassword}</code>
                  </div>
                </div>
                {state.failures && state.failures.length > 0 && (
                  <FailureList failures={state.failures} />
                )}
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => { setText(""); if (fileRef.current) fileRef.current.value = ""; window.location.reload(); }}>Import more</button>
                  <button className="btn-primary" onClick={() => setOpen(false)}>Done</button>
                </div>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="data" value={text} />

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost text-xs">📄 Choose CSV file</button>
                  <button type="button" onClick={downloadTemplate} className="btn-ghost text-xs">⬇ Download template</button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <Field label="CSV / pasted rows">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={TEMPLATE_HEADERS.join(",") + "\nVirat Kohli,CRICKET,,Delhi,BAT,900000,12,,"}
                    className="min-h-[140px] font-mono text-xs"
                  />
                </Field>

                {preview && <PreviewBlock preview={preview} />}

                <Field label="Default password for new accounts" hint="Shared by every imported player — they can change it after first login.">
                  <Input name="password" type="text" required minLength={6} maxLength={100} defaultValue="player123" />
                </Field>

                {state?.error && (
                  <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-sm text-red-300">⚠️ {state.error}</div>
                )}
                {state?.failures && !state.ok && state.failures.length > 0 && (
                  <FailureList failures={state.failures} />
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                  <SubmitButton disabled={!preview || preview.rows.length === 0} count={preview?.rows.length ?? 0} />
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PreviewBlock({ preview }: { preview: ReturnType<typeof parsePlayers> }) {
  if (!preview.headerOk) {
    return (
      <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-sm text-red-300">
        ⚠️ Missing required column(s): <b>{preview.missingColumns.join(", ")}</b>. Header must include at least <code>name</code> and <code>sport</code>.
      </div>
    );
  }
  const okCount = preview.rows.length;
  const errCount = preview.errors.length;
  return (
    <div className="rounded-lg ring-1 ring-white/10 bg-black/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 text-xs border-b border-white/10">
        <span className="text-slate-300">Preview</span>
        <span>
          <span className="text-brand-300">{okCount} ready</span>
          {errCount > 0 && <span className="text-amber-300"> · {errCount} with errors</span>}
        </span>
      </div>
      <div className="max-h-44 overflow-y-auto divide-y divide-white/5 text-xs">
        {preview.rows.slice(0, 50).map((r) => (
          <div key={r.line} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-5 text-center shrink-0">{r.sport === "CRICKET" ? "🏏" : "⚽"}</span>
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt={r.name} className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-gold-400" />
            ) : (
              <span className="w-6 h-6 rounded-full bg-black/40 text-[10px] font-bold flex items-center justify-center shrink-0 text-slate-300">
                {r.name.slice(0, 1)}
              </span>
            )}
            <span className="flex-1 min-w-0 truncate text-slate-200">{r.name}</span>
            {r.photoUrl && <span className="text-[10px] text-brand-300 font-semibold shrink-0">🖼️ Image</span>}
            <span className="text-slate-500 truncate hidden sm:inline">{r.role ?? "—"}</span>
            <span className="text-gold-400 whitespace-nowrap font-semibold">{formatM(r.basePrice)}</span>
          </div>
        ))}
        {preview.errors.slice(0, 50).map((e) => (
          <div key={`e${e.line}`} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/5">
            <span className="w-5 text-center text-red-400">✕</span>
            <span className="flex-1 min-w-0 truncate text-slate-300">L{e.line} {e.name}</span>
            <span className="text-red-300 truncate">{e.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FailureList({ failures }: { failures: { line: number; name: string; reason: string }[] }) {
  return (
    <div className="rounded-lg ring-1 ring-amber-500/30 bg-amber-500/5 overflow-hidden">
      <p className="px-3 py-2 text-xs text-amber-300 border-b border-amber-500/20">{failures.length} row(s) skipped</p>
      <div className="max-h-40 overflow-y-auto divide-y divide-white/5 text-xs">
        {failures.map((f, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5">
            <span className="text-slate-500 whitespace-nowrap">L{f.line}</span>
            <span className="flex-1 min-w-0 truncate text-slate-300">{f.name}</span>
            <span className="text-amber-300/90 truncate">{f.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmitButton({ disabled, count }: { disabled: boolean; count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-primary">
      {pending ? "Importing…" : count > 0 ? `Import ${count} player${count === 1 ? "" : "s"}` : "Import"}
    </button>
  );
}
