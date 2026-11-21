# Fantasy Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every free-text in-game date (campaign date, timeline events, people's birth and death) with a day number + precision on a shared day line, read through framework-free calendar definitions, in the app and the MCP server.

**Architecture:** A pure TypeScript engine in `libs/fantasy-calendar/` (no Angular/Node/DOM imports) does all calendar math. Calendars are JSON in `src/assets/{tenant}/rules.json`. The DB stores `<name>_day BIGINT` + `<name>_precision TEXT`; old text moves to `*_legacy` columns until a one-off script converts it. Angular gets a `CalendarService`, a `calendarDate` pipe, an `<app-in-game-date>` display component and an `<app-date-input>` form control; the MCP server parses text dates on write and formats on read using the same engine.

**Tech Stack:** TypeScript, Angular 22 (Karma/Jasmine), Supabase/Postgres (psql tests), Node MCP server (`node --test` + tsx), tsx for scripts.

**Spec:** `docs/superpowers/specs/2026-11-21-fantasy-calendar-design.md`

## Global Constraints

- Engine: no runtime dependencies; no imports from Angular, RxJS, Supabase, Node or the DOM. Relative imports inside the engine use `.js` extensions (`./types.js`) so it compiles under both the app's `moduleResolution: bundler` and the MCP's `NodeNext` + `strict: true`.
- Engine public API only via `libs/fantasy-calendar/index.ts`; app imports `@the-eighth/fantasy-calendar`.
- Stored truth is `{ day: number, precision: 'day' | 'month' | 'year' }` only — no calendar id, no label column.
- Columns: `<name>_day BIGINT`, `<name>_precision TEXT CHECK (… IN ('day','month','year'))`, both NULL or both set. Old text → `*_legacy`; the app writes legacy only to clear it.
- A person is dead iff `death` is set or `deathLegacy` is set.
- Aventurian calendar is the only calendar and the default in both `src/assets/tde5/rules.json` and `src/assets/the-eighth/rules.json`; the two definitions are identical.
- Aventurian canon used (from Wiki Aventurica "Zeitrechnung"/"Bosparans Fall" and a fan converter; tell the user it's unconfirmed for the weekday): `hasYearZero: true` (0 BF exists; −1 is "1 v. BF"); Namenlose Tage count in the week; week order Windstag, Erdtag, Markttag, Praiostag, Rohalstag, Feuertag, Wassertag; 1. Praios 1 BF is a **Rohalstag** (so 1. Praios 1000 BF is a Markttag).
- Day 0 = 1. Praios 1 BF (`epochDay: 0`).
- Default German long format: `"29. Ingerimm 1036 BF"`, `"Phex 1027 BF"`, `"1011 BF"`, before epoch `"3500 v. BF"`.
- New migration is `supabase/migrations/018_structured_dates.sql`; applied migrations are not edited. Locally apply it by hand with psql.
- `ng test --watch=false --browsers=ChromeHeadless`, `bash supabase/tests/run.sh`, `cd mcp && npm test`, `bash mcp/test/integration.sh` all green at the end. LF line endings.

## Review Focus

1. **Huge negative years** (birth year −100,000,000): `toDay`/`fromDay` must round-trip and stay fast, and `format` must say "100000000 v. BF" — test in Task 1/2.
2. **Year 0 and the v. BF boundary**: day −1 is "5. Namenlose Tage 0 BF", day −366 is "5. Namenlose Tage 1 v. BF"; nothing is off by one year around 0 — Task 1 `boundary around year 0`, Task 2 `format long by precision`.
3. **Unconvertible legacy text stays visible and keeps people dead**: a person with only `deathday_legacy = 'Bald'` is still hidden from combat/story-beat/people list — test in Task 9.
4. **Editing an old row**: opening edit forms on a row with only legacy text must not wipe the legacy text unless the GM sets a date — test in Task 6/7.
5. **Claude sends a malformed date** ("Frühling 1030", "31. Praios 1030"): tool error naming accepted forms, nothing written — test in Task 10.

---

### Task 1: Engine core — definitions, day ↔ parts

**Files:**
- Create: `libs/fantasy-calendar/index.ts`, `libs/fantasy-calendar/types.ts`, `libs/fantasy-calendar/core.ts`
- Create: `libs/fantasy-calendar/testing/gregorian.ts` (Gregorian fixture definition, exported for specs only)
- Test: `libs/fantasy-calendar/core.spec.ts`
- Modify: `tsconfig.json` (add `"baseUrl": "."`, `"paths": { "@the-eighth/fantasy-calendar": ["libs/fantasy-calendar/index.ts"] }`)
- Modify: `tsconfig.spec.json` (`include` add `"libs/**/*.spec.ts"`), `tsconfig.app.json` if its `include`/`files` would otherwise exclude `libs/**/*.ts`
- Modify: `CLAUDE.md` (short "Calendar" section: engine location, day-line model, where definitions live)

**Interfaces — Produces:**
```ts
// types.ts
export type Precision = 'day' | 'month' | 'year';
export interface InGameDate { day: number; precision: Precision; }
export interface DateParts { year: number; month: number; day: number; } // month 0-based, day 1-based, year signed as displayed-with-sign (see below)
export interface ResolvedDate extends DateParts { weekday: number; }
export interface MonthDefinition { name: string; shortName?: string; aliases?: string[]; days: number; leapDays?: number; }
export interface LeapRule { rules: { every: number; offset?: number; leap: boolean }[]; }
export interface CalendarDefinition {
  id: string; name: string; epochDay: number; months: MonthDefinition[];
  week: { days: string[]; epochWeekday: number };
  leap?: LeapRule;
  era: { suffix: string; beforeSuffix?: string; hasYearZero: boolean };
}
// core.ts
export function validateCalendar(def: CalendarDefinition): string[];
export function isLeapYear(def: CalendarDefinition, year: number): boolean;
export function daysInYear(def: CalendarDefinition, year: number): number;
export function daysInMonth(def: CalendarDefinition, year: number, month: number): number;
export function isValidDate(def: CalendarDefinition, parts: DateParts): boolean;
export function toDay(def: CalendarDefinition, parts: { year: number; month?: number; day?: number }): number; // throws RangeError on invalid parts
export function fromDay(def: CalendarDefinition, n: number): ResolvedDate;
```
Year semantics: `year` is the signed calendar year. With `hasYearZero: true` years run …, −1, 0, 1, …; with `false` they run …, −2, −1, 1, 2, … and `0` is invalid (`isValidDate` false, `toDay` throws). Leap rules are evaluated on the **astronomical** year (`hasYearZero ? year : (year < 0 ? year + 1 : year)`); `offset` means "leap when `(astro - offset) mod every === 0`" with floor modulo.

- [ ] **Step 1: Write failing specs** in `core.spec.ts` (`describe('fantasy-calendar core')`), using an inline Aventurian-like fixture (12×30 + 5, hasYearZero true, epochDay 0, week of 7, epochWeekday 4) and the Gregorian fixture:
  - `round-trips every day from -800 to 800 years` — for a sample of days `n` stepping 97 across that range: `toDay(def, fromDay(def, n)) === n`.
  - `round-trips far past dates` — for `year` in `[-100_000_000, -1_000_000, -3500, -1]`: `fromDay(def, toDay(def, {year, month: 4, day: 17}))` equals `{year, month: 4, day: 17}`; and completes in < 50 ms total.
  - `boundary around year 0` — `fromDay(av, 0)` → `{year: 1, month: 0, day: 1}`; `fromDay(av, -1)` → `{year: 0, month: 12, day: 5}`; `fromDay(av, -365)` → `{year: 0, month: 0, day: 1}`; `fromDay(av, -366)` → `{year: -1, month: 12, day: 5}`.
  - `no year zero when hasYearZero is false` — same fixture with `hasYearZero: false`: `fromDay(-1).year === -1`; `isValidDate({year:0,…})` false; `toDay` with year 0 throws `RangeError`.
  - `matches JavaScript Date for the Gregorian fixture` — fixture: day number = days since 1970-01-01, so `epochDay: -719162` (0001-01-01), `hasYearZero: false`, week Sunday…Saturday with `epochWeekday: 1` (0001-01-01 is a Monday), Gregorian leap rules. For 2000 evenly spread dates in years 1–3000 (build with `new Date(0)` + `setUTCFullYear(y, m, d)`, since `Date.UTC` maps years < 100 to 19xx): `fromDay(greg, Math.floor(ms / 86400000))` has the same year/month/day and `weekday === getUTCDay()`.
  - `leap rules: Gregorian 1900 no, 2000 yes, 2024 yes, 2023 no`.
  - `weekday` — `fromDay(av, 0).weekday === 4`, `fromDay(av, 365 * 999).weekday === 2` (1. Praios 1000 BF = Markttag at index 2), `fromDay(av, -1).weekday === 3`.
  - `validateCalendar` — returns `[]` for both fixtures; non-empty for: no months, a month with `days: 0`, empty week, `epochWeekday` ≥ week length, a leap rule with `every: 0`.

- [ ] **Step 2: Run, expect failure** — `ng test --watch=false --browsers=ChromeHeadless --include='libs/**/*.spec.ts'` → compile error / failing specs (module not found).

- [ ] **Step 3: Implement** `types.ts`, `core.ts`, `index.ts` (re-export everything public), `testing/gregorian.ts`. Approach for `fromDay`/`toDay`: compute the leap cycle length `C` = lcm of all `every` values (1 if no leap rule) and days per cycle; jump whole cycles with floor division, then walk at most `C` years and then months. Never loop over the distance to year 1.

- [ ] **Step 4: Run, expect pass** — same command → all `fantasy-calendar core` specs green. Also `npx tsc --noEmit -p tsconfig.app.json` clean.

- [ ] **Step 5: Commit** — `git add libs tsconfig*.json CLAUDE.md && git commit -m "Add fantasy calendar engine core"` (with the session's Co-Authored-By/Claude-Session trailer, as on every commit in this plan).

---

### Task 2: Engine — precision, format, parse, arithmetic

**Files:**
- Create: `libs/fantasy-calendar/format.ts`, `libs/fantasy-calendar/arithmetic.ts`
- Modify: `libs/fantasy-calendar/index.ts`
- Test: `libs/fantasy-calendar/format.spec.ts`, `libs/fantasy-calendar/arithmetic.spec.ts`

**Interfaces — Consumes:** Task 1. **Produces:**
```ts
export type FormatStyle = 'long' | 'short';
export function dateOf(def: CalendarDefinition, parts: { year: number; month?: number; day?: number }, precision: Precision): InGameDate; // day = first day of the month/year for coarser precision
export function format(def: CalendarDefinition, date: InGameDate, style?: FormatStyle): string;
export function parse(def: CalendarDefinition, text: string): InGameDate | null;
export function yearOf(def: CalendarDefinition, n: number): number;
export function addDays(n: number, days: number): number;
export function addMonths(def: CalendarDefinition, n: number, months: number): number; // clamps day
export function addYears(def: CalendarDefinition, n: number, years: number): number;    // clamps day
export function daysBetween(a: number, b: number): number; // b - a
```
Format: long = `"D. Month YYYY S"`, `"Month YYYY S"`, `"YYYY S"` where `YYYY` is `|year|` and `S` is `era.suffix` for year ≥ 0 (or ≥ 1 without year zero) else `era.beforeSuffix ?? '-'+…` (if no beforeSuffix, print the signed year with `suffix`). Short = same with `shortName ?? name.slice(0,3)` and no suffix. Parse: trim, collapse whitespace; accept optional trailing `suffix` or `beforeSuffix` (case-insensitive, `v.BF`/`v. BF` both), optional leading `-`; forms `D. Month Y`, `D.Month Y`, `Month Y`, `Y`; months matched case-insensitively against `name`, `shortName`, `aliases`; a before-suffix or `-` makes the year negative (−|Y|); returns `null` if the day doesn't exist (`31. Praios`) or text has anything else.

- [ ] **Step 1: Write failing specs** (Aventurian fixture as in Task 1 plus `aliases: ['Namenloser']` on the last month):
  - `format long by precision` — `format(av, dateOf(av,{year:1036,month:10,day:29},'day'))` = `"29. Ingerimm 1036 BF"`; month precision `{year:1027,month:8}` = `"Phex 1027 BF"`; year `{year:1011}` = `"1011 BF"`; `{year:-3500}` = `"3500 v. BF"`; `{year:-100000000}` = `"100000000 v. BF"`; `{year:0}` = `"0 BF"`.
  - `format short` — `"29. Ing 1036"`.
  - `dateOf normalises coarser precision` — month precision day equals `toDay({year:1027, month:8, day:1})`.
  - `parse accepts every form in the existing data` — table: `"29. Ingerimm 1036"`, `"27.  Travia 1031"`, `"26. Phex 1032 BF"`, `"3. Namenloser 1037 BF"`, `"Phex 1027"`, `"-1100"`, `"1100 v. BF"`, `"1011"`, `"rahja 1030"` → expected `InGameDate`s (precision day/day/day/day/month/year/year/year/month; `-1100` and `"1100 v. BF"` equal).
  - `parse rejects` — `"9. Praios"`, `"Bald"`, `"?"`, `"31. Praios 1030"`, `"Frühling 1030"`, `""`, `"0"` with a `hasYearZero:false` def → `null`.
  - `parse/format round-trip` — for 300 sampled days × 3 precisions: `parse(av, format(av, d))` deep-equals `d`.
  - arithmetic: `addMonths` from 30. Rahja to +1 lands on 5. Namenlose Tage (clamped); `addYears` from 5. Namenlose Tage stays valid; `addDays(10, -20) === -10`; `daysBetween(5, 2) === -3`; `yearOf(av, -1) === 0`.

- [ ] **Step 2: Run, expect failure** (same command as Task 1).
- [ ] **Step 3: Implement** `format.ts`, `arithmetic.ts`; export from `index.ts`.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** — `"Add precision-aware format, parse and arithmetic to the calendar engine"`.

---

### Task 3: Aventurian definition in both tenants

**Files:**
- Modify: `src/assets/tde5/rules.json`, `src/assets/the-eighth/rules.json` (add `"calendars"`)
- Modify: `src/app/rules/models/rules.ts` (`calendars: CalendarsConfig`)
- Create: `src/app/core/calendar/calendars-config.ts`
- Test: `src/app/core/calendar/calendars-config.spec.ts`

**Interfaces — Produces:**
```ts
export interface CalendarsConfig { default: string; list: CalendarDefinition[]; }
```
Definition: `id "aventurian"`, `name "Aventurischer Kalender"`, `epochDay 0`, months Praios, Rondra, Efferd, Travia, Boron, Hesinde, Firun, Tsa, Phex, Peraine, Ingerimm, Rahja (30 each), `{ "name": "Namenlose Tage", "shortName": "Nam", "aliases": ["Namenloser", "Namenlose"], "days": 5 }`; week `["Windstag","Erdtag","Markttag","Praiostag","Rohalstag","Feuertag","Wassertag"]`, `epochWeekday 4`; no leap; era `{ "suffix": "BF", "beforeSuffix": "v. BF", "hasYearZero": true }`.

- [ ] **Step 1: Write failing spec** (import both JSON files with `import tde5 from '../../../assets/tde5/rules.json'`; add `"resolveJsonModule": true` to `tsconfig.spec.json` if needed):
  - `both tenants define the same calendars` — deep equality of `.calendars`.
  - `default calendar exists and validates` — `validateCalendar` returns `[]`.
  - `pins known Aventurian dates` — `toDay(av,{year:1036,month:10,day:29}) === 378_103` (= 1035×365 + 10×30 + 28), `format(av,{day:0,precision:'day'}) === "1. Praios 1 BF"`, `fromDay(av, toDay(av,{year:1000,month:0,day:1})).weekday` is Markttag's index. A comment above says: changing these numbers re-reads every stored date.
- [ ] **Step 2: Run, expect failure.** `ng test … --include='src/app/core/calendar/**/*.spec.ts'`
- [ ] **Step 3: Add JSON and types.**
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** — `"Define the Aventurian calendar for both tenants"`.

---

### Task 4: Migration 018, DB tests, types, Firestore import

**Files:**
- Create: `supabase/migrations/018_structured_dates.sql`
- Create: `supabase/tests/018_structured_dates.test.sql`
- Modify: `src/types/supabase.ts` (regenerate: `npx supabase gen types typescript --local > src/types/supabase.ts`; if the local stack is down, edit the three tables by hand)
- Modify: `scripts/transform-and-migrate.ts:508-510,596,1063` — write `birthday_legacy`, `birthyear_legacy`, `deathday_legacy`, `date_legacy` instead of the old names (the Firestore import stays usable; `convert-dates` runs after it). Line 807 is `flows.date` (real-world) — leave it.

Migration contents:
- `campaign`, `historic_events`: `RENAME COLUMN date TO date_legacy`; add `date_day BIGINT`, `date_precision TEXT CHECK (date_precision IN ('day','month','year'))`, `CONSTRAINT <table>_date_pair CHECK ((date_day IS NULL) = (date_precision IS NULL))`.
- `people`: rename `birthday`→`birthday_legacy`, `birthyear`→`birthyear_legacy`, `deathday`→`deathday_legacy`; add `birth_day`, `birth_precision`, `death_day`, `death_precision` with the same checks (`people_birth_pair`, `people_death_pair`).
- `CREATE INDEX idx_historic_events_timeline_date ON historic_events (timeline_id, date_day DESC NULLS LAST);`
- `COMMENT ON COLUMN` for every new and renamed column (replacing the 015 comments): `*_day` = "In-game date as a day number on the campaign day line (0 = 1. Praios 1 BF); the calendars that name it are in the app's rules.json. Sort by it."; `*_precision` = "How exact *_day is: day, month or year (then *_day is the first day of that month/year)."; `*_legacy` = "Old free-text value that could not be converted yet; NULL once converted."; `people.death_day` adds "A person is dead if death_day or deathday_legacy is set."
- Before writing: `grep -rn "birthday\|birthyear\|deathday\|\.date\b" supabase/migrations` for function bodies (`publish_draft`, `assistant_column_values`, mention triggers) referencing renamed columns; if any, `CREATE OR REPLACE` them in 018.

- [ ] **Step 1: Write failing DB test** `018_structured_dates.test.sql` (header like `017_save_project.test.sql`):
  - columns exist: `test.eq((SELECT count(*) FROM information_schema.columns WHERE table_name='people' AND column_name IN ('birth_day','birth_precision','death_day','death_precision','birthday_legacy','birthyear_legacy','deathday_legacy')), 7::BIGINT, …)`, same for `campaign`/`historic_events`.
  - pair check: as GM, `UPDATE campaign SET date_day = 5` without precision raises `check_violation`; `precision = 'week'` raises `check_violation`.
  - GM can set `campaign.date_day/date_precision` (`test.affected`); player cannot (`test.affected` = 0 or `test.denied`, matching how campaign writes are refused today).
  - assistant (`:claude`) can set `birth_day/birth_precision` on its own draft person and not on a published one (insert a published fixture person as GM).
- [ ] **Step 2: Run, expect failure** — `bash supabase/tests/run.sh` → 018 fails.
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Run, expect pass** — whole `run.sh` green (older tests too).
- [ ] **Step 5: Apply locally** — `psql "postgresql://postgres:postgres@127.0.0.1:55432/postgres" -f supabase/migrations/018_structured_dates.sql`, regenerate types, `npx tsc --noEmit -p tsconfig.app.json` (expect errors in people/campaign/timeline code — fixed in Tasks 7–9; note them, don't fix here).
- [ ] **Step 6: Commit** — `"Store in-game dates as day number and precision (migration 018)"`.

---

### Task 5: Conversion script

**Files:**
- Create: `scripts/convert-dates.ts` (CLI), `scripts/convert-dates.lib.ts` (pure conversion)
- Test: `scripts/convert-dates.lib.test.ts` (run with `node --import tsx --test scripts/convert-dates.lib.test.ts`)
- Modify: `package.json` scripts: `"dates:convert": "tsx scripts/convert-dates.ts"`; `db:reset` append `&& npm run dates:convert -- --apply`
- Modify: `docker-compose.portainer.yml` deploy-sequence comment (step after migration 018: run `npm run dates:convert` dry run, then `--apply`), and the matching section in `CLAUDE.md`

**Interfaces — Consumes:** engine (`parse`, `dateOf`), `CalendarsConfig`. **Produces:**
```ts
export interface Converted { day: number; precision: Precision; }
export function convertDate(def: CalendarDefinition, legacy: string | null): Converted | null;
export function convertBirth(def: CalendarDefinition, birthday: string | null, birthyear: number | null): Converted | null;
```
`convertBirth`: both → parse `"${birthday} ${birthyear}"` (day precision); year only → year precision; birthday without year → `null`.

CLI: reads tenant from `NG_APP_TENANT` (`.env`, same as other scripts), loads `src/assets/<tenant>/rules.json`, connects with the service-role key the way `scripts/transform-and-migrate.ts` does. Dry run by default: prints `table id: "legacy" → formatted` per change and a final list of unconvertible rows; `--apply` updates rows (sets `*_day`, `*_precision`, NULLs the legacy columns it converted).

- [ ] **Step 1: Failing tests** — `convertDate` on `"29. Ingerimm 1036"` → day precision with the Task 3 pinned day; `"Phex 1027"` → month; `"Bald"`/`null`/`"9. Praios"` → `null`. `convertBirth("9. Rondra", 1011)` → day; `(null, -5000000)` → year; `("9. Rondra", null)` → `null`; `(null, null)` → `null`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement lib and CLI.**
- [ ] **Step 4: Run tests, expect pass; then run `npm run dates:convert` against the local DB** → prints changes, exits 0, writes nothing.
- [ ] **Step 5: Commit** — `"Add one-off conversion of legacy date text"`.

---

### Task 6: Angular calendar service, pipe and display component

**Files:**
- Create: `src/app/core/calendar/calendar.service.ts` (+ `.spec.ts`)
- Create: `src/app/core/calendar/date-columns.ts` (+ `.spec.ts`)
- Modify: `src/app/core/core.module.ts` (add `provideAppInitializer(() => inject(CalendarService).load())` to `providers`)
- Create: `src/app/shared/pipes/calendar-date.pipe.ts` (+ spec)
- Create: `src/app/shared/components/in-game-date/in-game-date.component.{ts,html,scss}` (+ spec)
- Modify: `src/app/shared/shared.module.ts` (declare + export pipe and component)

**Interfaces — Produces:**
```ts
// calendar.service.ts
class CalendarService {
  load(): Promise<void>;                                  // reads RulesService.getRulesConfig().calendars
  readonly calendars: CalendarDefinition[];               // [] before load
  readonly defaultCalendar: CalendarDefinition;
  readonly displayCalendar$: BehaviorSubject<string>;    // id; persisted in localStorage 'calendar-display', falls back to default if unknown
  setDisplayCalendar(id: string): void;
  get(id?: string): CalendarDefinition;                   // id ?? display; unknown id → default
  format(date: InGameDate | null, calendarId?: string, style?: FormatStyle): string; // '' for null
}
// date-columns.ts
export function readDate(day: number | null | undefined, precision: string | null | undefined): InGameDate | null;
export function dateColumns(prefix: 'date' | 'birth' | 'death', date: InGameDate | null): Record<string, number | string | null>; // {date_day, date_precision}
```
- Pipe `calendarDate` (`pure: false`, `standalone: false`): `transform(date: InGameDate | null, calendarId?: string, style?: FormatStyle): string` → `CalendarService.format`.
- `<app-in-game-date [date]="…" [legacy]="…" [calendar]="…">`: renders the formatted date; if `date` is null and `legacy` set, renders the legacy text in a `span.legacy-date` with `title="Altes Datum, noch nicht umgewandelt"`; nothing if both empty.

- [ ] **Step 1: Failing specs** —
  - service: after `load()` with a mocked `RulesService` returning two calendars (Aventurian + Gregorian fixture): `format({day:0,precision:'day'})` = `"1. Praios 1 BF"`; `setDisplayCalendar('gregorian')` changes `format` output and writes localStorage; an unknown stored id falls back to default; `format(null)` = `''`.
  - date-columns: `readDate(5,'month')` → `{day:5,precision:'month'}`; `readDate(null,null)` and `readDate(5,null)` → `null`; `dateColumns('birth', null)` → `{birth_day:null, birth_precision:null}`.
  - pipe delegates to the service (spy).
  - component: legacy shown with class `legacy-date` when date null; formatted date shown when set (legacy ignored).
- [ ] **Step 2: Run, expect failure.** `ng test --watch=false --browsers=ChromeHeadless --include='src/app/{core/calendar,shared/pipes,shared/components/in-game-date}/**/*.spec.ts'`
- [ ] **Step 3: Implement.** Use `localStorage` inside try/catch.
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** — `"Add calendar service, calendarDate pipe and in-game date display"`.

---

### Task 7: `<app-date-input>`

**Files:**
- Create: `src/app/shared/components/date-input/date-input.component.{ts,html,scss}` (+ spec)
- Modify: `src/app/shared/shared.module.ts`

**Interfaces — Consumes:** `CalendarService`, engine. **Produces:** `<app-date-input formControlName="…" inputId="…" [required]="bool" [legacy]="string|null">`; `ControlValueAccessor` + `Validator` (`NG_VALUE_ACCESSOR`, `NG_VALIDATORS`); value `InGameDate | null`; validation error `{ invalidDate: true }` or `{ required: true }`.

Behaviour: precision select (Tag / Monat / Jahr); day input (number), month select, year input (number, unsigned) and a "v. BF" checkbox shown when the calendar has `beforeSuffix`; calendar select only when `calendars.length > 1` (switching redisplays the same value). Weekday shown as text for day precision. Emits only on user edits (like `app-rich-text-editor`), so opening a form doesn't change the value. All fields empty → `null`. Partially filled or non-existent date → control invalid, value not emitted. Legacy text shown above the fields as "Bisher: …" when given.

- [ ] **Step 1: Failing specs** —
  - `writeValue` of 29. Ingerimm 1036 fills day 29, month index 10, year 1036, precision day, weekday text present.
  - typing day 30, month Rahja, year 1030 emits the matching `InGameDate`; switching precision to Monat emits month precision with day = first of month.
  - day 6 + Namenlose Tage → invalid, nothing emitted.
  - "v. BF" checked with year 3500, precision Jahr → emits `toDay(year:-3500)` year precision.
  - `writeValue(null)` then no user input → `onChange` never called.
  - clearing all fields emits `null`; with `required` → `{required:true}`.
  - calendar select absent with one calendar, present with two.
  - legacy text rendered when `[legacy]` set.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement** (reuse the form-group label pattern used by `edit-event`).
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** — `"Add in-game date input"`.

---

### Task 8: Campaign date, overview, age, timeline, backlinks

**Files:**
- Modify: `src/app/overview/models/campaign-data.ts` (`date: InGameDate | null; dateLegacy: string | null`), `src/app/overview/models/historic-event.ts` (same)
- Modify: `src/app/overview/services/campaign.service.ts` (`transformCampaign` via `readDate`; `store` maps `date` → `dateColumns('date', …)` and sets `date_legacy: null` when a date is set; drops `dateLegacy`)
- Modify: `src/app/overview/services/timeline.service.ts` (query `.order('date_day', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })`; remove `.sort(UtilService.orderByCreated)`; same mapping in `transformEvents` and `store`)
- Modify: `src/app/overview/components/overview/overview.component.html` (`<app-in-game-date [date]="campaign.date" [legacy]="campaign.dateLegacy">`, no " BF"), `src/app/overview/components/edit-campaign/edit-campaign.component.{ts,html}` (`<app-date-input formControlName="date" [required]="true" [legacy]="…">`)
- Modify: `src/app/shared/components/timeline/timeline.component.html:12` (in-game-date), `src/app/shared/components/edit-event/edit-event.component.{ts,html}` (date-input)
- Modify: `src/app/shared/pipes/estimated-age.pipe.ts` — `transform(birth: InGameDate | null)`; campaign year = `yearOf(default, campaign.date.day)`, birth year = `yearOf(default, birth.day)`; same wording buckets; null birth → `''`; no campaign date → `CalendarService.format(birth, defaultId)`.
- Modify: `src/app/core/services/mention.service.ts:255` (label via `CalendarService.format(event.date)` falling back to `event.dateLegacy`)
- Update specs: `campaign.service.spec.ts`, `timeline.service.spec.ts` (watch-arg assertions now see the new `.order` chain), `estimated-age.pipe.spec.ts`, `mention.service.spec.ts`, edit-campaign/edit-event specs.

- [ ] **Step 1: Failing specs** —
  - campaign service: row `{date_day: 100, date_precision: 'day', date_legacy: null}` → `date {day:100,precision:'day'}`; `store({date:{day:7,precision:'year'}})` passes `{date_day:7, date_precision:'year', date_legacy:null}` to `DataService.store`; `store({name:'x'})` passes no date keys (legacy untouched).
  - timeline service: query builder receives `order('date_day', {ascending:false, nullsFirst:false})` before `order('created_at', …)`; result order equals row order (no client sort).
  - estimatedAge: campaign 29. Ingerimm 1036, birth year 1011 → `"ca. 25 Jahre"`; birth year −5000000 → `"unermeßlich alt"`.
  - edit-event: opening with an event that has only `dateLegacy` and saving without touching the date does **not** send `date_legacy: null`.
- [ ] **Step 2: Run, expect failure.** `ng test --watch=false --browsers=ChromeHeadless --include='src/app/{overview,shared,core/services}/**/*.spec.ts'`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect pass.**
- [ ] **Step 5: Commit** — `"Use structured dates for the campaign and timeline"`.

---

### Task 9: People birth and death

**Files:**
- Modify: `src/app/people/models/person.ts` (`birth: InGameDate | null; birthLegacy: string | null; death: InGameDate | null; deathLegacy: string | null`; remove `birthday`, `birthyear`, `deathday`; add `export function isDead(p: Pick<Person, 'death' | 'deathLegacy'>): boolean`), `src/app/people/models/person.db.ts` (new columns)
- Modify: `src/app/people/services/people.service.ts:359-363` (transform: `birthLegacy` = `[birthday_legacy, birthyear_legacy].filter(v => v != null).join(' ') || null`) and `store()` (map `birth`/`death` via `dateColumns`, clear `birthday_legacy`+`birthyear_legacy` / `deathday_legacy` when set)
- Modify: `src/app/people/components/edit-person/edit-person.component.{ts,html}` (two date inputs: Geboren, Gestorben; remove three old controls)
- Modify: `src/app/people/components/person/person.component.html:38-45`, `person-summary/person-summary.component.html:25-31` (in-game-date / pipe, `estimatedAge` on `person.birth`, `isDead`)
- Modify: `src/app/people/components/list/list.component.ts:89`, `src/app/combat/components/overview/overview.component.ts:67`, `src/app/story-beats/services/story-beat.service.ts:134` → `isDead(person)`
- Update specs: `people.service.spec.ts`, `story-beat.service.spec.ts`, list/combat specs that build `Person` fixtures.

- [ ] **Step 1: Failing specs** —
  - `isDead`: `{death:null, deathLegacy:'Bald'}` → true; `{death:{…}, deathLegacy:null}` → true; both null → false.
  - people service transform: `birthday_legacy '9. Rondra'`, `birthyear_legacy 1011` → `birthLegacy '9. Rondra 1011'`; `birth_day 5, birth_precision 'year'` → `birth`.
  - store: `{death:{day:9,precision:'day'}}` → `{death_day:9, death_precision:'day', deathday_legacy:null}`; `{birth:{…}}` clears both birth legacy columns.
  - story-beat `buildState` excludes a PC with only `deathLegacy`.
  - people list hides a person with only `deathLegacy` unless show-dead.
- [ ] **Step 2: Run, expect failure.** `--include='src/app/{people,story-beats,combat}/**/*.spec.ts'`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run full suite** `ng test --watch=false --browsers=ChromeHeadless` → all green; `npx tsc --noEmit -p tsconfig.app.json` clean; `grep -rn "birthday\|birthyear\|deathday" src/app` shows only `*_legacy` mappings.
- [ ] **Step 5: Commit** — `"Use structured birth and death dates for people"`.

---

### Task 10: MCP server

**Files:**
- Create: `mcp/scripts/sync-calendar.mjs` — copies `libs/fantasy-calendar/*.ts` (not specs, not `testing/`) into `mcp/src/calendar/engine/`, and writes `mcp/src/calendar/calendars.json` from `src/assets/${NG_APP_TENANT ?? 'the-eighth'}/rules.json` → `.calendars`
- Create: `mcp/src/calendar/dates.ts`
- Modify: `mcp/.gitignore` (or root) to ignore `mcp/src/calendar/engine/` and `mcp/src/calendar/calendars.json`
- Modify: `mcp/package.json` scripts: `"sync-calendar": "node scripts/sync-calendar.mjs"`, `"prebuild"`, `"pretypecheck"`, `"pretest"` → `npm run sync-calendar`
- Modify: `scripts/package-for-deploy.sh` and `.ps1` — run `npm --prefix mcp run sync-calendar` before `docker build … mcp`
- Modify: `mcp/src/tools/entities.ts` (`PersonFields`: replace `birthday/birthyear/deathday` with `birth_day`, `birth_precision`, `death_day`, `death_precision`; person field list at :499 uses new columns), `mcp/src/tools/register.ts:48-56` (`birth`, `death`: `optionalText('A date in the campaign calendar: "3. Praios 1010 BF", "Phex 1027 BF" or "1010 BF".')`; convert before `repo.createDraft`/update; `INSTRUCTIONS` gets one line on the date format), `mcp/src/tools/query.ts` (post-process rows)
- Modify: `mcp/README.md` (calendar sync, date fields)
- Test: `mcp/test/dates.test.ts`; update `mcp/test/tools.integration.test.ts:106`

**Interfaces — Produces (`mcp/src/calendar/dates.ts`):**
```ts
export function parseDateInput(text: string | null | undefined, field: 'birth' | 'death'): Record<string, number | string | null> | undefined;
// undefined → field not given; null/'' → both columns null; unparseable → throws ToolError(`${field}: "${text}" is not a date. Use "3. Praios 1010 BF", "Phex 1027 BF" or "1010 BF".`)
export function formatDateColumns<T extends Record<string, unknown>>(row: T): T & Record<string, string>;
// for every key `<x>_day` with a sibling `<x>_precision`, adds `<x>` = formatted date (default calendar); recurses into embedded arrays/objects
```

- [ ] **Step 1: Failing tests** (`mcp/test/dates.test.ts`, `node:test`): `parseDateInput('3. Praios 1010 BF','birth')` → `{birth_day: <toDay>, birth_precision:'day'}`; `('Phex 1027','death')` month; `(null,'death')` → `{death_day:null, death_precision:null}`; `(undefined,…)` → `undefined`; `('Frühling 1030','birth')` and `('31. Praios 1030','birth')` throw `ToolError` whose message contains `"3. Praios 1010 BF"`. `formatDateColumns({date_day:0,date_precision:'day', people:[{birth_day:…,birth_precision:'year'}]})` adds `date: "1. Praios 1 BF"` and nested `birth`.
- [ ] **Step 2: Run, expect failure** — `cd mcp && npm test`.
- [ ] **Step 3: Implement** sync script, `dates.ts`, wire into `create_person`/`update_draft` (person only), `get_entity`/`search_entities`/`query` outputs, schema, instructions; update the integration test to send `birth: "3. Praios 1012 BF"` and assert the read-back `birth` string.
- [ ] **Step 4: Run** `cd mcp && npm test && npm run typecheck` → green; `bash mcp/test/integration.sh` → green; `docker build -t the-eighth-mcp:test mcp` after `npm --prefix mcp run sync-calendar` → builds.
- [ ] **Step 5: Commit** — `"Let the MCP server read and write in-game dates"`.

---

### Task 11: Whole-branch verification

- [ ] **Step 1:** `ng test --watch=false --browsers=ChromeHeadless` → 0 failures (note the new passing count for `CLAUDE.md`'s "suite is green" line and update it).
- [ ] **Step 2:** `npx tsc --noEmit -p tsconfig.app.json`, `ng build --configuration=production` → clean.
- [ ] **Step 3:** `bash supabase/tests/run.sh`, `cd mcp && npm test`, `bash mcp/test/integration.sh` → green.
- [ ] **Step 4:** Local run (`npm run dates:convert -- --apply` against the local DB, then `ng serve`): overview shows "29. Ingerimm 1036 BF", timeline is ordered by in-game date, a person page shows Geboren/Gestorben, editing and saving a date round-trips. Use the `run` skill for screenshots.
- [ ] **Step 5:** `git grep -n " BF<\| BF\"\|}} BF" src/app` → no hard-coded suffixes left. Commit any CLAUDE.md count update.
