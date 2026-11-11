// PROTOTYPE — throwaway. The Notifications card on /settings, as decided in
// "Which Notifications can a person switch off, and where?" (#7).
// Switches drive the in-memory fake feed only; nothing is saved.

import { useEffect, useRef, useState } from "react";
import { Switch } from "radix-ui";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { useFakeFeed, type SwitchableTrigger } from "./fake-feed";

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Switch.Root
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <Switch.Thumb
        className={cn(
          "block size-4 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </Switch.Root>
  );
}

function Row({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="cursor-pointer">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </label>
      <Toggle id={id} checked={checked} onChange={onChange} />
    </div>
  );
}

const TRIGGER_ROWS: {
  key: SwitchableTrigger;
  name: string;
  hint: string;
  who: "everyone" | "instructor" | "teamAdmin";
}[] = [
  {
    key: "lesson-reply",
    name: "Reply to your Lesson Question",
    hint: "Someone replies to a Lesson Question you wrote",
    who: "everyone",
  },
  {
    key: "lesson-question",
    name: "New Lesson Question on your course",
    hint: "A Student writes a Lesson Question on one of your courses",
    who: "instructor",
  },
  {
    key: "seat-claimed",
    name: "Seat claimed",
    hint: "A Student claims a Seat on a Team Licence you bought",
    who: "teamAdmin",
  },
];

export function NotificationSettingsCard({
  isInstructor,
  isTeamAdmin,
}: {
  isInstructor: boolean;
  isTeamAdmin: boolean;
}) {
  const feed = useFakeFeed();
  const [savedAt, setSavedAt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showSaved, setShowSaved] = useState(false);

  // Saves as soon as a switch flips; a quiet "Saved" stands in for the write.
  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowSaved(false), 1500);
  }, [savedAt]);
  const save = <T,>(f: (v: T) => void) => (v: T) => {
    f(v);
    setSavedAt(Date.now());
  };

  const triggers = TRIGGER_ROWS.filter(
    (t) =>
      t.who === "everyone" ||
      (t.who === "instructor" && isInstructor) ||
      (t.who === "teamAdmin" && isTeamAdmin)
  );

  return (
    <Card className="mt-8 max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <span
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground transition-opacity",
              showSaved ? "opacity-100" : "opacity-0"
            )}
          >
            <Check className="size-3" /> Saved
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose how new Notifications get your attention while Cadence is open.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="divide-y">
          <Row
            id="show-toasts"
            label="Show toasts"
            hint="A short pop-up in the corner when a Notification arrives"
            checked={feed.toastsOn}
            onChange={save(feed.setToastsOn)}
          />
          <Row
            id="show-tab-count"
            label="Show count in tab title"
            hint={`For example "(3) Cadence"`}
            checked={feed.tabCountOn}
            onChange={save(feed.setTabCountOn)}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold">Announce new Notifications for…</h3>
          <div className="divide-y">
            {triggers.map((t) => (
              <Row
                key={t.key}
                id={`announce-${t.key}`}
                label={t.name}
                hint={t.hint}
                checked={feed.announce[t.key]}
                onChange={save((v: boolean) => feed.setAnnounce(t.key, v))}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Switched off, they still arrive in your Inbox.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
