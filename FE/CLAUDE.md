# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WGS Admin Page Frontend - React-based admin dashboard for building management operations. Manages tasks (checklist harian), users (OB, HR, Admin), locations (gedung/lantai/ruangan), and reports.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # TypeScript compile + Vite build
npm run lint     # ESLint check
npm run preview  # Preview production build
```

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Routing**: React Router DOM v7
- **State/Data**: TanStack Query (React Query) v5
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Validation**: Zod
- **Build Tool**: Vite

## Architecture

### Data Flow Pattern

All API calls go through `src/api/*.ts` modules → `src/hooks/*.ts` (TanStack Query) → React components.

Never call `apiClient` directly from components. Always use hooks.

### API Structure

```
src/api/          # API function definitions
src/hooks/        # TanStack Query hooks (data + mutations)
src/types/        # TypeScript interfaces
src/services/     # apiClient singleton
src/config/       # Endpoint URLs
```

### Key API Endpoints (quick reference)

| Feature | Endpoint |
|---------|----------|
| Auth | `/api/auth/*` |
| User profile (self) | `/api/user/profile` |
| Karyawan | `/api/karyawan/*` |
| OB | `/api/ob/*` |
| Users (Admin) | `/api/admin/user` |
| Reports (Admin) | `/api/admin/laporan` |
| Locations | `/api/lokasi` |
| Floors | `/api/lantai` |
| Rooms | `/api/ruangan` |
| Categories | `/api/kategori` |
| Tasks (jenis tugas) | `/api/tugas` |
| Checklist Harian | `/api/checklist-harian` |
| Notifications | `/api/notifikasi` |
| WebSocket | `/ws` |

> Full request/response contracts for every endpoint are documented in **[API Reference](#api-reference-full)** below — read that section before writing or debugging any API call, hook, or mutation. Don't guess field names or status codes; they're all specified there.

### TanStack Query Hooks

- `useTasks(filters?)` - Tasks with server-side filter params
- `useLokasi()` - Location hierarchy (gedung → lantai → ruangan)
- `useUsers()` - User management
- `useKategori()` - Task categories
- `useTugasOptions()` - Task name options (deprecated for checklist creation - now uses text field `nama_tugas`)
- `useLaporan()` - Reports (talks to `/api/admin/laporan`, page-based pagination — see note in API Reference)

### Location Data Model

The `useLokasi` hook fetches from 3 endpoints and normalizes into a nested hierarchy:

```
gedungList: [{
  id, nama, kapasitas,
  lantai: [{
    id, label, nama,
    ruangan: [{ id, nama }]
  }]
}]
```

### Auth & Permissions

`AuthContext` decodes JWT and assigns permissions based on role:

| Role | Permissions |
|------|-------------|
| Admin | Full access |
| HR | tasks:create, tasks:edit, lokasi:read |
| OB | tasks:read, lokasi:read |

Use `<Can permission="...">` or `<Can roles={["Admin"]}>` components to gate UI elements.

Backend roles seen across the API surface: **Admin**, **HR**, **OB**, **Karyawan**. Every protected endpoint below is tagged with which role(s) can call it — check this before wiring up a new mutation so you don't build UI for a role that will just get a 403.

### Status Mapping

⚠️ **There are at least three separate status vocabularies in this system. Do not treat them as interchangeable — this is a common source of the "status tidak berubah" class of bugs.**

**1. Laporan (Report) status — backend enum** (from `/api/admin/laporan` PATCH rules):
`BELUM_DIKERJAKAN` | `PENDING` | `SELESAI` | `DIBATALKAN`

**2. Laporan status — UI labels used in report tables** (observed in `StatusBadge` on the dashboard/report pages): `Menunggu` | `Ditugaskan` | `Selesai` | `Ditolak`

Likely mapping (verify against the actual mapper in `useLaporan.ts` before relying on this):
| Backend | UI |
|---|---|
| `BELUM_DIKERJAKAN` | `Menunggu` |
| `PENDING` | `Ditugaskan` |
| `SELESAI` | `Selesai` |
| `DIBATALKAN` | `Ditolak` |

**3. Checklist Harian status — a completely different enum**, not shared with Laporan:
`BELUM_DIKERJAKAN` | `SEDANG_DIKERJAKAN` | `SELESAI` | `TERLEWAT`

UI displays: `Belum`, `Proses`, `Selesai`, `Delayed`

Mapper functions in `useTasks.ts`:
- `mapApiStatus()` - API → UI
- `mapUiStatus()` - UI → API

Note both enums share the literal string `BELUM_DIKERJAKAN` and `SELESAI` — it's easy to accidentally pass a Checklist status into a Laporan update (or vice versa) since TypeScript won't catch a plain string mismatch unless the types are properly narrowed. **Prioritas** (report priority) is a separate field entirely: `STANDARD` | `URGENT`.

### Environment

- `.env` - API base URL (defaults to vite proxy in dev)
- Vite proxy redirects `/api/*` to backend (configured in `vite.config.ts`)
- WebSocket proxy at `/ws` for real-time notifications
- The Swagger/OpenAPI doc for this project points at an ngrok tunnel (`https://stylar-nonseverable-denver.ngrok-free.dev`) for local dev — this URL is ephemeral and will rotate; never hardcode it, always resolve the base URL through `.env` / `src/config`.

### ID Handling

Backend UUIDs may come with prefixes (e.g., `gd-`, `lt-`). The `stripIdPrefix()` utility removes these when sending to API. Frontend components should NOT strip IDs - let hooks handle it.

### Response Wrapping

Backend returns wrapped responses: `{ success: true, data: {...} }`. The `apiClient` unwraps to `response.data`, but hooks like `useTasks.extractArray()` handle multiple possible structures:
- `response.checklist.items`
- `response.data`
- `response.items`
- Direct array

Error responses follow a separate shape: `{ success: false, message: string, errors: {} }`.

**Two different pagination styles exist — don't mix them up in a shared hook:**
- **Offset/page-based** (`page`, `limit`, `meta: { total_items, current_page, limit, total_pages }`) — used by all `/api/admin/*` list endpoints and `/api/checklist-harian`.
- **Cursor-based** (`cursor`, `next_cursor`) — used only by `GET /api/user/profile` (the logged-in user's own report history).

### Route Structure

```
/login           - Login page
/activate-account - Account activation
/dashboard       - Main dashboard
/tasks           - Task management (CRUD + filter by lokasi/lantai)
/users           - User management
/datalokasi      - Location management (gedung/lantai/ruangan)
/reports         - Reports view
```

---

## API Reference (full) {#api-reference-full}

Source: LaporOB API v1.0.0 (OpenAPI 3.0). Base response envelope for all endpoints below (unless noted otherwise):
```json
// success
{ "success": true, "message": "string", "data": { } }
// error
{ "success": false, "message": "string", "errors": { } }
```

### Auth (Publik — no token required)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/check-token` | Verifikasi token aktivasi |
| POST | `/api/auth/activate-account` | Aktivasi akun & set password pertama kali |

**POST `/api/auth/login`**
Request:
```json
{ "identifier": "string", "password": "string" }
```
- `200` Login berhasil → `{ "success": true, "message": "string", "data": { "jwt_token": "string" } }`
- `401` Login gagal

**GET `/api/auth/check-token`**
Query: `token` (string, required) — token aktivasi dari link email.
- `200` Token valid

**POST `/api/auth/activate-account`**
Query: `token` (string, required) — token aktivasi dari URL.
Request:
```json
{ "password": "string", "confirmPassword": "string" }
```
- `200` → `{ "success": true, "message": "Akun berhasil diaktivasi, silahkan login" }`
- `400` Token tidak valid / Validation Failed / Password tidak cocok

⚠️ Debugging note: `check-token` (GET) and `activate-account` (POST) are **two separate calls against the same token**. A common bug pattern is validating the token once via `check-token` on page load, then letting it silently expire (or letting the backend treat it as single-use) before the user actually submits the password form on `activate-account`. Confirm whether `check-token` has any side effect on the token (e.g. marks it "viewed") before assuming it's a pure read.

### User (Semua role — requires auth)

| Method | Path | Description |
|---|---|---|
| GET | `/api/user/profile` | Ambil profil + riwayat laporan |
| PATCH | `/api/user/profile` | Update profile sendiri |
| GET | `/api/user/profile/laporan/{laporan_id}` | Detail laporan user (OB & Karyawan) |

**GET `/api/user/profile`**
Query: `search`, `status`, `cursor`, `limit` (default `10`).
- `200`:
```json
{
  "success": true,
  "message": "string",
  "data": {
    "user": {
      "id": "uuid", "nama_lengkap": "string", "username": "string", "email": "string",
      "role": "string", "profile_picture": "string",
      "total_laporan": 0, "tasksCompleted": 0, "rejected": 0
    },
    "laporan": {
      "items": [{
        "id": "uuid", "kategori": "string", "deskripsi_kendala": "string",
        "status": "BELUM_DIKERJAKAN", "prioritas": "STANDARD",
        "foto_masalah": ["string"], "lokasi": "string", "nomor_lantai": 0,
        "nama_ob": "string", "created_at": "ISO date", "updated_at": "ISO date"
      }],
      "next_cursor": "string",
      "meta": { "total_items": 0, "current_page": 0, "limit": 0, "total_pages": 0 }
    }
  }
}
```
Note: this endpoint mixes cursor pagination (`next_cursor`) AND a `meta` block that looks page-based — read both, but paginate using `cursor`/`next_cursor` since that's the field actually named for it.

**PATCH `/api/user/profile`** (multipart/form-data)
Fields: `nama_lengkap` (string), `profile_picture` (binary file)
- `200` Berhasil mengubah profile
- `400` Validation Failed
- `401` Unauthorized
- `404` User tidak ditemukan

**GET `/api/user/profile/laporan/{laporan_id}`**
- `200` Berhasil

### Karyawan

| Method | Path | Description |
|---|---|---|
| GET | `/api/karyawan/dashboard` | Dashboard karyawan |
| POST | `/api/karyawan/laporan` | Buat laporan baru |

**POST `/api/karyawan/laporan`** (multipart/form-data)
Fields (all required): `lantai_id` (uuid), `ruangan_id` (uuid), `kategori_id` (uuid), `deskripsi_kendala` (string), `prioritas` (string), `foto_masalah` (array of files, max 5)
- `201` Laporan berhasil dibuat
- **WebSocket**: sends `ADMIN_MENUGASKAN_OB` to **all OB + all admin** in real time.

### OB

| Method | Path | Description |
|---|---|---|
| GET | `/api/ob/dashboard` | Dashboard OB (checklist harian + daftar laporan) |
| PATCH | `/api/ob/laporan/{laporan_id}` | Ambil laporan |
| POST | `/api/ob/laporan/{laporan_id}/batalkan` | Batalkan laporan (kembalikan ke antrean) |
| GET | `/api/ob/laporan/{laporan_id}/gabung` | Daftar permintaan gabung |
| POST | `/api/ob/laporan/{laporan_id}/gabung` | Kirim permintaan gabung |
| PATCH | `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/setujui` | Setujui permintaan gabung |
| PATCH | `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/tolak` | Tolak permintaan gabung |
| POST | `/api/ob/laporan/{laporan_id}/gabung/keluar` | Keluar dari kolaborasi (anggota) |
| PATCH | `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/keluarkan` | Keluarkan anggota (pemilik) |
| PATCH | `/api/ob/laporan/{laporan_id}/kolaborasi` | Buka/tutup kolaborasi laporan |

**GET `/api/ob/dashboard`**
Business logic: returns (a) all laporan already assigned to this OB (`ob_id` = logged-in OB), **plus** (b) unassigned laporan (`ob_id` is null) whose status is anything **other than** `PENDING`.
- `200` Berhasil

**PATCH `/api/ob/laporan/{laporan_id}`** — "Ambil laporan"
Side effects (automatic): `status → PENDING`, `ob_id → OB yang login`, `dikerjakan_at → now`.
- `200` → `{ "success": true, "message": "Laporan berhasil diambil" }`
- `400` Validation Failed (format `laporan_id` tidak valid) → `{ "success": false, "message": "string", "errors": {} }`
- `401` Unauthorized
- `403` Forbidden (bukan OB)
- `404` Laporan tidak ditemukan
- `409` **Laporan sudah diambil oleh OB lain** → `{ "success": false, "message": "string", "errors": {} }` — this is the race-condition guard; the frontend MUST handle 409 explicitly (e.g. toast "sudah diambil OB lain, refresh daftar") rather than treating it as a generic error.
- `500` Terjadi kesalahan, tidak bisa mengambil laporan
- **WebSocket**: sends `LAPORAN_DIKERJAKAN` to the **pelapor** (the karyawan who reported it).

**POST `/api/ob/laporan/{laporan_id}/batalkan`** (multipart/form-data)
Fields: `catatan` (string, min 5 chars, required), `foto_selesai` (array of files, required)
Side effects: `status → DIBATALKAN`, `ob_id → null`, `dibatalkan_at → now`, `alasan_gagal ← catatan`.
- `200` Laporan dibatalkan
- `403` Anda tidak memiliki akses ke laporan ini (bukan OB pemilik)
- `404` Laporan tidak ditemukan
- `500` Terjadi kesalahan
- **WebSocket**: sends `LAPORAN_DIBATALKAN` to the pelapor, message includes the cancellation reason.

**GET `/api/ob/laporan/{laporan_id}/gabung`**
- `200`:
```json
{
  "success": true, "message": "string",
  "data": [{ "id": "uuid", "ob": { "id": "uuid", "nama_lengkap": "string" }, "status": "PENDING", "created_at": "ISO date" }]
}
```
- `400` Validation Failed
- `401` Unauthorized

**POST `/api/ob/laporan/{laporan_id}/gabung`** — OB lain mengajukan gabung ke laporan existing
- `201`:
```json
{ "success": true, "message": "string", "data": { "id": "uuid", "laporan_id": "uuid", "ob_id": "uuid", "status": "PENDING", "created_at": "ISO date" } }
```
- `400` Validation Failed
- `401` Unauthorized
- **WebSocket**: sends `GABUNG_LAPORAN` to the OB pemilik laporan.

**PATCH `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/setujui`**
- `200` Permintaan gabung disetujui / `400` / `401`
- **WebSocket**: sends `GABUNG_DISETUJUI` to the OB peminta.

**PATCH `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/tolak`**
- `200` Permintaan gabung dibatalkan / `400` / `401`
- **WebSocket**: sends `GABUNG_DIBATALKAN` to the OB peminta.

**POST `/api/ob/laporan/{laporan_id}/gabung/keluar`** — only an **anggota** (not the OB utama/owner) can call this.
- `200` Berhasil keluar dari kolaborasi / `400` / `401`
- **WebSocket**: sends `KELUAR_KOLABORASI` to the OB utama.

**PATCH `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/keluarkan`** — OB pemilik mengeluarkan anggota.
- `200` Anggota berhasil dikeluarkan / `400` / `401`
- **WebSocket**: sends `DIKELUARKAN_KOLABORASI` to the OB yang dikeluarkan.

**PATCH `/api/ob/laporan/{laporan_id}/kolaborasi`** — toggle whether the report accepts join requests.
Request:
```json
{ "is_open": true }
```
- `200` Status kolaborasi berhasil diubah
- `400` Validation Failed
- `401` Unauthorized
- `403` Hanya OB pemilik laporan yang bisa mengatur kolaborasi
- `404` Laporan tidak ditemukan
- **WebSocket**: sends `KOLABORASI_DIBUKA` to all other OB.

### Admin

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/user` | List semua user |
| POST | `/api/admin/user` | Buat user baru |
| GET | `/api/admin/user/all-ob` | List semua OB |
| GET | `/api/admin/user/all-karyawan` | List semua karyawan |
| GET | `/api/admin/dashboard` | Dashboard admin + KPI |
| GET | `/api/admin/user-stats` | Statistik user |
| GET | `/api/admin/laporan` | List laporan dengan filter |
| GET | `/api/admin/laporan/{laporan_id}` | Detail laporan |
| PATCH | `/api/admin/laporan/{laporan_id}` | Update status/prioritas/catatan/OB laporan |
| DELETE | `/api/admin/laporan/{laporan_id}` | Hapus laporan beserta histori & kolaborasi (cascade, permanen) |
| GET | `/api/admin/user/{user_id}` | Detail user |
| PATCH | `/api/admin/user/{user_id}` | Update user |
| DELETE | `/api/admin/user/{user_id}` | Hapus user |
| GET | `/api/admin/user/{user_id}/performance/ob` | Statistik performa OB |
| GET | `/api/admin/user/{user_id}/performance/karyawan` | Statistik performa Karyawan |

**GET `/api/admin/user`**
Query: `page` (default 1), `limit` (default 10), `search`, `role_id` (uuid)
- `200` Daftar user

**POST `/api/admin/user`**
Request:
```json
{ "username": "string", "email": "user@example.com", "nama_lengkap": "string", "role_id": "uuid" }
```
- `201` User berhasil dibuat

Note: this creates the user with **no password** — the flow is "admin creates account → activation email sent → user hits `check-token`/`activate-account` to set their own password". If token-related activation bugs are being reported, this is the entry point to trace from.

**GET `/api/admin/user/all-ob`** / **GET `/api/admin/user/all-karyawan`**
- `200` Daftar ob / Daftar karyawan (no query params)

**GET `/api/admin/dashboard`**
Query: `period` — one of `harian`, `mingguan`, `bulanan`, `tahunan` (default `mingguan`)
- `200` Data dashboard

**GET `/api/admin/user-stats`**
- `200` Statistik user

**GET `/api/admin/laporan`**
Query: `page`, `limit`, `search`, `status`, `prioritas`, `lokasi_id`, `lantai_id`, `start_date`, `end_date`, `sort_by` (`created_at`|`updated_at`|`prioritas`|`status`|`nama_karyawan`|`lokasi`), `sort_order` (`asc`|`desc`, default `desc`)
- `200` Response contains:
  - `laporan` (paginated items + pagination meta)
  - `ruangan_terpopuler`: array of `{ ruangan_id, nama_ruangan, nama_lantai, nama_lokasi, total_laporan }`
  - `laporan_aktif`: total count of active reports

**GET `/api/admin/laporan/{laporan_id}`**
- `200`:
```json
{
  "success": true, "message": "Berhasil mendapatkan detail laporan",
  "data": {
    "id": "uuid", "status": "BELUM_DIKERJAKAN", "prioritas": "STANDARD",
    "nama_karyawan": "string", "lokasi": "string", "kategori": "string",
    "ob_ditugaskan": "string",
    "waktu_laporan": "ISO date", "waktu_selesai": "ISO date",
    "dikerjakan_at": "ISO date", "selesai_at": "ISO date", "dibatalkan_at": "ISO date",
    "admin_catatan": "string", "deskripsi_kendala": "string",
    "bukti_foto": { "urls": ["string"], "diupload_oleh": "string", "jam_upload": "string" }
  }
}
```
- `400` Validation Failed (format `laporan_id` tidak valid)
- `401` Unauthorized
- `403` Forbidden (bukan admin)
- `404` Laporan tidak ditemukan
- `500` Gagal mendapatkan detail laporan

**PATCH `/api/admin/laporan/{laporan_id}`** ⚠️ most important endpoint for report-status bugs
Partial update — **at least one field must be non-null** (empty string `""` is treated as null by the backend, i.e. it will NOT count toward satisfying that rule).

Request example:
```json
{ "status": "SELESAI", "admin_catatan": "Sudah dikonfirmasi selesai oleh admin" }
```

**Status transition side-effects (server-side, automatic):**
| New `status` | Automatic side-effect |
|---|---|
| `BELUM_DIKERJAKAN` | Re-open: `ob_id → null`, `dikerjakan_at → cleared` |
| `PENDING` | `dikerjakan_at → now` (requires an OB to already be set — see 400 below) |
| `SELESAI` | `selesai_at → now` (admin approval) |
| `DIBATALKAN` | `dibatalkan_at → now`, `ob_id → null` (returned to queue) |

`admin_catatan` is stored as an internal admin note (not shown to the reporter unless the UI explicitly surfaces it).

- `200` → `{ "success": true, "message": "Laporan berhasil diperbarui" }`
- `400` Validation Failed — **tidak ada field non-null**, **enum status tidak valid**, **format UUID salah**, atau **status `PENDING` dikirim tanpa `ob_id`** → `{ "success": false, "message": "string", "errors": {} }`
- `401` Unauthorized
- `403` Forbidden (bukan admin)
- `404` Laporan tidak ditemukan / OB tidak ditemukan
- `500` Gagal memperbarui laporan

⚠️ If "status tidak berubah" bugs are being reported on this endpoint specifically, check in this order:
1. Is the FE sending the **exact enum string** (`BELUM_DIKERJAKAN`/`PENDING`/`SELESAI`/`DIBATALKAN`), not the UI label (`Menunggu`/`Ditugaskan`/etc.)?
2. Is the FE sending `status: ""` by accident (e.g. an uncontrolled `<select>` defaulting to empty) — the backend silently treats this as "no field set," so if it's the *only* field in the payload, expect a `400`, not a silent no-op.
3. Setting `PENDING` without also sending a valid `ob_id` will `400` — does the FE surface that error to the user, or does it fail silently and just leave the row stale in the table?
4. After a successful `200`, does the FE re-fetch (`invalidateQueries`) the laporan list/detail, or does it rely on stale local/optimistic state?

**DELETE `/api/admin/laporan/{laporan_id}`** ⚠️ hard delete, no undo
Menghapus laporan **secara permanen**. Histori pekerjaan dan data kolaborasi terkait ikut terhapus via **cascade**.
- `200` → `{ "success": true, "message": "Laporan berhasil dihapus" }`
- `401` Unauthorized
- `403` Forbidden (bukan admin)
- `404` Laporan tidak ditemukan
- `500` Gagal menghapus laporan

Notes:
- This is a **hard delete** (not a status change like `DIBATALKAN`) — there's no soft-delete/`is_deleted` flag and no restore path implied by the spec. The FE **must** confirm before calling this (a `window.confirm`/modal is not optional here — treat it the same as the delete-user confirmation pattern already used elsewhere).
- Cascade explicitly includes: laporan's own history (`dikerjakan_at`/`selesai_at`/`dibatalkan_at` timeline) **and** any `kolaborasi`/`gabung` records tied to it (join requests, approved collaborators). If an OB currently has this laporan open in their dashboard or a "gabung" modal, expect a `404` on their next action against it — the FE should handle a `404` on any `/api/ob/laporan/{laporan_id}/*` call gracefully (e.g. "laporan ini sudah dihapus admin") rather than crashing.
- No `200` response body field confirms *what* was cascaded (no count of deleted collaborations, etc.) — if you need to show "X histori dan Y kolaborasi ikut terhapus" in the UI, that data isn't in this response; you'd have to snapshot it client-side before calling delete, or ask the backend to add it.
- After a successful delete, **invalidate/refetch both** the admin laporan list/detail queries **and** any OB-side queries touching that laporan (dashboard list, gabung list) if they're cached — this endpoint is a good candidate for the same "stale state after a destructive action" bug class already flagged for `PATCH` above.

**GET `/api/admin/user/{user_id}`**
- `200` Data user

**PATCH `/api/admin/user/{user_id}`** (multipart/form-data)
Fields (all optional, partial update presumed): `username`, `email`, `password`, `nama_lengkap`, `role_id`, `profile_picture` (binary)
- `200` User berhasil diupdate

**DELETE `/api/admin/user/{user_id}`**
- `200` User berhasil dihapus

**GET `/api/admin/user/{user_id}/performance/ob`**
Query: `period` (`mingguan`|`bulanan`|`tahunan`, default `mingguan`)
- `200` → `{ "success": true, "message": "Berhasil mendapatkan statistik performa OB", "data": {} }` (shape not further specified in the spec — verify against actual response)
- `400` format `user_id` tidak valid atau `period` tidak valid
- `401` / `403` (bukan admin) / `404` OB tidak ditemukan / `500`

**GET `/api/admin/user/{user_id}/performance/karyawan`**
Query: `period` (`mingguan`|`bulanan`|`tahunan`, default `mingguan`)
- `200` → `{ "success": true, "message": "Berhasil mendapatkan statistik performa karyawan", "data": { "laporan_terkirim": 15 } }`
- `400` / `401` / `403` (bukan admin) / `404` Karyawan tidak ditemukan / `500`

### Lokasi / Lantai / Ruangan / Kategori / Tugas (Admin CRUD)

All five follow the same standard CRUD shape: `GET` list, `POST` create, `GET /{id}` detail, `PATCH` (or `PUT` for Kategori) edit, `DELETE` remove. Response bodies for list/detail aren't specified in the spec beyond "daftar X" / "data X" — treat as `{ success, message, data }` with `data` shaped like the create/edit request body plus `id`.

| Resource | List | Create | Detail | Edit | Delete |
|---|---|---|---|---|---|
| Lokasi | `GET /api/lokasi` | `POST /api/lokasi` `{ nama_lokasi, jumlah_lantai }` | `GET /api/lokasi/{lokasi_id}` | `PATCH /api/lokasi/{lokasi_id}` | `DELETE /api/lokasi/{lokasi_id}` |
| Lantai | `GET /api/lantai?lokasi_id=` | `POST /api/lantai` `{ lokasi_id, nomor_lantai }` | `GET /api/lantai/{lantai_id}?lokasi_id=` | `PATCH /api/lantai/{lantai_id}?lokasi_id=` `{ nomor_lantai }` | `DELETE /api/lantai/{lantai_id}?lokasi_id=` |
| Ruangan | `GET /api/ruangan?lantai_id=` | `POST /api/ruangan` `{ lantai_id, nama }` | `GET /api/ruangan/{ruangan_id}?lantai_id=` | `PATCH /api/ruangan/{ruangan_id}?lantai_id=` `{ nama }` | `DELETE /api/ruangan/{ruangan_id}?lantai_id=` |
| Kategori | `GET /api/kategori` | `POST /api/kategori` `{ nama_kategori }` | `GET /api/kategori/{kategori_id}` | **`PUT` (not PATCH)** `/api/kategori/{kategori_id}` `{ nama_kategori }` | `DELETE /api/kategori/{kategori_id}` |
| Tugas | `GET /api/tugas?kategori_id=` | `POST /api/tugas` `{ kategori_id, nama_tugas }` | `GET /api/tugas/{tugas_id}` | `PATCH /api/tugas/{tugas_id}` `{ kategori_id, nama_tugas, is_active }` | `DELETE /api/tugas/{tugas_id}` |

⚠️ **Kategori edit uses `PUT`, everything else uses `PATCH`** — if a `useKategori` mutation hook was copy-pasted from `useTugas`/`useLokasi` and still calls `.patch()`, that's a likely silent-failure bug (some backends 404/405 a wrong verb, others just ignore it depending on router config — verify which happens here).

### Checklist Harian

| Method | Path | Description |
|---|---|---|
| GET | `/api/checklist-harian` | List checklist harian (OB, HR, Admin) |
| POST | `/api/checklist-harian` | Buat checklist harian (Admin) |
| GET | `/api/checklist-harian/{checklist_harian_id}` | Detail checklist |
| PATCH | `/api/checklist-harian/{checklist_harian_id}` | Edit checklist (Admin) |
| DELETE | `/api/checklist-harian/{checklist_harian_id}` | Hapus checklist (Admin) |

**GET `/api/checklist-harian`**
Query: `page`, `limit`, `search` (by nama tugas), `lokasi_id`, `lantai_id`, `status` (`BELUM_DIKERJAKAN`|`SEDANG_DIKERJAKAN`|`SELESAI`|`TERLEWAT`)
- `200` Daftar checklist

**POST `/api/checklist-harian`** (Admin)
Request:
```json
{ "nama_tugas": "string", "kategori_id": "uuid", "lokasi_id": "uuid", "lantai_id": "uuid", "ob_id": "uuid" }
```
- `nama_tugas` adalah **text field** (bukan dropdown `tugas_id`)
- `kategori_id` tetap dropdown (UUID)
- `lokasi_id`, `lantai_id` tetap dropdown (UUID)
- `ob_id` opsional
- `201` Checklist berhasil dibuat
- **WebSocket**: sends `PENUGASAN_CHECKLIST` to all OB.

**PATCH `/api/checklist-harian/{checklist_harian_id}`** (Admin)
Request (all fields optional/partial presumed):
```json
{ "nama_tugas": "string", "kategori_id": "uuid", "lokasi_id": "uuid", "lantai_id": "uuid", "ob_id": "uuid", "status": "string", "catatan": "string" }
```
- `nama_tugas` adalah **text field**
- `200` Checklist berhasil diupdate

Note: `status` here is a free `"string"` in the spec (not a strict enum in the schema), but the actual valid values are the four listed in the GET filter above (`BELUM_DIKERJAKAN`/`SEDANG_DIKERJAKAN`/`SELESAI`/`TERLEWAT`) — same caution as the Laporan endpoint applies: send the raw enum, not the UI label (`Belum`/`Proses`/`Selesai`/`Delayed`), and refetch after a successful update rather than trusting local state.

**DELETE `/api/checklist-harian/{checklist_harian_id}`**
- `200` Checklist berhasil dihapus

### Notifikasi

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifikasi` | Ambil notifikasi hari ini & kemarin |
| GET | `/api/notifikasi/unread-count` | Hitung notifikasi belum dibaca |
| PATCH | `/api/notifikasi/read-all` | Tandai semua notifikasi sudah dibaca |
| PATCH | `/api/notifikasi/{notification_id}/read` | Tandai satu notifikasi sudah dibaca |

**GET `/api/notifikasi`**
- `200`:
```json
{
  "success": true, "message": "Berhasil mendapatkan notifikasi",
  "data": {
    "hari_ini": [{
      "id": "uuid", "penerima_id": "uuid", "pengirim_id": "uuid",
      "tipe": "string", "judul": "string", "pesan": "string",
      "is_read": true, "read_at": "ISO date", "created_at": "ISO date",
      "pengirim": { "id": "uuid", "nama_lengkap": "string" }
    }],
    "kemarin": [ /* same shape */ ]
  }
}
```

**GET `/api/notifikasi/unread-count`**
- `200` → `{ "success": true, "message": "Berhasil mendapatkan total pesan yang belum dibaca", "data": 5 }` — note `data` here is a **raw number**, not an object.

**PATCH `/api/notifikasi/read-all`** / **PATCH `/api/notifikasi/{notification_id}/read`**
- `200` Success

**Known `tipe` values** (collected from every WebSocket-emitting endpoint above):
`ADMIN_MENUGASKAN_OB`, `LAPORAN_DIKERJAKAN`, `LAPORAN_DIBATALKAN`, `LAPORAN_BARU`, `GABUNG_LAPORAN`, `GABUNG_DISETUJUI`, `GABUNG_DIBATALKAN`, `KELUAR_KOLABORASI`, `DIKELUARKAN_KOLABORASI`, `KOLABORASI_DIBUKA`, `PENUGASAN_CHECKLIST`

### WebSocket

`GET /ws?token=xxx` — upgrades HTTP → WebSocket. `token` (required, query param) is the same JWT used for Bearer auth.

On connect, server sends:
```json
{ "type": "CONNECTED" }
```

Every subsequent real-time push is a `Notifikasi` object:
```json
{
  "id": "uuid", "penerima_id": "uuid", "pengirim_id": "uuid",
  "tipe": "LAPORAN_BARU", "judul": "Laporan baru", "pesan": "string",
  "is_read": false, "read_at": null, "created_at": "ISO date"
}
```

- `101` Switching Protocols — connected successfully
- `400` Token invalid/kosong

Since the unread-count and notification-list REST endpoints exist alongside the socket, the standard pattern should be: **fetch `/api/notifikasi/unread-count` + `/api/notifikasi` on mount for initial state, then apply WebSocket pushes incrementally (increment unread count, prepend to `hari_ini`) rather than re-fetching on every socket message.** If notifications are duplicating or the badge count is drifting from the list, check whether both a fetch-on-mount AND a socket-triggered refetch are firing and double-counting.

---

## Known Domain Gotchas (cross-referenced against actual frontend code seen in this project)

- **Two status enums, one word.** Laporan and Checklist Harian both use `BELUM_DIKERJAKAN` and `SELESAI` as literal values but are otherwise different enums (`PENDING`/`DIBATALKAN` vs `SEDANG_DIKERJAKAN`/`TERLEWAT`). A shared `mapApiStatus()`/badge component accidentally reused between the reports table and the checklist table will silently mis-render or mis-submit.
- **UI labels ≠ API enums everywhere.** Any `<select>` or badge whose `value`/`onChange` uses the Indonesian display label (`Menunggu`, `Ditugaskan`, `Proses`, etc.) instead of the raw backend enum must go through a mapper before hitting the API — verify this at every PATCH call site, not just once.
- **Kategori is the one CRUD resource using `PUT` instead of `PATCH`** for edit — a copy-pasted hook is a likely culprit if kategori edits silently no-op.
- **`PENDING` on `/api/admin/laporan/{id}` requires `ob_id` already set** — a status dropdown that lets an admin pick "Ditugaskan"/`PENDING` without also picking an OB will `400`; if that error isn't surfaced, the row just looks "stuck."
- **Empty string is not "no value."** The Laporan PATCH endpoint treats `""` as null for its "at least one non-null field" rule — a form that resets a field to `""` instead of omitting it can accidentally send an all-null payload and get a `400` that the UI may be swallowing.
- **Activation token has two touchpoints** (`GET check-token` then `POST activate-account`) — trace both before assuming the token itself is broken; the bug may be in how long the FE waits between the two calls, or a route guard re-validating the token a second time.
- **`DELETE /api/admin/laporan/{id}` is a permanent, cascading hard-delete** — not a status change like `DIBATALKAN`. Always confirm before calling it, and refetch/invalidate any OB-side queries (dashboard, gabung list) touching that laporan afterward, since an OB with it open will otherwise silently hit `404`s.
- **Concurrent-session / stale-state pattern also applies to `ob_id` ownership.** Both "ambil laporan" (409 if already taken) and "batalkan"/"kolaborasi keluarkan" (403 if not the owner) are guarding against the same class of race condition as concurrent logins — the fix pattern (server is source of truth, always refetch after a state-changing action, surface conflict errors instead of swallowing them) is the same one to apply across all of these.
- **Checklist Harian uses `nama_tugas` text field, not `tugas_id` dropdown.** The API now accepts `nama_tugas` as a free-text string. The `useTugasOptions` hook is deprecated for checklist creation — `TaskFormModal` uses a text input instead.