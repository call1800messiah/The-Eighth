# Fantasy calendar: structured in-game dates

Date: 2026-11-21
Status: draft, awaiting approval

## Intent

In-game dates are free text today: `campaign.date`, `historic_events.date`, and people's `birthday` / `birthyear` / `deathday`. They can't be sorted, checked or computed with: the timeline is ordered by when an entry was *created*, the views append a hard-coded " BF", and the age is computed by splitting the campaign date text. The goal is real dates: a GM (or Claude) enters a date, the app stores something sortable, and everything that shows a date formats it.

Different regions count time differently, so a tenant can have **several calendars at once**, each with its own year length, months (names, lengths), week (length, day names), leap rule and year labelling. Which calendar a date is *shown* in is purely a viewing choice; the stored value is the same.

The calendar logic is a **framework-free TypeScript module**, reused by the Angular app and the MCP server, with thin Angular pieces on top.

## Goals

1. A standalone calendar engine: define calendars, convert between a date's parts and a day number, validate, format, parse, do day/month/year arithmetic, all precision-aware (exact day, month, year).
2. Calendars per tenant, defined in `assets/{tenant}/rules.json`.
3. Every in-game date stored as a day number plus a precision: the campaign date, timeline events, and people's birth and death dates. The timeline sorted by in-game date.
4. A date input component and a display pipe, used wherever those dates are edited and shown; the display calendar chosen per viewer in the app, overridable per field.
5. The MCP server reads and writes these dates through the same engine, so Claude sees "29. Ingerimm 1036 BF" and can write "3. Praios 1010".
6. Existing text dates converted, with anything that can't be converted kept and shown until a GM fixes it, never lost.

## Non-goals (for now)

- A calendar view (month grid, events on days). Separate project later.
- Calendars defined or edited in the database by GMs. Later; storage doesn't change when that comes.
- Fuzzy dates beyond day/month/year precision ("Sommer 1030", "ca. 1000", ranges).
- Holidays, seasons, moons, time of day. The engine's shape must not block adding them.
- `flows.date`, which is a real-world date.
- A separate dead/alive flag. Having a death date stays the way the app knows someone is dead (user decision).

## Anti-goals

- Losing or silently rewriting a GM's existing date text.
- Angular, RxJS or Supabase imports in the engine.
- Year-by-year loops that make far-past dates slow, or conversions wrong for negative years or leap years. Birth years in the data go down to −100,000,000.
- A second stored copy of a date (label, calendar id) that can disagree with the day number.
- Someone who is dead today showing as alive after the change, or the other way round.

## Constraints

- Calendars are static per tenant and known up front (user decision); `rules.json` gets a `calendars` section.
- Schema changes go in a new numbered migration (next free: `018_…`); applied migrations are not edited. The local DB applies new migrations by hand via psql.
- Changed columns that Claude reads need updated `COMMENT`s (`assistant_schema()` hands them to the assistant). The assistant writes people drafts, so its write path must keep working for the new person columns.
- Specs must run in the normal `ng test` run; the suite stays green. The MCP tests (`cd mcp && npm test`, `bash mcp/test/integration.sh`) and DB tests (`bash supabase/tests/run.sh`) stay green too.
- LF line endings.

## Approaches (decided)

Where the engine lives:

1. **Plain TypeScript folder in this repo, imported by path alias.** Chosen. Clean boundary now, nothing to publish or version; moving it into its own package later is a move, not a rewrite.
2. Own npm package and repo. Truly standalone, but every engine change becomes a two-repo publish-and-bump cycle.
3. Angular library (`ng generate library`). Dropped: ng-packagr makes it an Angular package, which works against "pure JS".

Where calendars are defined: `rules.json` (chosen; known up front) vs. a database table with a GM editor (later).

What is stored: **only the day number and its precision** (user decision). Not the calendar a date was entered in, and no readable label alongside. Considered and rejected: storing the entry calendar's id (unneeded once the calendar is a viewing choice), and writing a formatted label for Claude/SQL (a second copy that goes stale; the MCP server formats with the engine instead).

Scope: people's dates and the MCP side were first left for a follow-up, then pulled in (user decision: all in one go).

## Design

### Core model: one shared day line, with precision

Every in-game date is an **`InGameDate { day: number; precision: 'day' | 'month' | 'year' }`**. `day` is an integer on one timeline shared by all of a tenant's calendars; for month or year precision it is the first day of that month or year. A calendar is a way of naming day numbers; each states which day number its year 1, first month, first day falls on (`epochDay`), which ties all calendars together. Consequences:

- Sorting and "days between" are integer operations. A year-only date sorts at the start of its year.
- Showing a date in any calendar is `fromDay(calendar, day)`, formatted to its precision: "29. Ingerimm 1036 BF", "Phex 1027 BF", "1011 BF".
- Day 0 is arbitrary; make it 1. Praios 1 BF in the Aventurian calendar.

Precision is relative to the calendar it was entered in: "Phex 1027" is a month in the Aventurian calendar. Shown in another calendar whose months don't line up, a month- or year-precision date is shown by its first day's month/year in that calendar (builder may mark it, e.g. "ab"). Acceptable for v1 since only one calendar is configured.

Since the day number is the only truth, a calendar definition is how stored dates are *read*. Renaming months, weekdays or suffixes is always safe. Changing a calendar's structure (month lengths, leap rule, `hasYearZero`, `epochDay`) changes how every stored date displays in that calendar: right when correcting a wrong definition, wrong if done by accident. A spec pins a few known Aventurian dates to day numbers, so such a change is a deliberate edit of that spec.

### Engine: `libs/fantasy-calendar/`

Plain TypeScript, no runtime dependencies, public API only through `libs/fantasy-calendar/index.ts`, imported in the app as `@the-eighth/fantasy-calendar` (tsconfig path alias). Pure functions over plain-data calendar definitions; a small immutable date wrapper is fine if it helps (builder's call). It must compile both for the Angular build and for the MCP server's Node build (plain ES modules, no DOM or Node APIs).

Calendar definition (plain JSON, so it can live in `rules.json` now and in a table later):

```ts
interface CalendarDefinition {
  id: string;                  // "aventurian"
  name: string;                // "Aventurischer Kalender"
  epochDay: number;            // day number of year 1, month 0, day 1
  months: MonthDefinition[];
  week: { days: string[]; epochWeekday: number }; // weekday index of epochDay
  leap?: LeapRule;
  era: { suffix: string; beforeSuffix?: string; hasYearZero: boolean };
}
interface MonthDefinition {
  name: string;
  shortName?: string;
  aliases?: string[];          // accepted when parsing, e.g. "Namenloser" for "Namenlose Tage"
  days: number;
  leapDays?: number;           // extra days in a leap year (default 0)
}
interface LeapRule {
  // Ordered divisibility rules on the year number; the last matching rule decides.
  // Gregorian: [{ every: 4, leap: true }, { every: 100, leap: false }, { every: 400, leap: true }]
  rules: { every: number; offset?: number; leap: boolean }[];
}
```

Functions (names indicative):

- `validateCalendar(def)` → list of problems.
- `toDay(def, { year, month?, day? })` → number (missing parts mean the first); `fromDay(def, n)` → `{ year, month, day, weekday }`. Exact for negative years down to at least −10⁹ and for leap years, using cycle arithmetic rather than looping over years.
- `isValidDate`, `daysInMonth`, `daysInYear`, `isLeapYear`.
- `addDays`, `addMonths`, `addYears` (clamping the day to the target month's length), `daysBetween`, `yearOf(def, n)`.
- `format(def, date: InGameDate, style?)` → by precision, as above; before the epoch "12. Rahja 3 v. BF". At least a long and a short style; German "D. Monat YYYY Suffix" is the default.
- `parse(def, text)` → `InGameDate | null`. Accepts `"D. Monat YYYY"`, `"Monat YYYY"` and `"YYYY"`, with loose whitespace, optional suffix or before-suffix ("v. BF"), a leading minus for before-epoch years, case-insensitive month names and aliases. Used by the conversion script and the MCP server; the app input doesn't parse free text.

Year numbering: signed years internally; `era.hasYearZero` decides whether the year before 1 is 0 or −1 (shown as "1 v. BF"). How existing negative years such as `birthyear = -3500` map follows from that choice: −3500 is read as "3500 v. BF".

Weekdays count every day, including intercalary months like the Namenlose Tage, unless DSA canon says otherwise; then add an optional `MonthDefinition.outsideWeek` flag.

Specs live next to the engine (`*.spec.ts`) and run in `ng test` (extend the test `include` if needed). Cover round-trips `fromDay(toDay(x)) == x` over a wide range including large negative years and leap boundaries; a Gregorian definition checked against JavaScript `Date`; the same day number read in two calendars (Aventurian and the Gregorian fixture), since multi-calendar support is a requirement even while only one calendar is configured; parse/format round-trips for all three precisions; every date form found in the existing data.

### Calendars in `rules.json`

```json
"calendars": {
  "default": "aventurian",
  "list": [ { "id": "aventurian", ... } ]
}
```

`Rules` gets a typed `calendars` field. **Both tenants** (`tde5`, and `the-eighth`, the deployed one, whose data is already Aventurian) get the Aventurian calendar as their only calendar and default: 12 × 30 days + 5 Namenlose Tage (alias "Namenloser"), week Windstag … Wassertag, suffix "BF", before "v. BF" (user decision). The Myranian Empire calendar comes later as plain config once the user has its rules. *(Builder's call: the definition is copied into both `rules.json` files, with a spec asserting the copies are identical.)*

Before go-live, check against DSA canon whether there is a year 0 BF and which weekday 1. Praios 1 BF is; both are structural and set how dates read.

### Database: migration `018_structured_dates.sql`

Each in-game date becomes two columns: `<name>_day INTEGER` and `<name>_precision TEXT` with `CHECK (… IN ('day','month','year'))`, both NULL together or both set (a table `CHECK`). The old text is renamed to `<old>_legacy` and kept only for rows that couldn't be converted; the app never writes it except to clear it (NULL) when a real date is saved for that row.

| Table | New | Old column becomes |
|---|---|---|
| `campaign` | `date_day`, `date_precision` | `date` → `date_legacy` |
| `historic_events` | `date_day`, `date_precision` | `date` → `date_legacy` |
| `people` | `birth_day`, `birth_precision` | `birthday` → `birthday_legacy`, `birthyear` → `birthyear_legacy` |
| `people` | `death_day`, `death_precision` | `deathday` → `deathday_legacy` |

- Index on `historic_events (timeline_id, date_day)`.
- **Dead or alive**: a person is dead if `death_day` is set, or, until fixed, `deathday_legacy` is set. Every place that tests `deathday` today (people list, combat overview, story-beat tracker, person summary/view) uses that rule, via one helper on the `Person` model.
- Update the `COMMENT`s on all changed columns (day number on the campaign day line, shown via the tenant calendars in `rules.json`; precision; legacy = unconverted old text). RLS needs no change (no new table; assistant draft writes are row-scoped).
- Check the `mentions` rebuild triggers and any SQL functions (`publish_draft()`, `assistant_schema()`, `assistant_column_values()`) for references to the renamed columns.
- Tests under `supabase/tests/`: columns and checks exist; existing write rules hold for the new columns (GM writes campaign, player can't; assistant can set birth/death on its own draft, not on a published person).

Only the app, the MCP server (people drafts) and the conversion script write these columns; no triggers enforce them.

### Converting existing dates

A one-off script, `scripts/convert-dates.ts` (run with `npx tsx`), using the engine and the tenant's `rules.json`:

- Service-role key. `--dry-run` (default) prints every change and every row it couldn't convert; `--apply` writes.
- `campaign`, `historic_events`: `parse(date_legacy)`; on success write `date_day`/`date_precision`, clear `date_legacy`.
- `people` birth: `birthyear_legacy` plus `birthday_legacy` ("9. Rondra") → exact day; year alone → year precision; on success clear both. In the export all 145 people have a year, 5 a day and month.
- `people` death: `parse(deathday_legacy)`; on success write and clear. In the export most are exact, some month ("Phex 1027") or year ("-1100"), a few not dates at all; the user has since fixed those in the live data. Anything that still doesn't parse stays as legacy text (and the person stays dead).
- Documented in the deploy notes as a step after applying migration 018.

### Angular

- **`CalendarService`** (core, `providedIn: 'root'`): the tenant's calendars from `RulesService`, the default, and the viewer's **display calendar**, an app setting stored per viewer in localStorage (like the sidebar state in `ConfigService`), falling back to the default. Exposed as an observable so a change re-renders dates. Thin wrappers (`format(date, calendarId?)`); no date math of its own. The setting is only offered in the UI once a tenant has more than one calendar.
- **`calendarDate` pipe**: `{{ event.date | calendarDate }}` formats an `InGameDate` in the viewer's display calendar; `{{ date | calendarDate:'myranian' }}` overrides it for one field. Follows a change of the display calendar.
- **Legacy text**: where a date is shown and the structured date is null but legacy text is set, show the legacy text marked as unconverted (e.g. muted with a hint), so the GM sees what to fix.
- **`<app-date-input>`**: a `ControlValueAccessor` (like `app-rich-text-editor`). Value: `InGameDate | null`. A precision choice (day / month / year; builder decides how compact) shows the matching fields: day (number), month (select), year (number) with a before-epoch toggle when the calendar has a `beforeSuffix`. Edits in the viewer's display calendar, with a calendar select on the field (only when more than one calendar exists); switching keeps the same date and redisplays it. Shows the weekday for exact dates. Invalid combinations mark the control invalid rather than rolling over. Empty allowed (required for the campaign). When the row has legacy text, show it next to the input as the starting point.
- **Models/services**: `HistoricEvent.date`, `CampaignData.date`, `Person.birth`, `Person.death` become `InGameDate | null`, each with its legacy text field; `TimelineService`, `CampaignService`, `PeopleService` map them and write the columns (and clear legacy once a date is set).
- **Timeline**: query orders by `date_day` descending, nulls last, then `created_at`; the client-side `orderByCreated` sort goes.
- **People**: `edit-person` replaces the birthday/birthyear/deathday inputs with two `<app-date-input>`s (Geboren, Gestorben); person view and summary use the pipe; filters use the dead helper.
- **Edit forms**: `edit-event`, `edit-campaign`, `edit-person` use `<app-date-input>`. All hard-coded " BF" suffixes go (overview, timeline, person view, person summary, `estimatedAge`); the pipe produces the suffix.
- **`estimatedAge` pipe**: takes the birth `InGameDate`; age = campaign year − birth year via the engine in the default calendar, instead of splitting text. Same wording buckets as today.
- **Backlinks**: `MentionService` builds the "Ereignis" label with the shared formatting.
- Existing specs touching these get updated (timeline/campaign/people services, edit components, pipes, mention service, combat overview, story-beat service, people list); new specs for the service, pipe and input.

### MCP server

- **Build**: the MCP image must include the engine and the tenant's calendar definitions. Today `docker build … mcp` uses `mcp/` as context; change the context (or have `package-for-deploy.*` stage `libs/fantasy-calendar/` and the calendars into the build) so `mcp/src` can import the engine. The tenant comes from the stack's existing tenant setting or a new variable (`mcp/README.md` and `docker-compose.portainer.yml` updated). *(Builder's call how.)*
- **Writing**: `create_person` / `update_draft` keep accepting dates as text: `birth` and `death` replace `birthday`/`birthyear`/`deathday` in the tool schema, each "a date in the campaign calendar: '3. Praios 1010 BF', 'Phex 1027 BF' or '1010 BF'". The server `parse()`s them; an unparseable date is a tool error that says which forms are accepted, never stored as text.
- **Reading**: wherever the tools return people, campaign or timeline rows (`get_entity`, `search_entities`, `query`, the person field list in `entities.ts`), the server adds formatted dates next to (or instead of) the raw `*_day`/`*_precision` columns, in the default calendar. `describe` comments say what the columns mean.
- **Instructions**: the server's `INSTRUCTIONS` text mentions the date format.
- MCP specs and the integration test cover a date round-trip (write text, read formatted) and the error case.

### What's left to the builder

- Exact engine function names and module layout inside `libs/fantasy-calendar/`, and whether to add a small immutable date wrapper.
- Format style details beyond the defaults; how a month/year-precision date is marked when shown in a calendar it wasn't entered in.
- How the lib's specs are wired into `ng test`, and how the MCP build reaches the lib.
- Visual layout of `<app-date-input>`, its precision control and the legacy-text marker; where the display-calendar setting sits once it's needed.

## Follow-ups

- Myranian Empire calendar as config.
- Calendar view; DB-defined calendars; fuzzier dates.
- A later migration dropping the `*_legacy` columns once they're empty everywhere.
