import { useState } from "react";
import { useFetcher } from "react-router";
import { Check, Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { noteDraftStatus, type NoteDraftStatus } from "~/modules/lesson-notes";
import { cn, formatRelativeTime } from "~/lib/utils";

export function LessonNote({
  note,
}: {
  note: { body: string; updatedAt: string } | null;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const error = fetcher.data?.error;
  const status = noteDraftStatus(draft, note?.body ?? null);

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <LessonNoteHeader />

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={5}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot down what clicked, what didn't, and what to revisit..."
            aria-label="Your notes"
            className="resize-y"
          />
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !status.canSave}
            >
              {isSaving ? "Saving..." : "Save note"}
            </Button>
            <NoteSaveState
              error={error}
              unsaved={status.unsaved}
              updatedAt={note?.updatedAt}
            />
            <NoteLength status={status} />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteSaveState({
  error,
  unsaved,
  updatedAt,
}: {
  error: string | undefined;
  unsaved: boolean;
  updatedAt: string | undefined;
}) {
  if (error) return <span className="text-sm text-destructive">{error}</span>;
  if (unsaved) {
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  }
  if (!updatedAt) return null;
  return (
    <span
      suppressHydrationWarning
      className="flex items-center gap-1 text-xs text-muted-foreground"
    >
      <Check className="size-3.5 text-green-600" />
      Saved {formatRelativeTime(updatedAt)}
    </span>
  );
}

function LessonNoteHeader() {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-5 text-primary" />
        <h2 className="text-xl font-semibold">Your notes</h2>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Only visible to you
      </span>
    </div>
  );
}

function NoteLength({ status }: { status: NoteDraftStatus }) {
  return (
    <span
      className={cn(
        "ml-auto text-xs",
        status.tooLong ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {status.length} / {status.maxLength}
    </span>
  );
}
