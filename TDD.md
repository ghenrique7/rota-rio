# TDD — Technical Design Document: RioRota (Alpha) — v2

> Purpose: guide for Cursor (and the developer) to implement the alpha version. Read this file fully before generating or changing any code. Also read `docs/` (empathy map, conceptual diagram and prototype screens, all in Portuguese).
>
> v2: incorporates the original mobile prototype (5 screens, in `docs/prototype/`). The prototype is the **visual and flow reference**; this document decides what is built in the alpha.

## 0. Conventions and assumptions

- **Product name:** RioRota.
- **Product/UI language:** Portuguese (Brazil). All text shown to the user is in pt-BR.
- **Database names:** Portuguese, following the conceptual diagram (`porto`, `embarcacao`, `rota`, `contato`), lowercase, `snake_case`, no accents or spaces.
- **Code language:** variable/function names and code comments in English.
- **Assumptions (change here if the team decides otherwise):**
  - Plain HTML + CSS + JavaScript (ES modules), no build step, several HTML pages sharing one bottom navigation.
  - **Mobile first, web app.** On desktop the content stays centered in a narrow column (max ~480px), like the prototype.
  - Alpha is **consult-only** for the public. Data is entered by the team directly in Supabase.
  - "Interesses" (saved interest in a trip) are stored **on the user's device** (localStorage). No login in the alpha.
  - Backend: Supabase (Postgres + auto-generated API). No custom server.
  - Hosting: Netlify free plan, deployed from GitHub.
- Keep it simple. Do not add frameworks, libraries or features that are not in this document without asking.

## 1. Context and goal

**Persona (Talita, 30):** wants to know, without leaving home, whether there is a boat to her destination, from which port it leaves, at what time, how much it costs, and how to contact the person responsible for the trip.

**Pains to solve:** information scattered in many places; not knowing which port to use; hard to find up-to-date schedules and contacts; having to travel just to ask.

**Needs to cover:** find schedules and destinations quickly; know exactly which port the boat leaves from; easy access to the responsible person's contact.

**Alpha goal:** a public web app where a visitor picks origin, destination and date, sees the departures, and opens a trip to see the boarding point, amenities, fee and the contact of the person responsible.

**Important principle:** RioRota is **informational**. It does not sell tickets and does not guarantee seats. Schedules can change with river level, weather and the agencies' rotation, so the UI must always tell the user to confirm with the responsible person (the prototype already does this: "Horários ilustrativos — confirme antes de ir").

## 2. Scope

**In scope (alpha):**
1. **Início**: origin/destination/date search and a "Rotas populares" section.
2. **Horários**: list of departures for the search, with filter by boat type.
3. **Detalhes da viagem**: times, boarding point, amenities, fee, **contact of the responsible person**, "Avisar interesse".
4. **Rotas**: destinations available from an origin (list with duration; map is optional, see 5.4).
5. **Meus interesses**: trips the user saved on this device (tabs Próximas / Histórico).
6. Responsive, dark UI following the prototype.

**Out of scope (alpha):** login and profile ("Perfil"), ticket sales/payment, push notifications and the notification bell, real-time seat availability, real-time status ("No horário"), admin/registration screens, multi-language.

### 2.1 Prototype → alpha decisions

| Prototype element | Decision | Why |
|---|---|---|
| Logo + name RioRota | Keep | Branding |
| Bell icon with notification dot | Remove | No notifications in alpha |
| Origin / destination / date fields, swap button | Keep | Core of the persona's need |
| "Rotas populares" | Keep (simple: routes with most departures, or a fixed list) | Fast access |
| Filter chips (Todos, Lancha, Barco…) | Keep, generated from the boat types in the data | Prototype shows it |
| Filter button (top right of Horários) | Defer | Chips are enough for the alpha |
| Card badge "No horário" | Replace by "Atualizado em dd/mm" | Real-time status is not possible; "up to date" is the persona's pain |
| "8 vagas restantes" | Remove | Seat counts would be stale or false |
| "Ver viagem" button | Keep | |
| Details: boarding point (Terminal + Rampa), amenities, fee | Keep | |
| Details: "Valor informativo da viagem" | Keep wording | Makes clear it is not a ticket price |
| Details: "Avisar interesse" | Keep, saves locally | Does not notify anyone in the alpha |
| **Contact of the responsible person** | **Add to the details screen** | It is a key need in the empathy map and is missing from the prototype screens |
| Mapa de rotas (stylized map + bottom sheet) | List first, map optional | Map needs coordinates and a map library |
| Tab "Bilhetes" | Rename to **"Interesses"** | The app does not sell tickets |
| Tab "Perfil" | Remove | No login |
| Text "Você será avisado quando a vaga for confirmada" | Replace by "Interesse salvo neste aparelho. Confirme com o responsável pela viagem." | The alpha cannot notify, do not promise it |

## 3. Data model

Based on the conceptual diagram (Contato, Porto, Embarcacao, Rota), extended to support the prototype.

| Entity | Attributes from the diagram | Added for the prototype |
|---|---|---|
| `porto` | id, nome, endereco, cidade | latitude, longitude (optional, for the map) |
| `embarcacao` | id, nome, tipo, capacidade | comodidades (amenities list) |
| `rota` | id, horario_saida, valor_taxa | duracao_minutos, dias_semana, ponto_embarque, atualizado_em, origin and destination ports |
| `contato` | id, numero_telefone, valor | embarcacao_id |

Relationships from the diagram:
- **Embarcacao possui Contato** (1,n on both sides)
- **Porto sai Rota** (1,n on both sides): a route leaves from a port
- **Embarcacao realiza Rota** (n:n): needs a junction table

**Decisions made to make it implementable (review with the team and teacher; keep the delivered diagram consistent with the final database):**
- `contato.embarcacao_id` (FK): each contact belongs to one boat. If a contact must serve several boats, replace with a junction table.
- `rota.porto_origem_id` (FK to `porto`) implements `sai`. **Added** `rota.porto_destino_id` (FK to `porto`), because the user searches by destination.
- `embarcacao_rota` junction table implements the n:n relationship.
- `contato.valor`: meaning to be confirmed with the team (assumed: contact label, e.g. "WhatsApp", "Responsável"). Keep the column name from the diagram.
- `embarcacao.tipo`: free text such as `Lancha` or `Barco`. The filter chips are built from the distinct values found in the results.
- `embarcacao.comodidades`: text array, e.g. `{poltrona, wifi, lanchonete, colete}`; the UI maps each value to an icon.
- `rota.dias_semana`: smallint array with the weekdays the departure happens (0 = Sunday ... 6 = Saturday, same as JavaScript `Date.getDay()`). This is how the date picker works: the app filters routes that run on the chosen weekday.
- `rota.ponto_embarque`: free text such as `Rampa 3`; the terminal name comes from `porto.nome`.
- `rota.atualizado_em`: when the team last confirmed the information; shown on the cards.

### 3.1 SQL (run in the Supabase SQL editor; save as `db/schema.sql`)

```sql
create table porto (
  id bigint generated always as identity primary key,
  nome text not null,
  endereco text,
  cidade text not null,
  latitude numeric(9,6),
  longitude numeric(9,6)
);

create table embarcacao (
  id bigint generated always as identity primary key,
  nome text not null,
  tipo text not null,
  capacidade integer check (capacidade is null or capacidade > 0),
  comodidades text[] not null default '{}'
);

create table rota (
  id bigint generated always as identity primary key,
  horario_saida time not null,
  duracao_minutos integer not null check (duracao_minutos > 0),
  valor_taxa numeric(10,2) check (valor_taxa is null or valor_taxa >= 0),
  dias_semana smallint[] not null default '{0,1,2,3,4,5,6}',
  ponto_embarque text,
  atualizado_em timestamptz not null default now(),
  porto_origem_id bigint not null references porto(id),
  porto_destino_id bigint not null references porto(id),
  check (porto_origem_id <> porto_destino_id)
);

create table embarcacao_rota (
  embarcacao_id bigint not null references embarcacao(id) on delete cascade,
  rota_id bigint not null references rota(id) on delete cascade,
  primary key (embarcacao_id, rota_id)
);

create table contato (
  id bigint generated always as identity primary key,
  numero_telefone text not null,
  valor text,
  embarcacao_id bigint not null references embarcacao(id) on delete cascade
);

create index on rota (porto_origem_id);
create index on rota (porto_destino_id);
create index on contato (embarcacao_id);
```

### 3.2 Security (Row Level Security)

The site is public and read-only. Enable RLS on every table and allow only `select` for the anonymous role. Without this, the public key would allow anyone to write.

```sql
alter table porto enable row level security;
alter table embarcacao enable row level security;
alter table rota enable row level security;
alter table embarcacao_rota enable row level security;
alter table contato enable row level security;

create policy "public read" on porto for select using (true);
create policy "public read" on embarcacao for select using (true);
create policy "public read" on rota for select using (true);
create policy "public read" on embarcacao_rota for select using (true);
create policy "public read" on contato for select using (true);
```

### 3.3 Seed data (`db/seed.sql`)

Use the cities from the prototype: **Santarém (origin), Óbidos, Alenquer, Monte Alegre**, one port per city (Santarém: "Terminal Fluvial de Santarém"). Create at least 2 boats of type `Lancha` and 2 of type `Barco`, 6 routes from Santarém (at least one per destination, at least one with several weekdays) and 1-2 contacts per boat.

- Boat names and times from the prototype can be used as illustrative data.
- **Use fake phone numbers.** Do not commit real personal phone numbers.
- Keep the data **consistent** (e.g. the same route must have the same duration and fee on every screen). The prototype screens have small inconsistencies (header says Óbidos but the card shows Alenquer; the same trip appears with different fees), do not copy those.

## 4. Architecture

```
Browser (HTML/CSS/JS)  --supabase-js-->  Supabase (Postgres, read-only via RLS)
        |
   localStorage (saved interests, per device)
        ^
   Netlify (static hosting, deploy from GitHub)
```

- The front end calls Supabase directly with the **anon (public) key**. This is safe only because of the RLS policies above.
- **Never** put the `service_role` key in the front end or in the repository.
- Load supabase-js from a CDN as an ES module (no bundler):
  `import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"`

### 4.1 Folder structure

```
/
├── index.html            # Início (search + rotas populares)
├── horarios.html         # Horários (results), reads ?origem=&destino=&data=
├── viagem.html           # Detalhes da viagem, reads ?rota=&embarcacao=&data=
├── rotas.html            # Rotas (destinations from an origin)
├── interesses.html       # Meus interesses (localStorage)
├── css/
│   └── style.css         # design tokens + components
├── js/
│   ├── config.js         # SUPABASE_URL and SUPABASE_ANON_KEY
│   ├── supabase.js       # creates the client
│   ├── api.js            # all database queries (only file that talks to Supabase)
│   ├── storage.js        # saved interests (localStorage, wrapped in try/catch)
│   ├── nav.js            # renders the bottom navigation on every page
│   ├── format.js         # time, currency, date, duration, phone/WhatsApp helpers
│   └── pages/            # one file per page: home.js, horarios.js, viagem.js, rotas.js, interesses.js
├── db/
│   ├── schema.sql
│   └── seed.sql
├── docs/                 # empathy map + conceptual diagram + prototype/ (images)
├── TDD.md
├── netlify.toml          # optional
└── README.md
```

## 5. Screens

**Global:** header per screen as in the prototype; bottom navigation with 4 tabs: **Início, Buscar, Rotas, Interesses** (active tab highlighted). "Buscar" opens `horarios.html` with the last search, or `index.html` focused on the form if there is none. Every screen has loading, empty and error states in pt-BR.

**Disclaimer** (visible on Horários and Detalhes): "Horários ilustrativos — confirme antes de ir. Podem mudar com o nível do rio, clima e rodízio das agências." Remove "ilustrativos" when the data is real.

### 5.1 Início (`index.html`)
- Light header area: logo "RioRota", title "Para onde você vai pelo rio hoje?", subtitle "Horários de barcos e lanchas · <origin city>".
- Dark search card with 3 pill fields: **Origem** (default Santarém), **Destino** ("Escolha a cidade"), **Data** (default today, shown as "Hoje, 27 ago", then "Seg, 28 ago"...), plus a button to swap origin and destination.
- Button **"Buscar horários"** (disabled until a destination is chosen) goes to `horarios.html?origem=..&destino=..&data=YYYY-MM-DD`.
- Section **"Rotas populares"** with a "Ver todas" link to `rotas.html`: cards for origin→destination pairs; tapping fills the search.

### 5.2 Horários (`horarios.html`)
- Header: back button, "Origem → Destino", "Hoje, 27 ago · N saídas".
- Filter chips: **Todos** + one per boat type in the results (e.g. Lancha, Barco); horizontally scrollable.
- Disclaimer text.
- **One card = one route × one boat** (a route with 2 boats appears as 2 cards). Card content: boat type (icon + text), "Atualizado em dd/mm", departure time, duration, boat name, arrival time (departure + duration), origin and destination cities, fee "R$ 110,00", button **"Ver viagem"**.
- Results ordered by departure time. The date only filters by weekday (`dias_semana`).
- Empty state: "Nenhuma saída encontrada para essa data." with a suggestion to try another date.

### 5.3 Detalhes da viagem (`viagem.html`)
- Header: back button, "Detalhes da viagem", type icon + boat name, big departure time, duration + "direto", big arrival time, origin and destination.
- Card **Ponto de embarque**: `porto.nome` + `rota.ponto_embarque` (e.g. "Terminal Fluvial de Santarém — Rampa 3"), address. (Map image is optional.)
- Card **Contato do responsável** (not in the prototype, required by the empathy map): for each contact of the boat show `valor` and phone, with buttons **Ligar** (`tel:`) and **WhatsApp** (`https://wa.me/55<digits>`; strip non-digits).
- Card **Comodidades**: icons from `embarcacao.comodidades`. Also show capacity.
- Fixed bottom bar: "Valor informativo da viagem" + fee, and button **"Avisar interesse"** (saves to localStorage and changes to "Interesse salvo"; tapping again removes it).
- Missing or invalid params show a friendly message and a link back to Início.

### 5.4 Rotas (`rotas.html`)
- Title "Rotas fluviais", subtitle "Saindo de <origin>" with a way to change the origin.
- Bottom-sheet style list: "N destinos a partir daqui", each item "Origem → Destino" with the shortest duration. Tapping opens `horarios.html` with origin, destination and today's date.
- **Map is optional (stretch goal):** if time allows, use Leaflet + OpenStreetMap (free, via CDN) with markers from `porto.latitude/longitude`. The list must work without it.

### 5.5 Meus interesses (`interesses.html`)
- Tabs **Próximas** (date today or later) and **Histórico** (past dates).
- Card per saved interest: boat type + name, times, origin/destination, date, boarding point, message "Interesse salvo neste aparelho. Confirme com o responsável pela viagem." and a **Contato** shortcut.
- Data saved in localStorage key `riorota_interesses` as `[{ rotaId, embarcacaoId, data, savedAt }]`; the page loads trip data from Supabase by ids. Wrap all storage access in `try/catch` and show an empty state if it fails.
- Empty state: "Você ainda não salvou nenhum interesse."

### 5.6 Visual design (from the prototype)

- Dark theme: page background near-black (`#0A0A0A`), cards `#1A1A1A`, input pills `#262626`, text white, secondary text gray (`#A3A3A3`). Light header area on Início (`#E5E5E5`, dark text). Values are approximate; define them as CSS variables.
- Primary button: light gray/white pill with dark text. Large rounded corners (cards ~24px, pills fully rounded). Large bold time numbers.
- Font: Inter (Google Fonts) or system sans-serif. Simple line icons (inline SVG).
- Keep contrast high and touch targets at least 44px tall.

## 6. Data access (`js/api.js`)

All async, return data or throw:
- `listCidades()`: distinct cities from `porto`, for the origin/destination selectors.
- `searchViagens({ origem, destino, data, tipo })`: routes from city `origem` to city `destino` that run on the weekday of `data`, flattened to route × boat.
- `getViagem(rotaId, embarcacaoId)`: one trip with both ports, boat (with amenities), and the boat's contacts.
- `listDestinosDe(cidade)`: destinations from a city with the shortest duration.
- `getViagensByIds(items)`: used by Meus interesses.

Example query (adjust FK names to the real ones in Supabase):

```js
const dow = new Date(data + "T12:00:00").getDay(); // 0 = Sunday

const { data: rows, error } = await supabase
  .from("rota")
  .select(`
    id, horario_saida, duracao_minutos, valor_taxa, ponto_embarque, atualizado_em,
    origem:porto!rota_porto_origem_id_fkey!inner ( id, nome, cidade, endereco ),
    destino:porto!rota_porto_destino_id_fkey!inner ( id, nome, cidade ),
    embarcacao_rota ( embarcacao ( id, nome, tipo, capacidade, comodidades, contato ( numero_telefone, valor ) ) )
  `)
  .eq("origem.cidade", origem)
  .eq("destino.cidade", destino)
  .contains("dias_semana", [dow])
  .order("horario_saida");
```

Then flatten `embarcacao_rota` into one item per boat and filter by `tipo` on the client.

## 7. Non-functional requirements

- **Mobile first**, works from 360px width; no horizontal page scroll (only the chips row scrolls).
- **Accessibility basics:** semantic HTML, labels on inputs, sufficient contrast, buttons usable by keyboard, icons with text labels or `aria-label`.
- **Security:** use `textContent` (not `innerHTML`) when inserting database values. Only read operations on the database.
- **Performance:** little data in the alpha; no pagination needed.
- **Simplicity:** no frameworks, no build step.
- **Honesty of data:** always show `atualizado_em` and the disclaimer; never show seat counts or live status.

## 8. Deploy (Netlify)

1. Push the repository to GitHub.
2. In Netlify: *Add new site → Import from Git*, choose the repo. No build command; publish directory is the repo root (`.`).
3. The Supabase URL and anon key live in `js/config.js` (public by design; protection comes from RLS).
4. Each push to the main branch redeploys automatically.

Free plan limits can change, so check Netlify's and Supabase's pricing pages. Free Supabase projects may pause after a period of inactivity, so open the site before any presentation to check it.

## 9. Testing

Manual tests (run before each delivery):

| # | Scenario | Expected |
|---|---|---|
| 1 | Open Início | Origin = Santarém, date = today, search button disabled until a destination is chosen |
| 2 | Swap origin and destination | Fields swap |
| 3 | Search Santarém → Óbidos for today | Only routes that run today, ordered by time, one card per boat |
| 4 | Search a date/destination with no departures | "Nenhuma saída encontrada..." |
| 5 | Tap chip "Lancha" | Only Lancha cards; "Todos" restores |
| 6 | Tap "Ver viagem" | Details show times, boarding point, amenities, fee, contact |
| 7 | Tap "Ligar" / "WhatsApp" | Dialer / WhatsApp open with the correct number |
| 8 | Tap "Avisar interesse", open Interesses | Trip appears in "Próximas"; tapping again removes it |
| 9 | Save an interest for a past date | Appears in "Histórico" |
| 10 | Open `viagem.html` without or with invalid params | Friendly message, no crash |
| 11 | Turn off internet and search | Error message is shown |
| 12 | Try an insert from the browser console with the anon key | Must be rejected (RLS) |
| 13 | Resize to 360px width | No horizontal page scroll, readable |
| 14 | Block localStorage (private mode) | App still works; Interesses shows an empty/error state |

Optional: unit tests for pure helpers in `format.js` (arrival time, WhatsApp link, weekday) with Vitest. Not required for the alpha.

## 10. Implementation plan (suggested order for Cursor)

1. Create the folder structure and the empty files.
2. Create `db/schema.sql` and `db/seed.sql` from sections 3.1-3.3 and run them in Supabase.
3. Implement `supabase.js`, `config.js`, `format.js` and `api.js`; test the queries in the browser console.
4. Build the design tokens and shared components in `style.css` and the bottom navigation in `nav.js`.
5. Build Início, then Horários, then Detalhes da viagem (this is the core flow).
6. Build Meus interesses (`storage.js`), then Rotas (list).
7. Run the manual tests from section 9.
8. Write `README.md` (what it is, how to run, how to deploy) and deploy to Netlify.
9. Stretch: map with Leaflet in Rotas.

## 11. Rules for Cursor

- Follow this document. If something is unclear or conflicts with the code or the prototype, ask before deciding.
- Make small changes and explain what changed and why, so the developer can understand and present it.
- Keep database names in Portuguese as in section 3 and UI text in pt-BR.
- Do not add dependencies, frameworks or features outside the scope without asking.
- Never expose secrets; only the Supabase anon key may be in the front end.
- Keep all Supabase queries in `js/api.js`.
- Never show information that suggests ticket sales, seat availability or real-time status.

## 12. Open questions for the team

1. What does `contato.valor` represent?
2. Can the conceptual diagram be updated with the added fields and the route destination, so the documents match the database?
3. Can one contact belong to several boats?
4. Is the alpha consult-only, or should boat owners have a registration screen (currently out of scope)?
5. What is the third filter chip in the prototype (cut off after "Barco")? Add it as a boat type if it exists.
