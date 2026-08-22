# FieldAssign — Detaljna dokumentacija aplikacije

**Slogan:** Task · Proof · Report  
**Tip:** SaaS PWA za upravljanje terenskim operacijama  
**Verzija:** 1.0.0

---

## 1. OPŠTI OPIS APLIKACIJE

FieldAssign je SaaS (Software as a Service) PWA (Progressive Web App) aplikacija dizajnirana za upravljanje terenskim operacijama. Omogućuje organizacijama da kreiraju zadatke za svoje radnike u terenu, prate njihovo izvršavanje kroz GPS check-in točke, evidentiraju aktivnosti tokom izvršavanja i generišu detaljne izvještaje.

Aplikacija koristi **rolni pristup** sa dvije osnovne uloge:
- **Admin** — upravlja organizacijom, dodaje radnike, kreira i dodjeljuje zadatke, pregledava sve izvještaje
- **Worker (Radnik)** — prima zadatke, mijenja njihov status, dodaje aktivnosti, evidentira lokaciju putem GPS-a

---

## 2. TEHNOLOŠKI STACK

### 2.1 Klijentska strana (Frontend)
| Tehnologija | Verzija | Svrha |
|---|---|---|
| React | 18.3.1 | Korisnički interfejs (UI) |
| Vite | 5.2.11 | Build alat i dev server |
| React Router DOM | 6.23.1 | Routing (navigacija između stranica) |
| Zustand | 4.5.2 | State management (centralizovano stanje aplikacije) |
| Axios | 1.7.2 | HTTP klijent za komunikaciju sa API-em |
| Tailwind CSS | 3.4.3 | Utility-first CSS framework za stilizovanje |
| date-fns | 3.6.0 | Rad sa datumima (formatiranje, lokalizacija) |
| vite-plugin-pwa | 0.20.0 | PWA podrška (offline, instalacija) |

### 2.2 Serverska strana (Backend)
| Tehnologija | Verzija | Svrha |
|---|---|---|
| Node.js | ES Modules | Runtime okruženje |
| Express | 4.19.2 | Web framework za REST API |
| MongoDB (Mongoose) | 8.4.0 | NoSQL baza podataka + ODM |
| JWT (jsonwebtoken) | 9.0.2 | Autentifikacija putem tokena |
| bcryptjs | 2.4.3 | Hashiranje lozinki |
| Zod | 4.4.3 | Validacija podataka (sheme) |
| Nodemailer | 8.0.11 | Slanje email poruka |
| Cors | 2.8.5 | CORS politika |
| Dotenv | 16.4.5 | Učitavanje environment varijabli |

### 2.3 Eksterni servisi
- **MongoDB Atlas** — Cloud hosting za bazu podataka
- **Paddle** — Plata za plaćanje pretplata (subscription billing) + webhooks
- **Brevo (Sendinblue)** — SMTP za slanje email poruka

---

## 3. ARHITEKTURA APLIKACIJE

Aplikacija prati **client-server** arhitekturu sa jasnim razdvajanjem na frontend i backend, koji komuniciraju putem REST API-ja u JSON formatu.

```
┌─────────────────────────┐          ┌─────────────────────────┐
│  Klijent (React/Vite)   │   HTTP   │  Server (Express/Node)  │
│                         │◄───────► │                         │
│  • UI komponente        │   JSON   │  • REST API rute        │
│  • Zustand store        │          │  • Autentifikacija JWT  │
│  • Axios + interceptors │          │  • MongoDB (Mongoose)   │
│  • Routing              │          │  • Email servis         │
└─────────────────────────┘          └────────┬────────────────┘
                                              │
                                     ┌────────▼────────┐
                                     │  MongoDB Atlas  │
                                     │   (Baza pod.)   │
                                     └─────────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          │                   │                   │
                 ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
                 │   Paddle (Pay)  │ │  Brevo (Email)  │ │  PWA Service W.  │
                 └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 3.1 Struktura direktorija

```
FieldAssign app/
├── client/                      # Frontend — React PWA
│   ├── public/                  # Statički resursi (favicon, manifest)
│   └── src/
│       ├── components/          # UI komponente (Layout itd.)
│       ├── pages/               # Stranice aplikacije
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ChangePasswordPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── TasksPage.jsx
│       │   ├── ActivitiesPage.jsx
│       │   ├── ReportsPage.jsx
│       │   └── AdminPage.jsx
│       ├── services/            # API komunikacija
│       │   └── api.js
│       ├── store/               # State management (Zustand)
│       │   ├── authStore.js
│       │   └── taskStore.js
│       ├── App.jsx              # Glavna komponenta + rute
│       ├── main.jsx             # Entry point
│       └── index.css            # Tailwind + custom stilovi
│
└── server/                      # Backend — Express API
    └── src/
        ├── config/              # Konfiguracije
        │   └── planFeatures.js
        ├── middleware/          # Express middleware
        │   └── auth.js
        ├── models/              # Mongoose sheme (modeli)
        │   ├── User.js
        │   ├── Organization.js
        │   ├── Task.js
        │   └── Activity.js
        ├── routes/              # REST API rute
        │   ├── auth.js
        │   ├── tasks.js
        │   ├── activities.js
        │   ├── reports.js
        │   ├── users.js
        │   └── webhooks.js
        ├── services/            # Poslovna logika / servisi
        │   └── emailService.js
        ├── utils/               # Pomoćne funkcije
        │   └── passwordGenerator.js
        ├── validators/          # Validacije (Zod)
        │   └── authValidators.js
        └── index.js             # Entry point servera
```

---

## 4. BAZA PODATAKA — MODELI (Mongoose)

### 4.1 Organization (Organizacija)
Kolekcija koja predstavlja firmu/kompaniju/tim. Jedna organizacija ima više korisnika i zadataka.

| Polje | Tip | Opis |
|---|---|---|
| `name` | String (required) | Naziv organizacije |
| `slug` | String (unique, required) | URL-friendly identifikator (automatski generiše se) |
| `paddleCustomerId` | String | Paddle ID kupca (za plaćanja) |
| `paddleSubscriptionId` | String | Paddle ID pretplate |
| `plan` | Enum: `trial`, `starter`, `professional`, `business` | Aktuelni plan pretplate (default: `trial`) |
| `planStatus` | Enum: `active`, `past_due`, `canceled`, `trialing` | Status pretplate |
| `trialEndsAt` | Date | Kraj probnog perioda (default: 7 dana od kreiranja) |
| `planExpiresAt` | Date | Datum isteka pretplate |
| `maxUsers` | Number | Maksimalan broj korisnika (default: 999) |
| `createdAt` / `updatedAt` | Date | Automatski (Mongoose timestamps) |

### 4.2 User (Korisnik)
Predstavlja zaposlenog u organizaciji, sa rolama `admin` ili `worker`.

| Polje | Tip | Opis |
|---|---|---|
| `organization` | ObjectId → Organization (required) | Pripadnost organizaciji |
| `name` | String (required) | Ime i prezime |
| `email` | String (unique, required, lowercase) | Email adresa |
| `password` | String (required, min 6) | Hashirana lozinka (bcrypt 12 rounds) |
| `role` | Enum: `admin`, `worker` (default: `worker`) | Uloga korisnika |
| `active` | Boolean (default: `true`) | Da li je nalog aktivan |
| `lastSeen` | Date | Datum poslednje aktivnosti |
| `mustChangePassword` | Boolean (default: `false`) | Traži promjenu privremene lozinke |
| `createdAt` / `updatedAt` | Date | Automatski |

**Osobine modela:**
- Lozinka se automatski hashira prije snimanja (pre-save hook)
- `comparePassword(plain)` — metoda za provjeru lozinke
- `toJSON()` — uklanja password polje iz JSON odgovora
- Index: `{ organization: 1, active: 1 }` za brze upite

### 4.3 Task (Zadatak)
Centralni model aplikacije — zadatak koji radnik treba da izvrši u terenu.

| Polje | Tip | Opis |
|---|---|---|
| `organization` | ObjectId → Organization (required) | Pripadnost organizaciji |
| `assignedTo` | ObjectId → User (required) | Radnik kome je zadatak dodijeljen |
| `createdBy` | ObjectId → User (required) | Admin koji je kreirao zadatak |
| `title` | String (required) | Naslov zadatka |
| `description` | String | Detaljan opis |
| `location` | String | Lokacija (adresa, grad, itd.) |
| `timeStart` | String (`"HH:MM"`) | Predviđeni početak |
| `timeEnd` | String (`"HH:MM"`) | Predviđeni kraj |
| `priority` | Enum: `low`, `medium`, `high` (default: `medium`) | Prioritet |
| `status` | Enum: `pending`, `accepted`, `inprogress`, `completed`, `rejected` (default: `pending`) | Trenutni status |
| `gpsAccepted` | `{ lat, lng, timestamp }` | GPS tačka pri prihvatanju |
| `gpsArrival` | `{ lat, lng, timestamp }` | GPS tačka pri dolasku |
| `gpsCompleted` | `{ lat, lng, timestamp }` | GPS tačka pri završetku |
| `isRecurring` | Boolean (default: `false`) | Ponavljajući zadatak (buduća funkcionalnost) |
| `recurringPattern` | String (`daily`/`weekly`) | Šablon ponavljanja |
| `completedAt` | Date | Datum i vrijeme završetka |
| `scheduledDate` | Date (default: `Date.now`) | Datum zakazivanja |
| `createdAt` / `updatedAt` | Date | Automatski |

**Indeksi:**
- `{ organization: 1, status: 1 }`
- `{ assignedTo: 1, scheduledDate: 1 }`

### 4.4 Activity (Aktivnost)
Događaj/zabilješka vezana za zadatak (timeline tokom izvršavanja).

| Polje | Tip | Opis |
|---|---|---|
| `task` | ObjectId → Task (required) | Zadatak kojem se aktivnost odnosi |
| `organization` | ObjectId → Organization (required) | Pripadnost organizaciji |
| `user` | ObjectId → User (required) | Korisnik koji je kreirao aktivnost |
| `text` | String (required) | Tekst opis aktivnosti |
| `note` | String | Dodatna napomena |
| `evidence[]` | Array objekata | Dokazi (foto/video/bilješka) — URL-ovi ka cloud storage-u |
| `evidence[].type` | Enum: `photo`, `video`, `note` | Tip dokaza |
| `evidence[].url` | String | URL resursa |
| `evidence[].caption` | String | Opis/napomena |
| `gps` | `{ lat, lng, timestamp }` | GPS lokacija u trenutku aktivnosti |
| `timestamp` | Date (default: `Date.now`) | Vrijeme nastupanja |
| `createdAt` / `updatedAt` | Date | Automatski |

**Indeksi:**
- `{ task: 1, timestamp: 1 }`
- `{ organization: 1, timestamp: -1 }`

---

## 5. SERVERSKA STRANA — REST API

**Bazni URL:** `/api`  
**Autentifikacija:** JWT Bearer token u `Authorization` header-u (za zaštićene rute)  
**Sve rute vracaju JSON**

### 5.1 Middleware za autentifikaciju

**`authenticate`** (aplikovan na sve `/api/tasks/*`, `/api/activities/*`, `/api/reports/*`, `/api/users/*`):
1. Čita `Authorization: Bearer <token>` header
2. Verifikuje JWT potpis pomoću `JWT_SECRET`
3. Dohvata korisnika iz baze (bez passworda)
4. Proverava da li je korisnik aktivan
5. Postavlja `req.user` i `req.organizationId`
6. Ako nešto ne uspjedi → 401

**`requireAdmin`** (samo za admine):
- Proverava `req.user.role === 'admin'`
- Inače → 403 (Nedovoljna prava)

**`requireActiveSubscription`** (opciono, za provjeru pretplate):
- Proverava da li organizacija ima aktivnu pretplatu
- Ako je istekla/otkazana → 402 (Payment Required)

### 5.2 Rute za autentifikaciju — `/api/auth/*` (public)

#### `POST /api/auth/register` — Registracija
Kreira **novu organizaciju** i **prvog admina** u jednoj transakciji.

**Request body:**
```json
{
  "orgName": "Zaštita Plus d.o.o.",
  "name": "Marko Marković",
  "email": "marko@zastita.ba",
  "password": "Lozinka123"
}
```

**Validacija (Zod shema):**
- `orgName`: ne prazno
- `name`: ne prazno
- `email`: validan format
- `password`: min 8 karaktera + bar jedno veliko/malo slovo + broj

**Response (201):**
```json
{
  "token": "<jwt_token>",
  "user": { ... },
  "organization": { ... }
}
```

#### `POST /api/auth/login` — Prijava
**Request:** `{ email, password }`  
**Provjere:**
- Postoji li korisnik sa tim emailom
- Odgovara li lozinka (bcrypt compare)
- Da li je nalog aktivan

**Response (200):** `{ token, user, organization }`  
**Greške:** 400 (nedostaju podaci), 401 (pogrešan email/lozinka), 403 (deaktiviran nalog)

#### `GET /api/auth/me` — Dohvati trenutnog korisnika
**Auth:** required  
**Response:** `{ user, organization }`

#### `POST /api/auth/change-password` — Promjena lozinke
**Auth:** required  
**Request:** `{ currentPassword, newPassword }`  
**Validacija:** ista kao za registraciju za novu lozinku  
**Posljedica:** postavlja `mustChangePassword = false`

---

### 5.3 Rute za zadatke — `/api/tasks/*` (protected)

#### `GET /api/tasks` — Lista zadataka
**Query parametri:**
- `status` — filter po statusu
- `date` — filter po `scheduledDate` (format: `YYYY-MM-DD`)

**Praćenje uloga:**
- **Admin:** vidi SVE zadatke svoje organizacije
- **Worker:** vidi SAMO zadatke dodijeljene njemu (`assignedTo = req.user._id`)

**Response (200):** Niz zadataka sa popunjenim `assignedTo` (name, email) i `createdBy` (name)

#### `GET /api/tasks/:id` — Detalji zadatka
Vraća zadatak + sve povezane aktivnosti.  
**Provera:** Worker može vidjeti samo svoje zadatke → inače 403

**Response (200):** `{ task, activities: [] }`

#### `POST /api/tasks` — Kreiraj zadatak (samo admin)
**Auth:** requireAdmin  
**Request:** `{ title, description?, location?, assignedTo, priority?, timeStart?, timeEnd?, scheduledDate? }`  
**Obavezna polja:** `title`, `assignedTo`

**Posljedice nakon kreiranja:**
1. Zadatak se snima u bazu
2. Automatski se šalje EMAIL radniku putem `sendTaskAssignedEmail()` (async, ne blokira request)
3. Response 201 sa popunjenim zadatkom

#### `PATCH /api/tasks/:id/status` — Promjena statusa zadatka
**Dozvoljeni statusi:** `pending`, `accepted`, `inprogress`, `completed`, `rejected`

**Ovdje se dešava glavna logika workf low-a:**
1. **Provjera prava:** Worker mijenja samo svoje zadatke
2. **GPS snimanje:**
   - Pri prelasku u `accepted` → snima se `gpsAccepted`
   - Pri prelasku u `inprogress` → snima se `gpsArrival` (dolazak na lokaciju)
   - Pri prelasku u `completed` → snima se `gpsCompleted`
3. **Automatska aktivnost:** Kreira se sistemski Activity zapis u timeline-u:
   - `accepted` → "Zadatak prihvaćen"
   - `inprogress` → "Početo izvršenje — dolazak na lokaciju"
   - `completed` → "Zadatak završen"
   - `rejected` → "Zadatak odbijen"
4. **Email notifikacije adminu:**
   - Kada je status `completed` → `sendTaskCompletedEmail()`
   - Kada je status `rejected` → `sendTaskRejectedEmail()` (sa razlogom)

#### `PUT /api/tasks/:id` — Uredi zadatak (samo admin)
Full update zadatka (kreiran od strane admina)

#### `DELETE /api/tasks/:id` — Obriši zadatak (samo admin)
Briše zadatak i sve povezane aktivnosti (CASCADE)

---

### 5.4 Rute za aktivnosti — `/api/activities/*` (protected)

#### `GET /api/activities` — Lista aktivnosti
**Query:**
- `taskId` — filter po zadatku
- `date` — filter po datumu

**Filtriranje po ulozi:** Worker vidi samo svoje aktivnosti

#### `POST /api/activities` — Dodaj aktivnost
**Request:** `{ taskId, text, note?, gps? }`  
**Provere:**
- Zadatak postoji i pripada istoj organizaciji
- Worker može dodati samo na SVOJE zadatke
- **Aktivnosti se mogu dodavati SAMO kada je zadatak u statusu `inprogress`** (dok se izvršava)

**Response (201):** Kreirana aktivnost sa popunjenim `user` (name)

#### `DELETE /api/activities/:id` — Obriši aktivnost
**Ograničenje:** Korisnik može obrisati SAMO svoje aktivnosti

---

### 5.5 Rute za izvještaje — `/api/reports/*` (protected)

#### `GET /api/reports/daily` — Dnevni izvještaj
**Query:** `date` (default: danas)  
**Response:**
```json
{
  "date": "2024-06-01",
  "total": 10,
  "completed": 7,
  "inprogress": 2,
  "pending": 1,
  "tasks": [ ... ]
}
```
Worker vidi samo svoje zadatke.

#### `GET /api/reports/task/:taskId` — Detaljan izvještaj po zadatku
Generiše strukturirani report za štampu/pregled:

```json
{
  "generatedAt": "ISO datum",
  "task": { /* osnovni podaci */ },
  "assignedTo": { /* radnik */ },
  "gpsCheckpoints": { accepted, arrival, completed },
  "activities": [
    { time, text, note, evidence, gps, user }
  ],
  "summary": {
    "totalActivities": 12,
    "evidenceCount": 4,
    "duration": "45 min"
  }
}
```

---

### 5.6 Rute za korisnike — `/api/users/*` (protected, samo admin)

#### `GET /api/users` — Svi korisnici organizacije
Vraća sve korisnike sortirane po datumu kreiranja

#### `POST /api/users` — Dodaj novog radnika
**Request:** `{ name, email, role? }` (role default: `worker`)

**Logika:**
1. Proverava limit korisnika po planu (`maxUsers`) → 402 `USER_LIMIT_REACHED` ako je prekoračen
2. Generiše **privremenu lozinku** (format: `rec-sun-482` — dvije riječi + 3-cifreni broj)
3. Postavlja `mustChangePassword = true` (korisnik će morati da promijeni lozinku pri prvom loginu)
4. **Response:** vraća generisanu lozinku u polju `generatedPassword` (admin ju treba proslijediti radniku)

#### `PATCH /api/users/:id/toggle` — Aktiviraj/Deaktiviraj korisnika
Menja `active` boolean polje (on/off toggle)  
**Nije moguće deaktivirati samog sebe** (frontend onemogućava dugme)

---

### 5.7 Webhook rute — `/api/webhooks/*` (public, raw body)

Ova ruta se registrovala **prije** `express.json()` middleware-a jer Paddle šalje raw body potreban za signature verifikaciju.

#### `POST /api/webhooks/paddle` — Paddle webhook endpoint

**Koraci obrade:**
1. **Verifikacija signature** (Paddle v2 standard):
   - Učitava `paddle-signature` header format: `ts=<timestamp>;h1=<hash>`
   - Kreira HMAC-SHA256 od `ts:rawBody` koristeći `PADDLE_WEBHOOK_SECRET`
   - U `development` modu bez secret-a verifikacija se preskače
2. **Parsira event** i dispečer u zavisnosti od `event_type`

**Handlirani Paddle događaji:**
- `subscription.created` — Nova pretplata → ažurira org (plan, paddle IDs, status `active`)
- `subscription.updated` — Promjena/upgrade plana → ažurira plan i `maxUsers`
- `subscription.canceled` — Otkazivanje → postavlja `planStatus = 'canceled'` i `planExpiresAt` do kraja perioda
- `subscription.past_due` — Neuspješno plaćanje → `planStatus = 'past_due'`
- `transaction.completed` — Uspješna transakcija (trenutno samo loguje)

**Mapiranje Paddle price ID → plan** (trenutno placeholderi u `PLAN_MAP`):
- `starter` → 5 radnika, €14.99/mj
- `professional` → 20 radnika, €34.99/mj
- `business` → 50 radnika, €69.99/mj

---

## 6. EMAIL SERVIS (Nodemailer + Brevo SMTP)

Slanje emailova se vrši **asinhrono** (IIFE) nakon glavne operacije — ne blokira request/response ciklus. Greške u slanju emaila se samo loguju.

### 6.1 Konfiguracija
Brevo SMTP parametri iz `.env`:
- `BREVO_SMTP_HOST` (npr. `smtp-relay.brevo.com`)
- `BREVO_SMTP_PORT` (587 / 465)
- `BREVO_SMTP_USER` + `BREVO_SMTP_PASS` (API key)
- `BREVO_FROM_EMAIL` + `BREVO_FROM_NAME`

### 6.2 HTML Email template
Svi emailovi koriste isti custom template sa:
- Zelenim header-om (brand boja `#1D9E75`)
- Sekcijom za detalje zadatka (ime, prioritet, lokacija, vrijeme, datum)
- CTA dugmetom koje vodi na frontend URL (`FRONTEND_URL/tasks/:id`)
- Footer-om sa sloganom

### 6.3 Tri tipa email notifikacija
1. **`sendTaskAssignedEmail(worker, task, organization)`**
   - Prima: zadatak je dodijeljen → obavještava RADNIKA
   - Subject: `Novi zadatak: {naslov}`

2. **`sendTaskCompletedEmail(admin, worker, task)`**
   - Prima: zadatak završen → obavještava ADMINA
   - Subject: `Zadatak završen: {naslov}`

3. **`sendTaskRejectedEmail(admin, worker, task, reason)`**
   - Prima: zadatak odbijen → obavještava ADMINA + uzrok
   - Subject: `Zadatak odbijen: {naslov}`

---

## 7. KLIJENTSKA STRANA — FRONTEND

### 7.1 State Management (Zustand stores)

#### 7.1.1 `useAuthStore` — Autentifikacija
**Stanje:** `{ user, organization, token, loading }`  
**Token se čuva u `localStorage` pod ključem `fo_token`**

**Metode:**
- `init()` — poziva se u `useEffect` pri mountanju App komponente; provjerava važeći token → poziva `/auth/me`
- `login(email, password)` → snima token i user/org
- `register(orgName, name, email, password)` → isto
- `changePassword(current, new)` → mijenja `mustChangePassword = false` lokalno
- `logout()` → briše token iz localStorage i resetuje stanje

#### 7.1.2 `useTaskStore` — Zadaci i aktivnosti
**Stanje:** `{ tasks, selectedTask, activities, loading, error }`

**Metode:**
- `fetchTasks({ status?, date? })` — dohvaća listu
- `fetchTask(id)` — dohvaća detalje + aktivnosti za odabrani zadatak
- `createTask(taskData)` — kreira novi i dodaje na početak liste
- `updateStatus(id, status, gps?)` — mijenja status + refreshuje aktivnosti za odabrani
- `addActivity(taskId, text, note?, gps?)` — dodaje u niz aktivnosti
- `setSelectedTask(task)` / `clearError()`

### 7.2 Axios API servis (`api.js`)
```
baseURL: '/api'   → Vite proxy preusmjerava na http://localhost:5000
```

**Request interceptor:** automatski dodaje `Authorization: Bearer <fo_token>` iz localStorage  
**Response interceptor:** za svaki 401 odgovor briše token i redirecta na `/login`

### 7.3 Routing (React Router DOM)

Struktura ruta u [App.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/App.jsx):

| Ruta | Tip | Pristup | Opis |
|---|---|---|---|
| `/login` | Public | Samo guest | Forma za prijavu |
| `/register` | Public | Samo guest | Forma za registraciju |
| `/change-password` | Special | Auth + mustChangePassword | Forsirana promjena lozinke |
| `/` | Protected | Auth | Dashboard (default) |
| `/tasks` | Protected | Auth | Zadaci (lista + detalj) |
| `/activities` | Protected | Auth | Timeline svih aktivnosti |
| `/reports` | Protected | Auth | Izvještaji (dnevni + po zadatku) |
| `/admin` | Protected | Auth + samo admin | Upravljanje radnicima |
| `*` | Redirect | — | Na `/login` |

**Zaštitne komponente:**
- `ProtectedRoute` — ako nema token → `/login`; ako `mustChangePassword && nije na /change-password` → redirect; i obrnuto
- `PublicRoute` — ako već ima token → `/` (nemoj prikazivati login/register ulogovanima)

### 7.4 Layout komponenta
Lijevi sidebar sa navigacijom + glavni content area:
- Logo + naziv organizacije
- Nav stavke (ikonica + label):
  - Dashboard ⊞ (svi)
  - Zadaci ☑ (svi)
  - Aktivnosti ◎ (svi)
  - Izvještaji ▤ (svi)
  - Radnici ◎ (SAMO admin vidljiva)
- User section: inicijali, ime, uloga, dugme za odjavu ⎋

---

## 8. FUNKCIONALNOSTI PO STRANICAMA

### 8.1 Login Page ([LoginPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/LoginPage.jsx))
- Forma: email + lozinka
- Redirect nakon prijave na stranicu sa koje je korisnik došao (location state `from`)
- Link ka registraciji

### 8.2 Register Page ([RegisterPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/RegisterPage.jsx))
- Forma: naziv firme, ime, email, lozinka
- Kreira organizaciju + admin nalog u jednom koraku
- Automatski prijavljuje korisnika nakon registracije
- 7 dnevni besplatan trial period (default)

### 8.3 Change Password Page ([ChangePasswordPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/ChangePasswordPage.jsx))
- **Forsirana stranica:** prikazuje se samo ako `mustChangePassword = true`
- Forma: trenutna lozinka + nova + potvrda
- Client-side validacija: minimalna dužina (6) + podudaranje
- Nakon uspjeha → čeka 2 sekunde → redirect na `/`

### 8.4 Dashboard Page ([DashboardPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/DashboardPage.jsx))
**Prikazuje zadatke za DANAŠNJI DAN**
- Personalizovani pozdrav (Dobro jutro/dan/veče) prema satima
- Datum formatiran lokalno (Bosanski jezik, `date-fns/locale/bs`)
- **Statistike (4 karte):**
  - Ukupno danas (svi zadaci)
  - Završenih
  - U toku
  - Na čekanju
- Lista današnjih zadataka (prioritet tačka + lokacija + vrijeme + status badge)
- Klik na zadatak → `/tasks`

### 8.5 Tasks Page ([TasksPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/TasksPage.jsx))
**Dva panela** (split screen):

**Lijevi panel — Lista zadataka:**
- Filteri za status: Svi / Na čekanju / Prihvaćen / U toku / Završen
- Svaki zadatak: prioritet (žuta/crvena/zelena tačka), naslov, lokacija 📍, vrijeme 🕐, dodijeljen radnik, status badge + prioritet badge
- **Admin:** dugme "+ Novi zadatak" otvara modal za kreiranje

**Desni panel — Detalji odabranog zadatka:**
- Header: naslov + badge-ovi
- Info: lokacija, vrijeme, opis
- **Radne akcije (prema statusu):**
  - `pending` → [✓ Prihvati] [✕ Odbij]
  - `accepted` → [▶ Počni izvršenje]
  - `inprogress` → [☑ Završi zadatak]
- **GPS automatizam:** Prilikom klika na akcije, pokušava se dohvatiti trenutna lokacija (geolocation API, timeout 3s) i poslati uz status
- **Timeline aktivnosti:** lista sa vremenom, tekstom, napomenom, GPS indikatorom
- **Dodavanje aktivnosti (SAMO u statusu `inprogress`):** input + Enter ili + dugme

**Modal za Novi zadatak (admin):**
- Polja: naziv, lokacija, prioritet (select), dodijeli radniku (select iz liste korisnika), vrijeme početak/kraj, opis
- Nakon kreiranja: refreshuje listu, zatvara modal, šalje email radniku (server-side)

### 8.6 Activities Page ([ActivitiesPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/ActivitiesPage.jsx))
- **Datum filter** (date input, default: danas)
- **Timeline aktivnosti za odabrani dan:**
  - Vrijeme (lijevo, fixed width)
  - Tačka + vertikalna linija (povezuje aktivnosti)
  - Tekst aktivnosti → naziv zadatka (link) → napomena → 📍 GPS → 📎 broj dokaza
  - Ime radnika (desno)
- Footer: broj aktivnosti ukupno

### 8.7 Reports Page ([ReportsPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/ReportsPage.jsx))
**Dva panela:**

**Lijevi panel:**
- Datum filter
- Lista zadataka za taj dan (kao u dnevnom izvještaju) sa status badge-om

**Desni panel — Detaljan izvještaj za odabrani zadatak:**
- Header: naslov + datum/vrijeme + [🖨 Štampaj] dugme (koristi `window.print()`)
- **Info grid (4 karte):** radnik, lokacija, broj aktivnosti, trajanje
- **GPS Check-in sekcija:** redovima za Prihvaćen / Dolazak / Završeno sa vremenom i koordinatama (prikazuje samo one postoje)
- **Timeline aktivnosti:** formatirano kao u TasksPage, ali sa GPS koordinatama (do 5 decimale) i dokazima
- Footer: vrijeme generisanja izvještaja

### 8.8 Admin Page (Radnici) ([AdminPage.jsx](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/pages/AdminPage.jsx))
**Samo admin može vidjeti stranicu** (inače poruka o zabrani pristupa)

**Header info:**
- Broj aktivnih radnika
- Trenutni plan (capitalize)
- Limit korisnika po planu
- Dugme: "+ Dodaj radnika"

**Lista radnika:**
- Inicijali (krug) + ime + email + uloga
- Status badge: Aktivan/Neaktivan
- Dugme [Deaktiviraj] / [Aktiviraj] — **toggle** (nije moguće na samom sebi)

**Plan info card (dashed border):**
- Ime plana + status pretplate
- Dugme "Upravljaj pretplatom ↗" (placeholder za Paddle checkout)

**Modal za dodavanje radnika:**
- Forma: ime, email, uloga (worker/admin)
- Nakon uspješnog kreiranja: prikazuje DRUGI modal sa **privremenom lozinkom** (format `riječ-riječ-123`) koja se mora proslijediti radniku; objašnjenje da će biti tražena promjena pri prvom loginu

---

## 9. KORISNIČKI WORKFLOW — PRIJENOS STANJA ZADATKA

```
┌──────────────────────────────────────────────────────────────────┐
│                     FLOW ZADATKA (Statusi)                        │
│                                                                    │
│   ┌──────────┐   PRIHVATI    ┌──────────┐   POČNI     ┌─────────┐│
│   │ PENDING  │──────────────►│ ACCEPTED │────────────►│INPROGRES││
│   │(Na čeka.)│   ODBIJ       │(Prihvać.)│  (dolazak)  │ (U toku)││
│   └────┬─────┘  ┌─────────►  └──────────┘             └────┬────┘│
│        │        │                                           │     │
│        │        │ Odustani                                  │     │
│        ▼        ▼                                           ▼     │
│   ┌──────────┐                                         ┌────────┐ │
│   │ REJECTED │◄────────────────────────────────────────│COMPLET │ │
│   │(Odbijen) │                ZAVRŠI                   │(Završ.)│ │
│   └──────────┘                                         └────────┘ │
│                                                                    │
│  AKCIJE:     Admin kreira → Worker mijenja status → sistem loguje  │
│  EMAIL:      [assigned→worker]  [completed/rejected→admin]         │
│  GPS:             ✓accepted          ✓arrival        ✓completed    │
│  ACTIVITY:    ×           ✓              ✓              ✓          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. PLANOVI PRETPLATE (Subscription tiers)

Definisani u [planFeatures.js](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/server/src/config/planFeatures.js):

| Plan | maxWorkers | Cijena (€/m) | Status |
|---|---|---|---|
| **Trial** | 999 (neograničeno) | €0 / 7 dana | Default nakon registracije, `planStatus = 'trialing'` |
| **Starter** | 5 | €14.99 | Za male timove |
| **Professional** | 20 | €34.99 | Za rastuće kompanije |
| **Business** | 50 | €69.99 | Za velike terenske ekipe |

**Napomena:** Paddle `price_id` mapiranje u `PLAN_MAP` u webhooks.js trenutno čeka na stvarne Paddle ID-ove (TODO komentar).

---

## 11. STILOVI I UI SISTEM (Tailwind CSS)

### 11.1 Brand paleta boja
Ugao zelena u [tailwind.config.js](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/tailwind.config.js):
```
brand-50  = #E1F5EE  (svijetla za pozadine)
brand-100 = #9FE1CB
brand-400 = #1D9E75  (glavna / primary dugmad)
brand-600 = #0F6E56  (hover / tamnija)
brand-800 = #085041
brand-900 = #04342C
```

### 11.2 Custom komponente (Tailwind @layer components)
U [index.css](file:///c:/Users/Administrator/Documents/trae_projects/Pustopoljina/FieldAssign%20app/client/src/index.css):

- `.btn` — osnovno dugme (bijelo, border, hover)
- `.btn-primary` — zelena varijanta
- `.btn-danger` — crvena varijanta (odbij, deaktiviraj)
- `.input` — input polja + textarea + select
- `.label` — mali uppercase label iznad inputa
- `.card` — bijela karta sa laganim borderom + rounded-xl
- `.badge-{status}` — male labele za statuse (pending=gray, accepted=blue, inprogress=amber, completed=green, rejected=red)
- `.badge-{priority}` — badge za prioritet (high=crveno, medium=žuto, low=zeleno)

---

## 12. ENVIRONMENT VARIJABLE (.env)

### Server `.env.example`
| Varijabla | Opis |
|---|---|
| `PORT` | Port servera (default: 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Tajni ključ za potpisivanje JWT tokena |
| `JWT_EXPIRES_IN` | Vrijeme trajanja tokena (default: `7d`) |
| `PADDLE_WEBHOOK_SECRET` | Za verifikaciju Paddle webhook signature |
| `CLIENT_URL` | Dozvoljen CORS origin (default: http://localhost:5173) |
| `BREVO_SMTP_HOST` | Brevo SMTP host |
| `BREVO_SMTP_PORT` | 587 ili 465 |
| `BREVO_SMTP_USER` | Brevo login |
| `BREVO_SMTP_PASS` | Brevo API key |
| `BREVO_FROM_EMAIL` | Verified sender email |
| `BREVO_FROM_NAME` | Ime pošiljaoca |
| `FRONTEND_URL` | Production frontend URL za linkove u emailovima |

---

## 13. SIGURNOST — IMPLEMENTIRANE MJERE

1. **Password Security:** bcrypt (12 rounds) — nikada plain text u bazi
2. **JWT Autentifikacija:** Bearer token, verifikacija na svakom zaštićenom endpointu, 401 za nevažeće
3. **Role-Based Access Control (RBAC):**
   - `requireAdmin` middleware na određenim rutama
   - Dopoljni provjere u handlerima (npr. worker samo svoje zadatke gleda/mijenja)
4. **CORS:** Strict origin policy (samo `CLIENT_URL`)
5. **Input Validacija:** Zod sheme za auth endpointse; Mongoose built-in validatori; client-side validacije
6. **Injection zaštita:** Mongoose + parametrizovani upiti (direktan MongoDB injection neće proći)
7. **Sensitive data masking:** `toJSON()` na User modelu skriva password iz API odgovora
8. **Paddle webhook security:** HMAC-SHA256 signature verification + `timingSafeEqual` za zaštitu od timing napada
9. **Deaktivacija naloga:** `active` flag + provjera tokom autentifikacije (403)
10. **Forced password reset:** `mustChangePassword` za nove radnike (sa privremenom lozinkom) + frontend guard

---

## 14. BUDEĆE FUNKCIONALNOSTI (ZAPOČETE ALI NEDOVRŠENE)

U modelu Task postoje polja koja označavaju planirane nadogradnje:
- `isRecurring` / `recurringPattern` — Podrška za **ponavljajuće zadatke** (dnevno, sedmično itd.) — polja postoje u shemi ali nema UI/API logike
- `evidence[]` u Activity modelu — **Upload dokaza** (fotografije, snimci) — schema je spremna za URL-ove ka cloud storage-u (npr. S3), ali upload endpoint + frontend file picker još ne postoje
- `requireActiveSubscription` middleware — napisan ali nije priključen na rute (pretplata se trenutno ne provjerava pri operacijama)

---

*Kraj dokumentacije — generisano za FieldAssign v1.0*
