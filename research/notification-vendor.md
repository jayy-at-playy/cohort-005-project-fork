# Which notification vendor fits Cadence?

Research for issue #2 (parent map: #1 "In-app notifications"). Sources were read on **2026-11-11**. Pricing and limits change often, so check them again before committing to a plan. Anything marked **(unverified)** could not be confirmed from a first-party source during this pass.

## Recommendation

**Novu (cloud, Free plan, EU region)**, with the Inbox built as a **custom shadcn UI on `@novu/react` hooks**. Novu's prebuilt `<Inbox />` is the fallback, not the target.

Why Novu:

1. **It meets both branches of the hard constraint.** The Free plan has 10,000 workflow runs a month, and the core is MIT-licensed and self-hostable. No other candidate offers both.
2. **EU data residency on the Free plan.** Novu is the only candidate where this is confirmed. Knock does not offer it yet (expected by end of 2026). Courier offers it only on Business. SuprSend has an EU region, but which plans include it is unclear. MagicBell's pages don't mention it.
3. **A prebuilt Inbox and a full headless layer from one package.** `@novu/react` exports `<Inbox />` and the hooks `useNotifications`, `useCounts` and `usePreferences`, and `@novu/js` gives framework-agnostic access. The prebuilt Inbox's `appearance.elements` accepts Tailwind classes directly.
4. **Its model matches the map's "Not yet specified" items.** It covers read, seen, archived and snoozed states, primary and secondary actions, `data` and tag-based tabs, digest steps, and per-workflow and per-channel preferences stored by Novu. Email and push can be added later as more steps on the same workflows.
5. **A cheap next tier.** Pro costs $30/month, against $250/month at Knock and $249/month at MagicBell.

**Runner-up: Knock.** It has the most polished headless React layer (`@knocklabs/react-core`), batching, RS256 JWT feed auth with expiry, and unlimited environments on Free. Pick Knock instead if EU residency stops mattering, or once Knock ships its EU region.

### Prebuilt Inbox as-is, or a custom UI on the headless API?

**Build a custom UI on the headless hooks; don't adopt the prebuilt `<Inbox />` as-is.** Reasons:

- The prebuilt component ships its own popover, tabs and preferences views with `nv-` styling. Matching shadcn's Popover/Sheet, Tabs and Badge means overriding almost every element.
- A thin, app-owned `NotificationInbox` built on `useNotifications` and `useCounts` keeps the vendor behind one seam. That makes it easier to swap vendors, fake in Vitest, and later merge Messaging into the same Inbox (issue #1 notes).
- The fallback is cheap. If the prototype (#5) finds the custom build costly, use `<Inbox />` with `appearance.elements` set to Tailwind classes plus `appearance.variables` mapped to the shadcn CSS variables. The same package supports both routes.

## Comparison at a glance

| | Knock | Novu | MagicBell | Courier | SuprSend | Stream (Feeds v3) |
|---|---|---|---|---|---|---|
| Free tier | 10k messages/mo, unlimited environments | 10k workflow runs/mo, 2 environments, 5 workflows, 30-day Inbox retention | 1k deliveries/mo, 1 project | 10k sends/mo | 10k notifications/mo (SuprSend branding in the feed) | 5k activities and 125k API calls/mo |
| First paid tier | $250/mo | $30/mo (Pro) | $249/mo | $0.005/send (Business) | $100/mo | $499/mo (billed annually) |
| Open source / self-host | SDKs are MIT; service is not self-hostable | MIT core, self-hostable (community edition; some Inbox features are cloud-only); Enterprise self-host | No | No | Self-hosting needs an Enterprise licence | No |
| EU residency | Not yet ("by the end of 2026") | Yes, all plans (`eu.api.novu.co`) | Not mentioned | Business and Enterprise only | Per-workspace data region including EU (plan unclear) | Dublin region for Feeds |
| Prebuilt React Inbox | Yes (`@knocklabs/react`) | Yes (`<Inbox />`) | Yes (`FloatingInbox`, `Inbox`) | Yes (`CourierInbox`, popup menu) | Yes (`@suprsend/react`) | **No** (hooks only) |
| Headless hooks | Yes (`@knocklabs/react-core`, `useNotifications`, `useNotificationStore`) | Yes (`useNotifications`, `useCounts`, `usePreferences`, `@novu/js`) | Unclear: `react-headless` no longer in the repo (unverified) | Yes (`useCourier()`) | Yes (`@suprsend/react-core`: `useFeedClient`, `useFeedData`) | Yes (`useAggregatedActivities`, `useNotificationStatus`) |
| Batching / digest | Batch function | Digest step (max 1-day window on Free) | Not found (unverified) | Digest automations | Batch and digest nodes | Feed aggregation (group by target, type, day) |
| Hosted preferences | Yes (categories, workflows, channel types, channels) | Yes (global plus per-workflow per-channel, "critical" workflows) | Yes (category × channel) | Yes (subscription topics, `REQUIRED`) | Yes (category → section → sub-category, per channel) | **No** |
| Real-time | WebSocket | WebSocket | Persistent connection (transport not documented) | WebSocket (`wss://realtime…courier.io`) | WebSocket | WebSocket |
| Feed auth | RS256 JWT (`sub`, `exp`) in "enhanced security mode" | HMAC-SHA256 `subscriberHash` (required in production) | HS256 user JWT | JWT with scopes | ES256 JWT | Server-minted user JWT |
| Email/push later on the same workflow | Yes | Yes | Yes | Yes | Yes | Push only; no email routing |

Stream is out: it has no prebuilt Inbox, no preferences model and no email channel, and it is an activity-feed product rather than a notification orchestrator. MagicBell is the weakest of the orchestrators for Cadence: its free tier is small (1k), its headless story is unclear, and its residency is undocumented.

## Per-vendor detail

### Knock

- **Notification model.** Engagement states are seen, read, interacted and archived; feeds can be filtered by unread, read, seen or archived [K-feeds]. A feed item carries `actors`, `activities`, `total_activities`, `total_actors`, `blocks`, `data`, `source` and `tenant`; the `meta` object holds `unread_count` and `unseen_count`. The list endpoint filters on `status`, `source` (workflow key), `tenant`, `has_tenant`, `workflow_categories`, `archived` and `trigger_data` [K-list]. That supports tabs within one feed, by category or workflow. A batch function groups activity into one item ("3 replies") [K-llms].
- **Preferences.** A per-user `PreferenceSet` covers `categories`, `workflows`, `channel_types` and `channels`, plus tenant and environment defaults. Unset values mean opted in. Knock stores the set and offers a hosted preference centre via signed URL, or a custom one through the API [K-prefs]. There is a React preferences component and a `usePreferences` hook [K-llms].
- **Real-time.** Knock runs a WebSocket service. The React SDK offers cross-tab sync and can drop the connection for inactive tabs [K-react].
- **Server triggering and auth.** From Node, trigger workflows with recipients, actor, data and tenant, and identify users through the API [K-llms]. To secure feeds, turn on enhanced security mode. Your backend then signs an RS256 JWT with `sub` set to the user ID, plus `iat` and `exp`; the SDK default lifetime is 3600 s. No network call is needed, and `onUserTokenExpiring` refreshes the token [K-auth].
- **Dev and test.** Environments are unlimited on Free [K-price]. The test runner offers sandbox mode and skip-delay, and both can also be set on API triggers (`settings.sandbox_mode`) [K-test]. However, **the in-app channel does not support sandbox mode**, so non-production in-app messages are controlled with channel conditions and still count toward usage [K-plans]. There is no official mock for automated tests. For the DevUI user-switcher, mint a token per user and re-key the provider on switch.
- **EU / GDPR.** Knock is GDPR certified, but has no EU region: "We expect to support EU data residency by the end of 2026" [K-plans].
- **Pricing and lock-in.** Free gives 10k messages/mo. Starter costs $250/mo for 50k messages, then $0.005 each. Each in-app delivery counts as a message [K-price]. Workflows are multi-channel, so email can be added later. Workflow limits on Free are **(unverified)**.
- **React packages.** `client`, `react-core`, `react`, `react-native` and `expo`, MIT-licensed. The repo was last committed to on 2026-11-10 [K-gh]. Styling works through `--rnf-` CSS variables, `rnf-` classes, `renderItem`, or replacing the CSS entirely [K-react].

### Novu

- **Notification model.** Supports read, unread, seen, archived and snoozed states, completing primary and secondary actions, and deletion [N-headless]. Each notification has a subject, body and custom `data`, and gets its tags and severity from its workflow. **Tabs** in one Inbox filter by tags, `data` and severity, and `useCounts` returns unread, unseen and total counts per tab [N-tabs]. Digest steps exist, with a maximum window of 1 day on Free [N-limits]. Field names for avatar, actions and redirect are **(unverified)** on a first-party schema page.
- **Preferences.** Three layers: workflow defaults, then subscriber global per channel, then subscriber per-workflow per channel. The most specific layer wins. "Critical" workflows can't be opted out of. Novu stores preferences per environment, and per tenant when a tenant context is set. The prebuilt Inbox has a Preferences view, and the `usePreferences` hook exposes the same data [N-prefs][N-hooks].
- **Real-time.** The client keeps a WebSocket open automatically (`wss://eu.socket.novu.co` in the EU) [N-headless][N-eu].
- **Server triggering and auth.** From Node, `@novu/api` calls `novu.trigger({ workflowId, to: { subscriberId, … }, payload })` and creates subscribers inline. In the EU, set `serverURL: "https://eu.api.novu.co"` [N-sdk]. For Inbox auth, the server computes `subscriberHash = HMAC-SHA256(secretKey, subscriberId)`; this is **mandatory in production** [N-sec]. The hash never expires: it is deterministic per user, unlike a JWT.
- **Dev and test.** Free includes 2 environments (Dev and Prod) [N-price]. There is no official Vitest mock. The self-hosted community edition can serve as a local or CI backend if wanted [N-self]. With the user-switcher, `subscriberId` = Cadence user ID; compute the hash in the root loader and re-key `<NovuProvider>` on switch.
- **EU / GDPR.** The EU region is available on all plans. API keys are bound to their region, and moving regions means contacting sales [N-eu][N-price].
- **Pricing and lock-in.** Free gives 10k runs/mo, **5 workflows**, 30-day Inbox retention, 3 team members, and Novu branding. Pro starts at $30/mo with 30k+ runs, then $1.20 per 1k, and 20 workflows [N-price][N-limits]. Workflows are multi-channel. The MIT core (about 40k stars, last commit on 2026-11-11) is a real exit path. Self-hosting needs MongoDB, Redis and S3, and some Inbox features are cloud-only [N-gh][N-self].
- **Styling.** `appearance` takes `baseTheme`, `variables`, `elements` and `icons`. Element keys accept Tailwind classes, style objects or callbacks, and are found by inspecting `nv-` classes [N-style].

### MagicBell

- **Notification model.** Has read, seen and archived states, with `sent_at`, `read_at` and `seen_at` timestamps, plus custom attributes and per-channel overrides inherited from a broadcast [M-notif]. The Inbox supports categories and filtering [M-inapp]. Grouping or digest: not found **(unverified)**.
- **Preferences.** Category × channel, plus topic subscriptions and delivery schedules. Stored by MagicBell, with a `UserPreferences` component [M-react][M-search].
- **Real-time.** A "persistent connection" whose transport isn't documented [M-inapp].
- **Auth.** HS256 user JWT signed with the project secret, carrying `user_external_id` and/or `user_email` plus `api_key` [M-auth].
- **React.** `@magicbell/react` provides Provider, FloatingInbox, Inbox, InlineNotification, Toast and UserPreferences, styled through CSS custom properties [M-react]. The `magicbell-js` repo no longer contains the `react`/`react-headless` packages its README links to, and the last commit was on 2026-08-03 [M-gh]. Headless support is **(unverified)**.
- **EU.** Not mentioned anywhere **(unverified)**.
- **Pricing.** Free gives 1,000 deliveries/mo and 1 project; Startup costs $249/mo for 50k [M-price]. This is the smallest free tier, and one project means no separate dev and prod.

### Courier

- **Notification model.** Read, unread, opened and archived states, with action buttons [C-inbox]. Feeds have tabs, and each tab filters by `tags`, `status`, `archived` and `from` [C-react]. Digest is done through Automations ("Add to Digest" plus a Digest trigger), with Inbox-level grouping **(unverified)** [C-digest].
- **Preferences.** Subscription topics with an `OPTED_IN`, `OPTED_OUT` or `REQUIRED` default, per-topic channel routing, and tenant layering. Offered as a hosted page or in-app, with a `CourierPreferences` component [C-prefs][C-react].
- **Real-time and auth.** WebSocket. The backend mints a JWT with scopes (`inbox:read:messages`, …), and the client calls `signIn({ userId, jwt })` [C-react][C-eu].
- **React.** `@trycourier/courier-react` v9 provides `CourierInbox`, `CourierInboxPopupMenu`, `CourierToast`, themes, custom views, and the headless `useCourier()` [C-react].
- **Dev and test.** Multiple environments per workspace (Test and Production) [C-digest].
- **EU.** Business and Enterprise only (`api.eu.courier.com`) [C-eu].
- **Pricing.** Free gives 10k sends/mo; Business costs $0.005 per send [C-price]. Whether Inbox messages count as sends is **(unverified)**.

### SuprSend

- **Notification model.** `seen_on`, `read_on`, `interacted_on` and `archived`, plus `is_pinned` and expiry. The message has `header`, `text` (Markdown), `avatar`, `url`, `actions[]` and `tags`. Tabs come from `stores` filtered by tags or category [S-headless]. Batch and digest nodes exist [S-llms].
- **Preferences.** Category → section → sub-category, each defaulting to On, Off or "Can't unsubscribe", with per-channel opt-outs and tenant defaults, plus an embeddable preference centre [S-prefs].
- **Real-time and auth.** WebSocket, with a reachability status. The current web SDK uses an ES256 JWT signed on the backend (HMAC is legacy) [S-headless][S-search].
- **Dev and test.** Every account gets Sandbox, Staging and Production workspaces [S-what].
- **EU.** "Each workspace has a data region, including the EU" [S-what]. The pricing page lists "Custom Data Center Region" as Enterprise-only, so whether EU is on Free is **(unverified)**.
- **Pricing.** Free gives 10k/mo with SuprSend branding in the feed; Essentials costs $100/mo for 50k [S-price]. Self-hosting is Enterprise-licensed only and needs Kubernetes, Postgres, ClickHouse, Redis and NATS [S-self].

### Stream (Activity Feeds v3)

- Notification feeds aggregate items, by default on target, type and day, with up to 100 activities per group. They track `is_seen` and `is_read`, and the unread and unseen counts are capped at 100. `markActivity` marks items, and WebSocket events deliver updates [St-notif].
- React v3 (`@stream-io/feeds-react-sdk`) is **hooks only** and browser-only, so it can't be server-rendered: a constraint for React Router SSR [St-search][St-react].
- Stream has no preferences model and no email or orchestration; only push is mentioned [St-notif].
- The Dublin region is available [St-region]. Free gives 5k activities/mo; Start costs $499/mo, billed annually [St-price].

## Risks to carry into the PRD

1. **Novu Free allows 5 workflows.** Keep the event catalogue (#3/#6) within 5 workflows, or budget $30/mo for Pro (20 workflows). Folding everything into one generic workflow would lose per-workflow preferences.
2. **30-day Inbox retention on Free** affects the "retention" question in the lifecycle section.
3. **`subscriberHash` never expires.** If the hash leaks, it grants long-lived read access to that user's feed. That is acceptable at course scale; Knock and Courier's expiring JWTs are stronger.
4. **Novu's API has changed between generations** (legacy `@novu/notification-center`, then `@novu/react`; `@novu/node`, then `@novu/api`). Use only the current packages, and read only the React (not React Native) hook pages.
5. **Region lock.** Novu API keys are bound to a region. Create the account in EU from the start if EU is wanted.
6. **No vendor offers a first-party Vitest mock.** Put triggering behind an app-owned server module and the Inbox behind an app-owned component, then fake both in tests.

## Sources

- [K-price] https://knock.app/pricing
- [K-plans] https://docs.knock.app/manage-your-account/knock-plans
- [K-feeds] https://docs.knock.app/in-app-ui/feeds/overview
- [K-list] https://docs.knock.app/api-reference/users/feeds/list_items.md
- [K-react] https://docs.knock.app/in-app-ui/react/feed
- [K-auth] https://docs.knock.app/in-app-ui/security-and-authentication
- [K-prefs] https://docs.knock.app/preferences/overview
- [K-test] https://docs.knock.app/send-notifications/testing-workflows.md
- [K-llms] https://docs.knock.app/llms.txt (doc index: batch function, usePreferences, trigger API)
- [K-gh] https://github.com/knocklabs/javascript (`packages/`: client, react-core, react, react-native, expo)
- [N-price] https://novu.co/pricing
- [N-limits] https://docs.novu.co/platform/developer/limits
- [N-headless] https://docs.novu.co/.mintlify/skills/inbox-integration/references/headless-inbox-examples.md
- [N-hooks] https://docs.novu.co/platform/sdks/react/hooks/use-notifications, …/use-counts, …/use-preferences
- [N-tabs] https://docs.novu.co/platform/inbox/configuration/tabs
- [N-style] https://docs.novu.co/.mintlify/skills/inbox-integration/references/branding-and-styling.md
- [N-sec] https://docs.novu.co/.mintlify/skills/inbox-integration/references/security.md
- [N-prefs] https://docs.novu.co/platform/concepts/preferences
- [N-sdk] https://docs.novu.co/platform/sdks/server/typescript
- [N-eu] https://docs.novu.co/platform/additional-resources/security
- [N-self] https://docs.novu.co/community/self-hosting-novu/overview
- [N-gh] https://github.com/novuhq/novu
- [M-price] https://www.magicbell.com/pricing
- [M-react] https://www.magicbell.com/docs/libraries/magicbell-react
- [M-notif] https://www.magicbell.com/docs/primitive/notification
- [M-inapp] https://www.magicbell.com/docs/channels/in_app
- [M-auth] https://www.magicbell.com/docs/api/authentication/user
- [M-search] https://www.magicbell.com/docs/api/reference (User Preferences object)
- [M-gh] https://github.com/magicbell/magicbell-js
- [C-price] https://www.courier.com/pricing
- [C-inbox] https://www.courier.com/docs/platform/inbox/inbox-overview
- [C-react] https://www.courier.com/docs/sdk-libraries/courier-react-web
- [C-prefs] https://www.courier.com/docs/platform/preferences/preferences-overview
- [C-digest] https://www.courier.com/docs/platform/automations/digest
- [C-eu] https://www.courier.com/docs/platform/workspaces/eu-datacenter.md
- [S-price] https://www.suprsend.com/pricing
- [S-what] https://docs.suprsend.com/docs/what-is-suprsend
- [S-headless] https://docs.suprsend.com/docs/headless-inbox
- [S-prefs] https://docs.suprsend.com/docs/guides/preference-guide.md
- [S-self] https://docs.suprsend.com/docs/self-hosted/introduction.md
- [S-llms] https://docs.suprsend.com/llms.txt
- [S-search] https://docs.suprsend.com/docs/inbox-quick-start
- [St-price] https://getstream.io/activity-feeds/pricing/
- [St-notif] https://getstream.io/activity-feeds/docs/react/notification-feeds/
- [St-react] https://getstream.io/activity-feeds/docs/react/
- [St-search] https://getstream.io/activity-feeds/docs/react/contexts-and-hooks/
- [St-region] https://getstream.io/security/faq/
