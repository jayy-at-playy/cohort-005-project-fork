// PROTOTYPE — throwaway. Lives only on the `prototype/inbox` branch.
// Answers: "How should the Inbox look and behave?" (wayfinder ticket #5).
//
// Fake Notifications shaped like Knock's in-app FeedItem (what
// `@knocklabs/react-core`'s useNotifications / feed store hands you), held in
// memory. No vendor, no database: reload to reset.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

// ---- Knock-shaped types (subset of @knocklabs/client FeedItem) ----------

export interface KnockActor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface KnockBlock {
  name: "body" | "action_url";
  type: "markdown" | "text";
  content: string;
  rendered: string;
}

export interface KnockFeedItem {
  id: string;
  inserted_at: string;
  seen_at: string | null;
  read_at: string | null;
  archived_at: string | null;
  clicked_at: string | null;
  actors: KnockActor[];
  total_actors: number;
  total_activities: number; // > 1 when Knock's batch function grouped events
  blocks: KnockBlock[];
  data: Record<string, string | number | boolean | null>;
  source: { key: WorkflowKey; categories: Category[] };
}

export interface KnockFeedMeta {
  total_count: number;
  unread_count: number;
  unseen_count: number;
}

// The five v1 Notification Triggers (decision ticket #3), as Knock workflow keys.
export type WorkflowKey =
  | "lesson-reply"
  | "lesson-question"
  | "refund-approved"
  | "refund-declined"
  | "seat-claimed";

export type Category = "learning" | "teaching" | "purchases";

export const CATEGORY_LABEL: Record<Category, string> = {
  learning: "Learning",
  teaching: "Teaching",
  purchases: "Purchases & Team",
};

// ---- Fake data ----------------------------------------------------------

const people = {
  sarah: { id: "2", name: "Sarah Chen", avatar: null },
  marcus: { id: "3", name: "Marcus Johnson", avatar: null },
  emma: { id: "5", name: "Emma Wilson", avatar: null },
  james: { id: "6", name: "James Park", avatar: null },
  olivia: { id: "7", name: "Olivia Martinez", avatar: null },
  liam: { id: "8", name: "Liam Thompson", avatar: null },
  bossy: { id: "9", name: "Bossy McBossface", avatar: null },
} satisfies Record<string, KnockActor>;

const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();

let nextId = 100;

function item(
  key: WorkflowKey,
  body: string,
  url: string,
  actors: KnockActor[],
  data: KnockFeedItem["data"],
  opts: { ago: number; seen?: boolean; read?: boolean; activities?: number }
): KnockFeedItem {
  const categories: Category[] =
    key === "lesson-reply"
      ? ["learning"]
      : key === "lesson-question"
        ? ["teaching"]
        : ["purchases"];
  const at = minutesAgo(opts.ago);
  return {
    id: String(nextId++),
    inserted_at: at,
    seen_at: opts.seen || opts.read ? at : null,
    read_at: opts.read ? at : null,
    archived_at: null,
    clicked_at: null,
    actors,
    total_actors: actors.length,
    total_activities: opts.activities ?? 1,
    blocks: [
      { name: "body", type: "markdown", content: body, rendered: body },
      { name: "action_url", type: "text", content: url, rendered: url },
    ],
    data,
    source: { key, categories },
  };
}

const TS = "/courses/introduction-to-typescript";

function seedFeed(): KnockFeedItem[] {
  return [
    item(
      "lesson-reply",
      "**Sarah Chen** replied to your question on *Generics Basics*",
      `${TS}/lessons/11#comment-42`,
      [people.sarah],
      {
        course: "Introduction to TypeScript",
        lesson: "Generics Basics",
        actor_is_instructor: true,
        excerpt:
          "Good catch — the constraint goes on the type parameter, not the argument. Try `<T extends { id: string }>`.",
      },
      { ago: 4 }
    ),
    item(
      "lesson-question",
      "**Emma Wilson** asked a question on *Utility Types*",
      `/instructor/questions`,
      [people.emma],
      {
        course: "Introduction to TypeScript",
        lesson: "Utility Types",
        excerpt: "Why does Partial<T> not go deep into nested objects?",
      },
      { ago: 22 }
    ),
    item(
      "lesson-question",
      "**James Park** asked a question on *Generic Constraints*",
      `/instructor/questions`,
      [people.james],
      {
        course: "Introduction to TypeScript",
        lesson: "Generic Constraints",
        excerpt: "Can a constraint reference another type parameter?",
      },
      { ago: 48 }
    ),
    item(
      "lesson-question",
      "**Olivia Martinez** asked a question on *Utility Types*",
      `/instructor/questions`,
      [people.olivia],
      {
        course: "Introduction to TypeScript",
        lesson: "Utility Types",
        excerpt: "When would I reach for Pick over Omit?",
      },
      { ago: 70 }
    ),
    item(
      "seat-claimed",
      "**Liam Thompson** claimed a Seat on *Building REST APIs with Node.js*",
      `/team`,
      [people.liam],
      {
        course: "Building REST APIs with Node.js",
        seats_claimed: 5,
        seats_total: 8,
      },
      { ago: 95, seen: true }
    ),
    item(
      "refund-declined",
      "Your Refund Request for *Design Systems with Tailwind* was **declined**",
      `/settings#refunds`,
      [people.bossy],
      {
        course: "Design Systems with Tailwind",
        note: "The course was more than 50% complete at the time of the request.",
      },
      { ago: 60 * 26, seen: true }
    ),
    item(
      "lesson-reply",
      "**Marcus Johnson** replied to your question on *Primitive Types*",
      `${TS}/lessons/5#comment-17`,
      [people.marcus],
      {
        course: "Introduction to TypeScript",
        lesson: "Primitive Types",
        actor_is_instructor: false,
        excerpt: "I had the same issue, turning on strictNullChecks fixed it.",
      },
      { ago: 60 * 30, read: true }
    ),
    item(
      "refund-approved",
      "Your Refund Request for *Practical Data Visualisation* was **approved**",
      `/settings#refunds`,
      [people.bossy],
      {
        course: "Practical Data Visualisation",
        note: "Refunded in full. Your Enrollment has ended.",
        ended: "Enrollment",
      },
      { ago: 60 * 24 * 4, read: true }
    ),
    item(
      "seat-claimed",
      "**Olivia Martinez** claimed a Seat on *Building REST APIs with Node.js*",
      `/team`,
      [people.olivia],
      {
        course: "Building REST APIs with Node.js",
        seats_claimed: 4,
        seats_total: 8,
      },
      { ago: 60 * 24 * 6, read: true }
    ),
  ];
}

// What "Fire a Notification" cycles through.
const incoming: (() => KnockFeedItem)[] = [
  () =>
    item(
      "lesson-reply",
      "**Sarah Chen** replied to your question on *Utility Types*",
      `${TS}/lessons/14#comment-77`,
      [people.sarah],
      {
        course: "Introduction to TypeScript",
        lesson: "Utility Types",
        actor_is_instructor: true,
        excerpt: "Partial is shallow on purpose; see DeepPartial in the notes.",
      },
      { ago: 0 }
    ),
  () =>
    item(
      "seat-claimed",
      "**James Park** claimed a Seat on *Building REST APIs with Node.js*",
      `/team`,
      [people.james],
      {
        course: "Building REST APIs with Node.js",
        seats_claimed: 6,
        seats_total: 8,
      },
      { ago: 0 }
    ),
  () =>
    item(
      "lesson-question",
      "**Liam Thompson** asked a question on *Function Types*",
      `/instructor/questions`,
      [people.liam],
      {
        course: "Introduction to TypeScript",
        lesson: "Function Types",
        excerpt: "Is there a way to type an overloaded arrow function?",
      },
      { ago: 0 }
    ),
  () =>
    item(
      "refund-approved",
      "Your Refund Request for *Shipping with Docker and Kubernetes* was **approved**",
      `/settings#refunds`,
      [people.bossy],
      {
        course: "Shipping with Docker and Kubernetes",
        note: "",
        ended: "3 Unclaimed Seats",
      },
      { ago: 0 }
    ),
];

// ---- In-memory store (stands in for Knock's feed store) -----------------

export type BadgeCounts = "unseen" | "unread";
export type GroupBy = "person" | "course";

// Triggers whose Announcements a person can switch off (decision ticket #7).
// Refund Request Triggers are always announced.
export type SwitchableTrigger = "lesson-reply" | "lesson-question" | "seat-claimed";
export const SWITCHABLE_TRIGGERS: { key: SwitchableTrigger; name: string }[] = [
  { key: "lesson-reply", name: "Reply to your Lesson Question" },
  { key: "lesson-question", name: "New Lesson Question on your course" },
  { key: "seat-claimed", name: "Seat claimed" },
];

interface FeedContextValue {
  items: KnockFeedItem[]; // not archived, newest first
  archived: KnockFeedItem[];
  meta: KnockFeedMeta;
  badgeCounts: BadgeCounts;
  /** What the badge and tab count show: unread (or unseen) AND announced. */
  badgeCount: number;
  announce: Record<SwitchableTrigger, boolean>;
  setAnnounce: (t: SwitchableTrigger, on: boolean) => void;
  isAnnounced: (i: KnockFeedItem) => boolean;
  setBadgeCounts: (b: BadgeCounts) => void;
  markAsSeen: (ids?: string[]) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  fire: () => void;
  toastsOn: boolean;
  setToastsOn: (b: boolean) => void;
  tabCountOn: boolean;
  setTabCountOn: (b: boolean) => void;
  // Where the person is looking: suppresses toasts (decision ticket #4)
  setListVisible: (who: string, visible: boolean) => void;
  lastEvent: string;
  groupBy: GroupBy;
  setGroupBy: (g: GroupBy) => void;
}

const FeedContext = createContext<FeedContextValue | null>(null);

export function useFakeFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFakeFeed outside FakeFeedProvider");
  return ctx;
}

export function body(i: KnockFeedItem) {
  return i.blocks.find((b) => b.name === "body")!.rendered;
}
export function actionUrl(i: KnockFeedItem) {
  return i.blocks.find((b) => b.name === "action_url")!.rendered;
}

/** Tiny markdown: **bold** and *italic* only. */
export function Md({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.startsWith("*") ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export function relTime(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function FakeFeedProvider({ children }: { children: React.ReactNode }) {
  const [all, setAll] = useState<KnockFeedItem[]>(() => seedFeed());
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>("unseen");
  const [toastsOn, setToastsOn] = useState(true);
  const [tabCountOn, setTabCountOn] = useState(true);
  const [lastEvent, setLastEvent] = useState("—");
  const [groupBy, setGroupBy] = useState<GroupBy>("person");
  // "Seat claimed" starts switched off so a silent Notification is in view.
  const [announce, setAnnounceAll] = useState<Record<SwitchableTrigger, boolean>>({
    "lesson-reply": true,
    "lesson-question": true,
    "seat-claimed": false,
  });
  const isAnnounced = (i: KnockFeedItem) =>
    announce[i.source.key as SwitchableTrigger] ?? true;
  const visible = useRef(new Set<string>());
  const navigate = useNavigate();
  const fireIdx = useRef(0);
  const now = () => new Date().toISOString();

  const patch = useCallback(
    (pred: (i: KnockFeedItem) => boolean, f: Partial<KnockFeedItem>, ev: string) => {
      setAll((xs) => xs.map((i) => (pred(i) ? { ...i, ...f } : i)));
      setLastEvent(ev);
    },
    []
  );

  const items = useMemo(() => all.filter((i) => !i.archived_at), [all]);
  const archived = useMemo(() => all.filter((i) => i.archived_at), [all]);
  const meta: KnockFeedMeta = {
    total_count: items.length,
    unread_count: items.filter((i) => !i.read_at).length,
    unseen_count: items.filter((i) => !i.seen_at).length,
  };

  const value: FeedContextValue = {
    items,
    archived,
    meta,
    badgeCounts,
    badgeCount: items.filter(
      (i) => isAnnounced(i) && !(badgeCounts === "unseen" ? i.seen_at : i.read_at)
    ).length,
    announce,
    setAnnounce: (t, on) => setAnnounceAll((a) => ({ ...a, [t]: on })),
    isAnnounced,
    setBadgeCounts,
    markAsSeen: (ids) =>
      patch(
        (i) => !i.seen_at && (!ids || ids.includes(i.id)),
        { seen_at: now() },
        ids ? `markAsSeen(${ids.length})` : "markAllAsSeen"
      ),
    markAsRead: (id) =>
      setAll((xs) => {
        setLastEvent(`markAsRead(${id})`);
        return xs.map((i) =>
          i.id === id
            ? { ...i, read_at: i.read_at ?? now(), seen_at: i.seen_at ?? now(), clicked_at: now() }
            : i
        );
      }),
    markAsUnread: (id) =>
      patch((i) => i.id === id, { read_at: null }, `markAsUnread(${id})`),
    markAllAsRead: () =>
      setAll((xs) => {
        setLastEvent("markAllAsRead");
        return xs.map((i) => ({
          ...i,
          read_at: i.read_at ?? now(),
          seen_at: i.seen_at ?? now(),
        }));
      }),
    archive: (id) =>
      patch((i) => i.id === id, { archived_at: now() }, `markAsArchived(${id})`),
    unarchive: (id) =>
      patch((i) => i.id === id, { archived_at: null }, `markAsUnarchived(${id})`),
    fire: () => {
      const make = incoming[fireIdx.current++ % incoming.length];
      const n = make();
      setAll((xs) => [n, ...xs]);
      setLastEvent(`items.received (${n.source.key})`);
      if (toastsOn && isAnnounced(n) && visible.current.size === 0) {
        toast(<Md text={body(n)} />, {
          duration: 5000,
          action: {
            label: "Open",
            onClick: () => {
              value.markAsRead(n.id);
              navigate(actionUrl(n));
            },
          },
        });
      }
    },
    toastsOn,
    setToastsOn,
    tabCountOn,
    setTabCountOn,
    setListVisible: (who, v) => {
      if (v) visible.current.add(who);
      else visible.current.delete(who);
    },
    lastEvent,
    groupBy,
    setGroupBy,
  };

  // Tab title: "(3) Lesson — Cadence". Route meta rewrites the title on
  // navigation, so re-apply after every location change.
  const location = useLocation();
  const count = value.badgeCount;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\)\s/, "");
    document.title =
      tabCountOn && count > 0 ? `(${count > 9 ? "9+" : count}) ${base}` : base;
  }, [count, tabCountOn, location.pathname]);

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function badgeLabel(n: number) {
  return n > 9 ? "9+" : String(n);
}
