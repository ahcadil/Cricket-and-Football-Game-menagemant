"use client";
import { useState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { saveProfileAction } from "@/server/actions/player";
import type { PlayerProfile } from "@prisma/client";

interface Props { profile: PlayerProfile | null }

export function ProfileForm({ profile }: Props) {
  const [sport, setSport] = useState<"CRICKET" | "FOOTBALL">((profile?.sport as "CRICKET" | "FOOTBALL") ?? "CRICKET");
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const locked = profile?.status === "APPROVED" || profile?.status === "ON_AUCTION" || profile?.status === "SOLD";

  return (
    <form
      action={async (fd) => { setBusy(fd.get("submit") === "1" ? "submit" : "draft"); await saveProfileAction(fd); setBusy(null); }}
      className="space-y-6"
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Sport">
          <div className="flex gap-2">
            {(["CRICKET", "FOOTBALL"] as const).map(s => (
              <label key={s} className={`flex-1 cursor-pointer px-4 py-3 rounded-lg ring-1 text-center text-sm ${sport === s ? "bg-brand-500 text-pitch-dark ring-brand-400" : "bg-black/30 ring-white/10 hover:bg-white/5"}`}>
                <input type="radio" name="sport" value={s} className="hidden" checked={sport === s} onChange={() => setSport(s)} disabled={locked} />
                {s === "CRICKET" ? "🏏 Cricket" : "⚽ Football"}
              </label>
            ))}
          </div>
        </Field>

        <Field label="City"><Input name="city" defaultValue={profile?.city ?? ""} placeholder="Mumbai" /></Field>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Date of Birth">
          <Input type="date" name="dob" defaultValue={profile?.dob ? new Date(profile.dob).toISOString().slice(0,10) : ""} />
        </Field>
        <Field label="Phone"><Input name="phone" defaultValue={profile?.phone ?? ""} placeholder="+91…" /></Field>
        <Field label="Experience (years)">
          <Input type="number" name="experienceYears" min={0} max={50} defaultValue={profile?.experienceYears ?? 0} />
        </Field>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Height (cm)"><Input type="number" name="heightCm" min={100} max={250} defaultValue={profile?.heightCm ?? ""} /></Field>
        <Field label="Weight (kg)"><Input type="number" name="weightKg" min={30} max={200} defaultValue={profile?.weightKg ?? ""} /></Field>
        <Field label="Photo URL" hint="Paste a public image URL">
          <Input name="photoUrl" defaultValue={profile?.photoUrl ?? ""} placeholder="https://…" />
        </Field>
      </div>

      {sport === "CRICKET" ? (
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Cricket Role">
            <Select name="cricketRole" defaultValue={profile?.cricketRole ?? ""}>
              <option value="">— select —</option>
              <option value="BAT">Batter</option>
              <option value="BOWL">Bowler</option>
              <option value="AR">All-rounder</option>
              <option value="WK">Wicket-keeper</option>
            </Select>
          </Field>
          <Field label="Batting Style">
            <Select name="battingStyle" defaultValue={profile?.battingStyle ?? ""}>
              <option value="">—</option>
              <option value="Right-hand">Right-hand</option>
              <option value="Left-hand">Left-hand</option>
            </Select>
          </Field>
          <Field label="Bowling Style">
            <Select name="bowlingStyle" defaultValue={profile?.bowlingStyle ?? ""}>
              <option value="">—</option>
              <option value="Right-arm Fast">Right-arm Fast</option>
              <option value="Left-arm Fast">Left-arm Fast</option>
              <option value="Right-arm Medium">Right-arm Medium</option>
              <option value="Left-arm Medium">Left-arm Medium</option>
              <option value="Off Spin">Off Spin</option>
              <option value="Leg Spin">Leg Spin</option>
              <option value="Left-arm Spin">Left-arm Spin</option>
            </Select>
          </Field>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Position">
            <Select name="footballPosition" defaultValue={profile?.footballPosition ?? ""}>
              <option value="">— select —</option>
              <option value="GK">Goalkeeper</option>
              <option value="DEF">Defender</option>
              <option value="MID">Midfielder</option>
              <option value="FWD">Forward</option>
            </Select>
          </Field>
          <Field label="Preferred Foot">
            <Select name="preferredFoot" defaultValue={profile?.preferredFoot ?? ""}>
              <option value="">—</option>
              <option value="LEFT">Left</option>
              <option value="RIGHT">Right</option>
              <option value="BOTH">Both</option>
            </Select>
          </Field>
          <Field label="Jersey Number">
            <Input type="number" name="jerseyNumber" min={1} max={99} defaultValue={profile?.jerseyNumber ?? ""} />
          </Field>
        </div>
      )}

      <Field label="Bio" hint="Tell the auction your story.">
        <Textarea name="bio" defaultValue={profile?.bio ?? ""} maxLength={500} />
      </Field>

      {locked && (
        <p className="text-sm text-gold-400">
          Your profile has been approved — edits are locked. Contact the organizer for changes.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="ghost" disabled={busy !== null || locked}>
          {busy === "draft" ? "Saving…" : "Save Draft"}
        </Button>
        <Button type="submit" name="submit" value="1" variant="gold" disabled={busy !== null || locked}>
          {busy === "submit" ? "Submitting…" : "Submit for Approval"}
        </Button>
      </div>
    </form>
  );
}
