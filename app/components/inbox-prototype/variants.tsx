// PROTOTYPE — throwaway. Lives only on the `prototype/inbox` branch.
//
// Three variants of the bell, its panel and the Inbox page, switchable via
// `?variant=A|B|C` (floating bar, bottom centre). They disagree on structure:
//   A  Flat feed       — one chronological list; opening the panel clears the badge
//   B  Read to clear   — badge counts unread; rich previews; list + detail page
//   C  Triage          — tabs by category, event icons, "Done" archives (inbox zero)

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  CheckCheck,
  Circle,
  MessageCircleQuestion,
  MessageSquareReply,
  Receipt,
  UsersRound,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { UserAvatar } from "~/components/user-avatar";
import { PrototypeSwitcher } from "~/components/prototype-switcher";
import {
  CATEGORY_LABEL,
  Md,
  actionUrl,
  badgeLabel,
  body,
  relTime,
  useFakeFeed,
  type BadgeCounts,
  type Category,
  type KnockFeedItem,
  type WorkflowKey,
} from "./fake-feed";

export const VARIANTS = {
  A: { name: "Flat feed", badge: "unseen" },
  B: { name: "Read to clear", badge: "unread" },
  C: { name: "Triage by category", badge: "unseen" },
} as const satisfies Record<string, { name: string; badge: BadgeCounts }>;
export type VariantKey = keyof typeof VARIANTS;

export function useVariant(): VariantKey {
  const [params] = useSearchParams();
  const v = params.get("variant");
  return v === "B" || v === "C" ? v : "A";
}

/** Keep `?variant=` on links so the choice survives navigation. */
function useVariantHref() {
  const v = useVariant();
  return (to: string) => {
    const [path, hash] = to.split("#");
    return `${path}${path.includes("?") ? "&" : "?"}variant=${v}${hash ? `#${hash}` : ""}`;
  };
}

// ---- Bell (shared shell; only the panel inside differs) -----------------

export function InboxBell() {
  const v = useVariant();
  const feed = useFakeFeed();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => feed.setBadgeCounts(VARIANTS[v].badge), [v]);
  useEffect(() => {
    feed.setListVisible("panel", open);
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const n =
    feed.badgeCounts === "unseen" ? feed.meta.unseen_count : feed.meta.unread_count;

  // A and C: an open panel marks everything seen, clearing the badge.
  useEffect(() => {
    if (open && VARIANTS[v].badge === "unseen" && feed.meta.unseen_count > 0)
      feed.markAsSeen();
  }, [open, v, feed.meta.unseen_count]);
  const onToggle = () => setOpen(!open);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        title="Notifications"
        className={cn(
          "relative rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          open && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <Bell className="size-5" />
        {n > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {badgeLabel(n)}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-full top-0 z-40 ml-2 w-96 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
          {v === "A" && <PanelA close={() => setOpen(false)} />}
          {v === "B" && <PanelB close={() => setOpen(false)} />}
          {v === "C" && <PanelC close={() => setOpen(false)} />}
        </div>
      )}
    </div>
  );
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2.5">
      <span className="text-sm font-semibold">Notifications</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function SeeAll({ close }: { close: () => void }) {
  const href = useVariantHref();
  return (
    <Link
      to={href("/inbox")}
      onClick={close}
      className="block border-t px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted"
    >
      See all
    </Link>
  );
}

function CaughtUp() {
  return (
    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
      You're all caught up
    </div>
  );
}

function useOpenItem(close?: () => void) {
  const feed = useFakeFeed();
  const navigate = useNavigate();
  const href = useVariantHref();
  return (i: KnockFeedItem) => {
    feed.markAsRead(i.id);
    close?.();
    navigate(href(actionUrl(i)));
  };
}

function ActorAvatar({ i, size = "size-8" }: { i: KnockFeedItem; size?: string }) {
  const a = i.actors[0];
  return (
    <div className="relative shrink-0">
      <UserAvatar name={a.name} avatarUrl={a.avatar} className={size} />
      {i.total_actors > 1 && (
        <span className="absolute -bottom-1 -right-1 rounded-full border bg-background px-1 text-[10px] font-medium">
          +{i.total_actors - 1}
        </span>
      )}
    </div>
  );
}

function InstructorBadge({ i }: { i: KnockFeedItem }) {
  if (!i.data.actor_is_instructor) return null;
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      Instructor
    </span>
  );
}

// ---- Variant A: Flat feed ------------------------------------------------

function RowA({ i, onOpen }: { i: KnockFeedItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-muted",
        !i.read_at && "bg-primary/5"
      )}
    >
      <ActorAvatar i={i} />
      <div className="min-w-0 flex-1">
        <div className="leading-snug">
          <Md text={body(i)} /> <InstructorBadge i={i} />
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {relTime(i.inserted_at)}
        </div>
      </div>
      {!i.read_at && <Circle className="mt-1.5 size-2 shrink-0 fill-primary text-primary" />}
    </button>
  );
}

function PanelA({ close }: { close: () => void }) {
  const feed = useFakeFeed();
  const open = useOpenItem(close);
  const top = feed.items.slice(0, 5);
  return (
    <>
      <PanelHeader>
        <button
          onClick={feed.markAllAsRead}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          title="Mark all as read"
        >
          <CheckCheck className="size-4" />
        </button>
      </PanelHeader>
      <div className="divide-y">
        {top.length === 0 ? (
          <CaughtUp />
        ) : (
          top.map((i) => <RowA key={i.id} i={i} onOpen={() => open(i)} />)
        )}
      </div>
      <SeeAll close={close} />
    </>
  );
}

function PageA() {
  const feed = useFakeFeed();
  const open = useOpenItem();
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const list =
    filter === "archived"
      ? feed.archived
      : filter === "unread"
        ? feed.items.filter((i) => !i.read_at)
        : feed.items;

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <button
          onClick={feed.markAllAsRead}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <CheckCheck className="size-4" /> Mark all as read
        </button>
      </div>
      <div className="mb-3 flex gap-1 border-b">
        {(["all", "unread", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm capitalize",
              filter === f
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground"
            )}
          >
            {f}
            {f === "unread" && feed.meta.unread_count > 0 && ` (${feed.meta.unread_count})`}
          </button>
        ))}
      </div>
      <div className="divide-y rounded-lg border">
        {list.length === 0 && <CaughtUp />}
        {list.map((i) => (
          <div key={i.id} className="group relative">
            <RowA i={i} onOpen={() => open(i)} />
            <div className="absolute right-3 top-3 hidden gap-1 bg-background group-hover:flex">
              {i.read_at ? (
                <IconBtn title="Mark as unread" onClick={() => feed.markAsUnread(i.id)}>
                  <Circle className="size-4" />
                </IconBtn>
              ) : (
                <IconBtn title="Mark as read" onClick={() => feed.markAsRead(i.id)}>
                  <Check className="size-4" />
                </IconBtn>
              )}
              {i.archived_at ? (
                <IconBtn title="Unarchive" onClick={() => feed.unarchive(i.id)}>
                  <ArchiveRestore className="size-4" />
                </IconBtn>
              ) : (
                <IconBtn title="Archive" onClick={() => feed.archive(i.id)}>
                  <Archive className="size-4" />
                </IconBtn>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconBtn(props: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={props.title}
      onClick={(e) => {
        e.stopPropagation();
        props.onClick();
      }}
      className="rounded border bg-background p-1 text-muted-foreground hover:text-foreground"
    >
      {props.children}
    </button>
  );
}

// ---- Variant B: Read to clear -------------------------------------------

function Preview({ i }: { i: KnockFeedItem }) {
  const d = i.data;
  if (i.source.key === "seat-claimed") {
    const pct = (Number(d.seats_claimed) / Number(d.seats_total)) * 100;
    return (
      <div className="mt-1.5">
        <div className="mb-1 text-xs text-muted-foreground">
          {d.seats_claimed} of {d.seats_total} Seats claimed
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }
  const text = d.excerpt ?? d.note;
  if (!text) return null;
  return (
    <div className="mt-1.5 line-clamp-2 border-l-2 pl-2 text-xs text-muted-foreground">
      {String(text)}
    </div>
  );
}

function CourseChip({ i }: { i: KnockFeedItem }) {
  return (
    <span className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {String(i.data.course)}
      {i.data.lesson ? ` › ${i.data.lesson}` : ""}
    </span>
  );
}

function RowB({
  i,
  onOpen,
  selected,
}: {
  i: KnockFeedItem;
  onOpen: () => void;
  selected?: boolean;
}) {
  const feed = useFakeFeed();
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer gap-3 px-4 py-3 text-sm hover:bg-muted",
        selected && "bg-muted"
      )}
    >
      <div className={cn("w-1 shrink-0 rounded-full", !i.read_at && "bg-primary")} />
      <ActorAvatar i={i} />
      <div className="min-w-0 flex-1">
        <div className={cn("leading-snug", i.read_at && "text-muted-foreground")}>
          <Md text={body(i)} /> <InstructorBadge i={i} />
        </div>
        <Preview i={i} />
        <div className="mt-1.5 flex items-center gap-2">
          <CourseChip i={i} />
          <span className="shrink-0 text-xs text-muted-foreground">
            {relTime(i.inserted_at)}
          </span>
        </div>
      </div>
      {!i.read_at && (
        <button
          title="Mark as read"
          onClick={(e) => {
            e.stopPropagation();
            feed.markAsRead(i.id);
          }}
          className="h-fit rounded p-1 text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100"
        >
          <Check className="size-4" />
        </button>
      )}
    </div>
  );
}

function byDay(items: KnockFeedItem[]) {
  const today: KnockFeedItem[] = [];
  const earlier: KnockFeedItem[] = [];
  for (const i of items)
    (Date.now() - new Date(i.inserted_at).getTime() < 86_400_000 ? today : earlier).push(i);
  return [
    ["Today", today],
    ["Earlier", earlier],
  ] as const;
}

function PanelB({ close }: { close: () => void }) {
  const feed = useFakeFeed();
  const open = useOpenItem(close);
  const top = feed.items.slice(0, 5);
  return (
    <>
      <PanelHeader>
        {feed.meta.unread_count > 0 && (
          <button
            onClick={feed.markAllAsRead}
            className="text-xs font-medium text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </PanelHeader>
      {top.length === 0 ? (
        <CaughtUp />
      ) : (
        byDay(top).map(
          ([label, xs]) =>
            xs.length > 0 && (
              <div key={label}>
                <div className="bg-muted/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                {xs.map((i) => (
                  <RowB key={i.id} i={i} onOpen={() => open(i)} />
                ))}
              </div>
            )
        )
      )}
      <SeeAll close={close} />
    </>
  );
}

const ACTION_LABEL: Record<WorkflowKey, string> = {
  "lesson-reply": "Open the reply",
  "lesson-question": "Answer in Questions",
  "refund-approved": "View Refund Request",
  "refund-declined": "View Refund Request",
  "seat-claimed": "View Team",
};

function PageB() {
  const feed = useFakeFeed();
  const open = useOpenItem();
  const [selId, setSelId] = useState<string | null>(feed.items[0]?.id ?? null);
  const sel = feed.items.find((i) => i.id === selId) ?? null;

  return (
    <div className="flex h-full">
      <div className="flex w-[26rem] shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-lg font-bold">
            Inbox{" "}
            {feed.meta.unread_count > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {feed.meta.unread_count} unread
              </span>
            )}
          </h1>
          <button
            onClick={feed.markAllAsRead}
            className="text-xs font-medium text-primary hover:underline"
          >
            Mark all as read
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {feed.items.length === 0 && <CaughtUp />}
          {byDay(feed.items).map(
            ([label, xs]) =>
              xs.length > 0 && (
                <div key={label}>
                  <div className="bg-muted/50 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </div>
                  {xs.map((i) => (
                    <RowB
                      key={i.id}
                      i={i}
                      selected={i.id === selId}
                      onOpen={() => {
                        setSelId(i.id);
                        feed.markAsRead(i.id);
                      }}
                    />
                  ))}
                </div>
              )
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {!sel ? (
          <div className="text-muted-foreground">Select a Notification</div>
        ) : (
          <div className="max-w-xl">
            <div className="mb-4 flex items-center gap-3">
              <ActorAvatar i={sel} size="size-10" />
              <div>
                <div className="font-medium">
                  {sel.actors.map((a) => a.name).join(", ")}{" "}
                  <InstructorBadge i={sel} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(sel.inserted_at).toLocaleString()}
                </div>
              </div>
            </div>
            <p className="mb-3 text-lg leading-snug">
              <Md text={body(sel)} />
            </p>
            <CourseChip i={sel} />
            <div className="my-5 rounded-lg border bg-muted/30 p-4 text-sm">
              <Preview i={sel} />
              {sel.total_activities > 1 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {sel.total_activities} Lesson Questions grouped into this Notification
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => open(sel)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                {ACTION_LABEL[sel.source.key]}
              </button>
              <button
                onClick={() => feed.markAsUnread(sel.id)}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Mark as unread
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Variant C: Triage by category --------------------------------------

const EVENT_ICON: Record<WorkflowKey, React.ReactNode> = {
  "lesson-reply": <MessageSquareReply className="size-4" />,
  "lesson-question": <MessageCircleQuestion className="size-4" />,
  "refund-approved": <Receipt className="size-4" />,
  "refund-declined": <Receipt className="size-4" />,
  "seat-claimed": <UsersRound className="size-4" />,
};

const EVENT_TINT: Record<WorkflowKey, string> = {
  "lesson-reply": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "lesson-question": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "refund-approved": "bg-green-500/15 text-green-600 dark:text-green-400",
  "refund-declined": "bg-red-500/15 text-red-600 dark:text-red-400",
  "seat-claimed": "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

function RowC({ i, onOpen, compact }: { i: KnockFeedItem; onOpen: () => void; compact?: boolean }) {
  const feed = useFakeFeed();
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted">
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", EVENT_TINT[i.source.key])}>
        {EVENT_ICON[i.source.key]}
      </div>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className={cn("truncate", !i.read_at && "font-medium")}>
          <Md text={body(i)} />
        </div>
        {!compact && i.data.excerpt && (
          <div className="truncate text-xs text-muted-foreground">“{String(i.data.excerpt)}”</div>
        )}
      </button>
      <span className="shrink-0 text-xs text-muted-foreground">{relTime(i.inserted_at)}</span>
      {i.archived_at ? (
        <button
          onClick={() => feed.unarchive(i.id)}
          className="shrink-0 rounded border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Undo
        </button>
      ) : (
        <button
          onClick={() => feed.archive(i.id)}
          title="Done"
          className="flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-xs text-muted-foreground opacity-60 hover:text-foreground group-hover:opacity-100"
        >
          <Check className="size-3" /> Done
        </button>
      )}
    </div>
  );
}

function categoriesIn(items: KnockFeedItem[]): Category[] {
  return (["learning", "teaching", "purchases"] as const).filter((c) =>
    items.some((i) => i.source.categories.includes(c))
  );
}

function PanelC({ close }: { close: () => void }) {
  const feed = useFakeFeed();
  const open = useOpenItem(close);
  const cats = categoriesIn(feed.items);
  const [tab, setTab] = useState<Category | "all">("all");
  const list = feed.items
    .filter((i) => tab === "all" || i.source.categories.includes(tab))
    .slice(0, 5);
  return (
    <>
      <PanelHeader>
        <span className="text-xs text-muted-foreground">{feed.items.length} to do</span>
      </PanelHeader>
      {cats.length > 1 && (
        <div className="flex gap-1 border-b px-3 py-1.5">
          {(["all", ...cats] as const).map((c) => {
            const n = feed.items.filter(
              (i) => !i.read_at && (c === "all" || i.source.categories.includes(c))
            ).length;
            return (
              <button
                key={c}
                onClick={() => setTab(c)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs",
                  tab === c ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {c === "all" ? "All" : CATEGORY_LABEL[c]}
                {n > 0 && ` ${n}`}
              </button>
            );
          })}
        </div>
      )}
      {list.length === 0 ? (
        <CaughtUp />
      ) : (
        list.map((i) => <RowC key={i.id} i={i} compact onOpen={() => open(i)} />)
      )}
      <SeeAll close={close} />
    </>
  );
}

function PageC() {
  const feed = useFakeFeed();
  const open = useOpenItem();
  const [showDone, setShowDone] = useState(false);
  const source = showDone ? feed.archived : feed.items;
  const cats = categoriesIn(source);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="flex rounded-md border p-0.5 text-sm">
          <button
            onClick={() => setShowDone(false)}
            className={cn("rounded px-3 py-1", !showDone && "bg-muted font-medium")}
          >
            To do ({feed.items.length})
          </button>
          <button
            onClick={() => setShowDone(true)}
            className={cn("rounded px-3 py-1", showDone && "bg-muted font-medium")}
          >
            Done ({feed.archived.length})
          </button>
        </div>
      </div>
      {source.length === 0 && (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-2 font-medium">
            {showDone ? "Nothing marked done yet" : "Inbox zero. You're all caught up."}
          </div>
        </div>
      )}
      <div className="space-y-6">
        {cats.map((c) => (
          <section key={c}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABEL[c]}
            </h2>
            <div className="divide-y rounded-lg border">
              {source
                .filter((i) => i.source.categories.includes(c))
                .map((i) => (
                  <RowC key={i.id} i={i} onOpen={() => open(i)} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ---- Inbox page switcher -------------------------------------------------

export function InboxPage() {
  const v = useVariant();
  const feed = useFakeFeed();
  useEffect(() => {
    feed.setListVisible("page", true);
    return () => feed.setListVisible("page", false);
  }, []);
  useEffect(() => {
    if (VARIANTS[v].badge === "unseen" && feed.meta.unseen_count > 0)
      feed.markAsSeen();
  }, [v, feed.meta.unseen_count]);
  return v === "A" ? <PageA /> : v === "B" ? <PageB /> : <PageC />;
}

// ---- Prototype controls (inside the floating bar) ------------------------

export function InboxPrototypeBar() {
  const v = useVariant();
  const feed = useFakeFeed();
  const [params, setParams] = useSearchParams();
  // Sidebar links drop ?variant=; restore the last choice after navigating.
  const raw = params.get("variant");
  useEffect(() => {
    if (raw) sessionStorage.setItem("inbox-prototype-variant", raw);
    else {
      const saved = sessionStorage.getItem("inbox-prototype-variant");
      if (saved && saved !== "A") {
        const p = new URLSearchParams(params);
        p.set("variant", saved);
        setParams(p, { replace: true, preventScrollReset: true });
      }
    }
  }, [raw, params]);
  return (
    <PrototypeSwitcher
      current={v}
      variants={Object.entries(VARIANTS).map(([key, x]) => ({ key, name: x.name }))}
    >
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={feed.fire}
          className="rounded-full bg-fuchsia-500 px-2.5 py-0.5 font-medium hover:bg-fuchsia-400"
        >
          + Fire a Notification
        </button>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={feed.toastsOn}
            onChange={(e) => feed.setToastsOn(e.target.checked)}
          />
          toasts
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={feed.tabCountOn}
            onChange={(e) => feed.setTabCountOn(e.target.checked)}
          />
          tab count
        </label>
      </div>
      <div className="font-mono text-[11px] text-white/70">
        badge counts <b className="text-white">{feed.badgeCounts}</b> · unseen{" "}
        {feed.meta.unseen_count} · unread {feed.meta.unread_count} · archived{" "}
        {feed.archived.length} · last: {feed.lastEvent}
      </div>
    </PrototypeSwitcher>
  );
}
