"use client";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatM, tierFromBasePrice } from "@/lib/validators";

interface LotData {
  id: string;
  name: string;
  sport: string;
  photoUrl: string | null;
  basePrice: number;
  role: string | null;
  session?: string | null;
  experienceYears?: number;
}

export function AdminLotSpotlight({ initial }: { initial: LotData }) {
  const [lot, setLot] = useState<LotData>(initial);

  // Sync if initial prop changes from Server Component re-render
  useEffect(() => {
    setLot(initial);
  }, [initial]);

  // Real-time SSE Stream Listener
  useEffect(() => {
    const es = new EventSource("/api/auction/stream");
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "ON_BLOCK") {
          setLot((prev) => ({
            ...prev,
            id: payload.playerId ?? prev.id,
            name: payload.name ?? prev.name,
            sport: payload.sport ?? prev.sport,
            photoUrl: payload.photoUrl !== undefined ? payload.photoUrl : prev.photoUrl,
            basePrice: payload.basePrice ?? prev.basePrice,
            role: payload.role !== undefined ? payload.role : prev.role,
            session: payload.session !== undefined ? payload.session : prev.session,
            experienceYears: payload.experienceYears !== undefined ? payload.experienceYears : prev.experienceYears,
          }));
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left min-w-0">
      {/* EXTRA LARGE HIGH-RES AVATAR WITH GLOW RING */}
      <div className="relative shrink-0 animate-spotlight">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-400/50 to-brand-500/50 blur-xl scale-110" />
        <Avatar
          name={lot.name}
          src={lot.photoUrl}
          size={130}
          className="relative !w-[130px] !h-[130px] sm:!w-[150px] sm:!h-[150px] ring-4 ring-gold-400/70 shadow-2xl"
        />
        <span
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full ring-2 ring-pitch-dark flex items-center justify-center text-base shadow-lg"
          style={{ backgroundColor: lot.sport === "CRICKET" ? "#1aae72" : "#f5c542" }}
        >
          {lot.sport === "CRICKET" ? "🏏" : "⚽"}
        </span>
      </div>

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <h3 className="text-2xl sm:text-3xl font-normal text-white truncate drop-shadow-md tracking-tight">
            {lot.name}
          </h3>
          <Badge tone="gold">Tier {tierFromBasePrice(Number(lot.basePrice))}</Badge>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-2 flex-wrap font-normal">
          <span>{lot.sport === "CRICKET" ? "🏏 Cricket" : "⚽ Football"}</span>
          <span>·</span>
          <span className="text-gold-300 font-normal">{lot.role ?? "—"}</span>
          <span>·</span>
          <span className="text-slate-300 font-normal">Session {lot.session || "24-25"}</span>
          {lot.experienceYears !== undefined && lot.experienceYears > 0 && (
            <>
              <span>·</span>
              <span className="text-slate-400 font-normal">⭐ {lot.experienceYears} Yrs Exp</span>
            </>
          )}
        </p>

        <div className="pt-1 flex items-center justify-center sm:justify-start gap-3 text-xs">
          <span className="text-slate-400 font-normal">Starting Price:</span>
          <span className="text-xl font-normal font-display text-gold-300">
            {formatM(Number(lot.basePrice))}
          </span>
        </div>
      </div>
    </div>
  );
}
