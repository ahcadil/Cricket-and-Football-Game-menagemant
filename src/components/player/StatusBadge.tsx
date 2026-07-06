import type { PlayerStatus } from "@/lib/enums";
import { Badge } from "@/components/ui/Badge";

export function StatusBadge({ status }: { status: PlayerStatus }) {
  const map: Record<PlayerStatus, { tone: "slate" | "blue" | "gold" | "brand" | "red"; label: string }> = {
    DRAFT:      { tone: "slate", label: "Draft" },
    SUBMITTED:  { tone: "blue",  label: "Pending Review" },
    APPROVED:   { tone: "brand", label: "Approved" },
    REJECTED:   { tone: "red",   label: "Rejected" },
    ON_AUCTION: { tone: "gold",  label: "On Auction" },
    SOLD:       { tone: "brand", label: "Sold" },
    UNSOLD:     { tone: "slate", label: "Unsold" },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
