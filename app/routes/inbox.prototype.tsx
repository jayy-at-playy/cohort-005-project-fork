// PROTOTYPE — throwaway Inbox page ("See all" target). Variants live in
// ~/components/inbox-prototype/variants.tsx; switch with ?variant=A|B|C.
import { InboxPage } from "~/components/inbox-prototype/variants";

export function meta() {
  return [{ title: "Inbox — Cadence" }];
}

export default function Inbox() {
  return <InboxPage />;
}
