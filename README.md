# TodoerApp

A personal productivity app for Android/iOS built with Expo and React Native. TodoerApp turns weekly routines, long-term goals, and one-off events into a single daily schedule, tracks time spent per life area ("attributes"), and rewards completed work with points you can spend in a built-in leisure shop. Optional integrations add AI-generated goal steps / event-prep tasks (via GitHub Models) and Nextcloud calendar/task sync.

## Features

- **Daily schedule (Home)** — auto-generates today's task list from weekly factors, goal steps, and event prep tasks; tracks completion with progress rings per attribute and a Mon–Sun activity strip.
- **Goals** — long-term goals with step breakdowns, target dates, weekly frequency, and per-attribute categorization; steps can be AI-generated.
- **Weekly factors** — recurring weekly commitments (classes, gym, work blocks) with start/end times per weekday.
- **Events with AI prep** — one-off events get AI-generated preparation task plans (logistics, mental, material, communication, review) scheduled in the days before the event.
- **Leisure shop** — completed tasks earn points; define rewards, purchase them with earned points, and redeem purchases.
- **Attributes** — user-editable life areas (Health, Career, Academic, …) with icon and color, used to categorize goals and visualize weekly stats.
- **Weekly stats** — per-day and per-attribute minutes tracked across the week.
- **Notifications** — scheduled task reminders with background refresh (expo-notifications + background fetch).
- **Nextcloud sync** — optional push of events, goals, and daily tasks to a Nextcloud server (CalDAV-style app-password auth).


## Tech Stack

- [Expo SDK 55](https://expo.dev) / React Native 0.83 / React 19
- [expo-router](https://docs.expo.dev/router/introduction/) (file-based routing, typed routes)
- TypeScript (strict)
- AsyncStorage for all local persistence (no backend required)
- expo-notifications + expo-background-fetch / expo-task-manager for reminders
- GitHub Models inference API (optional, for AI features)
- EAS Build / EAS Update

## Folder Structure

```
app/                  # expo-router routes (file = screen)
  index.tsx           # Home: today's schedule
  (tabs)/             # tab routes (goals, weekly, leisure) — thin re-exports of screens/
  events/             # add/view events
  goals/              # add/edit goals, goal steps
  leisure/            # rewards shop: add, edit, purchases, redeem
  settings/           # Nextcloud configuration
components/           # shared components (TaskCard, BottomNav, ui/ primitives)
constants/            # theme tokens (Colors, Type) and shared styles
screens/              # large screen implementations used by routes
services/             # business logic: storage, scheduler, stats, AI, Nextcloud, notifications
assets/images/        # app icon, adaptive icon layers, favicon
app.config.ts         # Expo app config (icons, plugins, env passthrough)
eas.json              # EAS build profiles (development / preview / production)
```

## Installation

```bash
git clone https://github.com/Ed1Che/TodoerApp   # TODO: add repository URL
cd TodoerApp
npm install
```

## Environment Variables

Copy the template and fill in your values (only needed for the AI features):

```bash
cp .env.example .env
```

| Variable | Purpose | Default |
|---|---|---|
| `GITHUB_TOKEN` | GitHub token with access to GitHub Models inference | — (AI features disabled without it) |
| `GITHUB_ENDPOINT` | Models inference endpoint | `https://models.github.ai/inference` |
| `GITHUB_MODEL` | Model ID used for goal/event-prep generation | `openai/gpt-4o-mini` |

Values are read by `app.config.ts` at build/start time and exposed to the app through `expo-constants` (`services/config.ts`). Nextcloud credentials are entered in-app (Settings → Nextcloud) and stored locally, not via env vars.

## Running Locally

```bash
npm start          # expo start (choose a platform from the menu)
npm run android    # start on Android
npm run ios        # start on iOS
npm run web        # start in the browser
```

Note: notifications and background fetch require a development build (`expo-dev-client`); they do not fully work in Expo Go.

## Building

Builds are done with [EAS Build](https://docs.expo.dev/build/introduction/) (profiles in `eas.json`):

```bash
npx eas build --profile development --platform android   # dev client (debug APK)
npx eas build --profile preview --platform android       # internal-distribution APK
npx eas build --profile production --platform android    # production APK
```

Over-the-air updates are configured via `expo-updates` (see `updates.url` in `app.config.ts`).

## Testing

No automated test suite yet (TODO). Available checks:

```bash
npx tsc --noEmit   # typecheck
npm run lint       # ESLint (eslint-config-expo)
```

## Deployment

- **Android**: EAS production profile builds an APK; submit config is stubbed in `eas.json` (`submit.production`). TODO: Play Store submission details.
- **iOS**: bundle identifier is set in `app.config.ts`; TODO: iOS build/submission has not been configured beyond defaults.

## API Documentation

The app has no server of its own. External APIs used:

- **GitHub Models inference** (`services/githubAi.ts`, `services/eventPrepAi.ts`) — chat-completion requests that return structured JSON (goal steps, prep-task plans).
- **Nextcloud** (`services/nextcloudService.ts`) — pushes events/goals/tasks to a user-provided Nextcloud server using an app password.

## Architecture Overview

- **Routing**: expo-router file-based routes in `app/`. Larger screens live in `screens/` and are re-exported by their route files.
- **State/persistence**: no global state library — screens read/write JSON blobs in AsyncStorage through the `storage` service; `storage.initializeDefaults()` seeds keys on first launch (`app/_layout.tsx`).
- **Scheduling**: `services/scheduler.ts` composes the daily task list from weekly factors, goal steps, and event prep tasks.
- **Stats**: `services/statsService.ts` records completed-task minutes per day and per attribute, keyed by ISO week.
- **Theming**: design tokens in `constants/theme.ts` (Colors, Type) and shared styles in `constants/styles.ts`, following the "Serene Logic" design (`docs/design/growth-redesigned.html`).
- **AI**: `githubAi` (goal steps) and `eventPrepAi` (event preparation) call the GitHub Models endpoint configured via env vars; both degrade gracefully when unconfigured.

## Contributing

1. Branch from `main`.
2. Keep `npx tsc --noEmit` and `npm run lint` clean.
3. Follow the existing conventions: PascalCase component files, expo-router route files under `app/`, design tokens from `constants/theme.ts` (no hardcoded hex colors in screens).

## License

TODO: no license file present — add one (the package is currently marked `private`).

## Future Improvements

- Add automated tests (unit tests for `scheduler`, `statsService`, `attributesService`).
- Consolidate the duplicated GitHub Models client logic in `githubAi.ts` and `eventPrepAi.ts`.
- Centralize shared domain types (Goal, DailyTask, …) — several screens/services declare their own local copies.
- Two-way Nextcloud sync (currently push + fetch only).
- iOS build configuration and store submission.
