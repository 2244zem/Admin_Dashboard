# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WGS Admin Page Frontend - React-based admin dashboard for building management operations. Manages reports (laporan), ad-hoc tasks (tugas), daily checklists (checklist harian), users (OB, HR, Admin, Karyawan), and locations (gedung/lantai/ruangan).

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
|---|---|
| Auth (login/logout/activation/password) | `/api/auth/*` |
| User profile (self) | `/api/user/profile` |
| Karyawan | `/api/karyawan/*` |
| OB — laporan (ambil/submit/batalkan/kolaborasi) | `/api/ob/laporan/*` |
| OB — dashboard | `/api/ob/dashboard` |
| OB — tugas ad-hoc (claim/selesai) | `/api/ob/tugas/*` |
| Users (Admin) | `/api/admin/user` |
| Roles (Admin) | `/api/admin/role` |
| Reports (Admin) | `/api/admin/laporan` |
| Locations / Floors / Rooms | `/api/lokasi`, `/api/lantai`, `/api/ruangan` |
| Kategori | `/api/kategori` |
| Tugas (katalog master data, Admin) | `/api/tugas` |
| Checklist Harian | `/api/checklist-harian` |
| Notifications | `/api/notifikasi` |
| WebSocket | `/ws` |

> Full request/response contracts for every endpoint are documented in **[API Reference](#api-reference-full)** below — read that section before writing or debugging any API call, hook, or mutation. Don't guess field names or status codes; they're all specified there.

### Three assignable-work resource types — don't conflate them

This system has **three separate "work item" resources** that all get assigned to an OB, and it's easy to mix them up because they share overlapping field/status names.

| | **Laporan** (report) | **Checklist Harian** | **Tugas** (ad-hoc katalog) |
|---|---|---|---|
| Created by | Karyawan (`POST /api/karyawan/laporan`) | Admin (`POST /api/checklist-harian`) | Admin (`POST /api/tugas`) |
| Assignment model | OB self-claims from open pool (`PATCH /api/ob/laporan/{id}`), **or** joins as collaborator (`gabung`) | Admin pushes directly to a specific OB (`ob_id` set at creation) | OB self-claims from an unclaimed pool (`PATCH /api/ob/tugas/{id}/claim`), **or** admin force-assigns via `PATCH /api/tugas/{id}` with `ob_id` |
| Collaboration support | Yes — full `gabung` (join-request) system with approve/reject/kick | No | No |
| Status enum | `BELUM_DIKERJAKAN` \| `PENDING` \| `SELESAI` \| `DIBATALKAN` | `BELUM_DIKERJAKAN` \| `SEDANG_DIKERJAKAN` \| `SELESAI` \| `TERLEWAT` | `BELUM_DIKERJAKAN` \| `SEDANG_DIKERJAKAN` \| `SELESAI` (`TERLEWAT` not confirmed for this resource — verify) |
| Completion path | OB submits directly (`POST /api/ob/laporan/{id}`, status→`SELESAI`) **or** Admin approves (`PATCH /api/admin/laporan/{id}`, status→`SELESAI`) — **two independent writers**, see gotcha below | Admin edits status via `PATCH /api/checklist-harian/{id}` | OB marks done (`PATCH /api/ob/tugas/{id}/selesai`) or Admin force-sets `status` via `PATCH /api/tugas/{id}` |
| Endpoints (OB side) | `/api/ob/laporan/*` | (read-only, surfaced via `/api/ob/dashboard`) | `/api/ob/tugas/*` |
| Endpoints (Admin side) | `/api/admin/laporan/*` | `/api/checklist-harian/*` | `/api/tugas/*` |

⚠️ Note `/api/tugas` (Admin katalog CRUD) and `/api/ob/tugas` (OB claim/selesai) read/write the **same underlying table** — they are two role-scoped views of one resource, not two resources.

### TanStack Query Hooks

- `useAuth()` (or equivalent) - login, logout, forgot/reset/change password
- `useTasks(filters?)` - Checklist Harian, server-side filter params
- `useObTugas()` - ad-hoc Tugas pool (OB side: list/claim/selesai)
- `useTugasKatalog()` / `useTugas()` (Admin) - Tugas master data CRUD
- `useLokasi()` - Location hierarchy (gedung → lantai → ruangan)
- `useUsers()` - User management
- `useKategori()` - Task categories
- `useLaporan()` - Reports (talks to `/api/admin/laporan`, page-based pagination)
- `useRoles()` - populate `role_id` dropdown (new — backed by `GET /api/admin/role`, don't hardcode role IDs)
- `useNotifikasi()` - notification list + unread count + WebSocket sync

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
|---|---|
| Admin | Full access |
| HR | tasks:create, tasks:edit, lokasi:read |
| OB | tasks:read, lokasi:read |

Use `<Can permission="...">` or `<Can roles={["Admin"]}>` components to gate UI elements.

Backend roles seen across the API surface: **Admin**, **HR**, **OB**, **Karyawan**. Role IDs (needed for `POST/PATCH /api/admin/user`'s `role_id` field) should come from `GET /api/admin/role` — don't hardcode UUIDs for roles anywhere in the FE.

Users now also carry an **`is_active`** boolean, editable via `PATCH /api/admin/user/{user_id}` — see gotcha below if User Management "status" bugs are still being investigated.

### Status Mapping

⚠️ **There are at least four separate status vocabularies in this system** (three resource enums + one UI-label layer). Do not treat them as interchangeable.

**1. Laporan (Report) status — backend enum:**
`BELUM_DIKERJAKAN` | `PENDING` | `SELESAI` | `DIBATALKAN`

**2. Laporan status — UI labels** (observed in `StatusBadge` on the dashboard/report pages): `Menunggu` | `Ditugaskan` | `Selesai` | `Ditolak`

Likely mapping (verify against the actual mapper in `useLaporan.ts`):
| Backend | UI |
|---|---|
| `BELUM_DIKERJAKAN` | `Menunggu` |
| `PENDING` | `Ditugaskan` |
| `SELESAI` | `Selesai` |
| `DIBATALKAN` | `Ditolak` |

**3. Checklist Harian status:** `BELUM_DIKERJAKAN` | `SEDANG_DIKERJAKAN` | `SELESAI` | `TERLEWAT` — UI: `Belum` / `Proses` / `Selesai` / `Delayed`. Mapper functions in `useTasks.ts`: `mapApiStatus()` (API → UI), `mapUiStatus()` (UI → API).

**4. Tugas (ad-hoc katalog) status:** `BELUM_DIKERJAKAN` (default on create) → `SEDANG_DIKERJAKAN` (after OB claims) → `SELESAI` (after OB finishes). Same literal strings as #3 for the first three values, but this is a **separate resource/table** from Checklist Harian — don't reuse a Checklist mapper/badge component for Tugas rows without checking it handles this resource's own value set (`TERLEWAT` is unconfirmed here).

**Prioritas** (report priority, Laporan only): `STANDARD` | `URGENT`.

### Environment

- `.env` - API base URL (defaults to vite proxy in dev)
- Vite proxy redirects `/api/*` to backend (configured in `vite.config.ts`)
- WebSocket proxy at `/ws` for real-time notifications
- The Swagger/OpenAPI doc points at an ngrok tunnel (`https://stylar-nonseverable-denver.ngrok-free.dev`) for local dev — ephemeral, rotates; never hardcode it, always resolve the base URL through `.env` / `src/config`.

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
/login             - Login page
/forgot-password    - Request password reset link
/reset-password     - Set new password from email token
/activate-account   - Account activation
/dashboard          - Main dashboard
/tasks              - Task management (CRUD + filter by lokasi/lantai)
/users              - User management
/datalokasi         - Location management (gedung/lantai/ruangan)
/reports            - Reports view
/performance/:userId - OB/Karyawan performance analytics (verify: see gotcha on aggregate vs per-user data)
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

### Auth

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login user |
| GET | `/api/auth/check-token` | Publik | Verifikasi token aktivasi |
| POST | `/api/auth/activate-account` | Publik | Aktivasi akun & set password pertama kali |
| POST | `/api/auth/logout` | Terautentikasi | Logout & revoke session |
| POST | `/api/auth/forgot-password` | Publik | Request reset link password |
| POST | `/api/auth/reset-password` | Publik | Reset password pakai token dari email |
| POST | `/api/auth/change-password` | Terautentikasi | Ubah password (sudah login) |

**POST `/api/auth/login`**
Request:
```json
{ "identifier": "string", "password": "string" }
```
- `200` → `{ "success": true, "message": "string", "data": { "jwt_token": "string" } }`
- `401` Login gagal

Note (from login mockup): the FE's error copy for a failed login is **"Username atau password salah. Silakan coba lagi."** — `identifier` accepts either username or email (field labeled "Email/Username" in the UI), keep that label/behavior consistent with what this field actually validates.

⚠️ The login mockup also shows an **"Ingat Saya" (remember me) checkbox with no corresponding field in `LoginRequest`** (only `identifier`/`password`). Either this is meant to be a purely client-side decision (e.g. `localStorage` vs `sessionStorage` for the JWT, or a longer client-side expiry check) with no backend involvement, or the backend needs a param added. Confirm with backend before wiring the checkbox — don't silently drop it or silently assume a longer-lived session without checking whether the JWT's own expiry actually changes.

**GET `/api/auth/check-token`**
Query: `token` (string, required) — token aktivasi dari link email.
- `200` Token valid

**POST `/api/auth/activate-account`**
Query: `token` (string, required)
Request:
```json
{ "password": "string", "confirmPassword": "string" }
```
- `200` → `{ "success": true, "message": "Akun berhasil diaktivasi, silahkan login" }`
- `400` Token tidak valid / Validation Failed / Password tidak cocok

**POST `/api/auth/logout`** (Terautentikasi)
Revokes the active session — token becomes unusable immediately after this call.
- `200` → `{ "success": true, "message": "Logout berhasil" }`
- `401` Session tidak valid / Token expired

**POST `/api/auth/forgot-password`** (Publik)
Request:
```json
{ "email": "user@example.com" }
```
- `200` → `{ "success": true, "message": "Link reset password telah dikirim ke email Anda" }`
- `404` Email tidak terdaftar
- `500` Gagal memproses permintaan reset password

**POST `/api/auth/reset-password`** (Publik)
Query: `token` (string, required) — token reset dari email.
Request:
```json
{ "password": "string", "confirmPassword": "string" }
```
- `200` → `{ "success": true, "message": "Password berhasil diubah, silakan login" }`
- `400` Validation Failed (password tidak cocok atau kurang dari 6 karakter)
- `401` Token tidak valid / kadaluwarsa / sudah digunakan

**POST `/api/auth/change-password`** (Terautentikasi)
Request:
```json
{ "oldPassword": "string", "newPassword": "string", "confirmNewPassword": "string" }
```
- `200` → `{ "success": true, "message": "Password berhasil diubah" }`
- `400` Password lama salah / validation failed
- `401` Unauthorized

⚠️ There are now **three completely separate password-change flows** — don't let a bug fix in one accidentally get "fixed" in the wrong one:
1. First-time activation (`activate-account`, no old password, uses activation token)
2. Forgot-password (`forgot-password` → `reset-password`, no old password, uses reset token, publik)
3. Change-password while logged in (`change-password`, requires `oldPassword`, requires auth, no token param)

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
  "success": true, "message": "string",
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

**PATCH `/api/user/profile`** (multipart/form-data)
Fields: `nama_lengkap` (string), `profile_picture` (binary file)
- `200` Berhasil mengubah profile / `400` Validation Failed / `401` Unauthorized / `404` User tidak ditemukan

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
- **WebSocket**: sends `ADMIN_MENUGASKAN_OB` to all OB + all admin.

### OB — Laporan

| Method | Path | Description |
|---|---|---|
| GET | `/api/ob/dashboard` | Ringkasan tugas harian + laporan OB |
| PATCH | `/api/ob/laporan/{laporan_id}` | **Ambil** laporan |
| POST | `/api/ob/laporan/{laporan_id}` | **Submit hasil pekerjaan** — ⚠️ same path as PATCH above, different verb |
| POST | `/api/ob/laporan/{laporan_id}/batalkan` | Batalkan laporan |
| GET | `/api/ob/laporan/{laporan_id}/gabung` | Daftar permintaan gabung |
| POST | `/api/ob/laporan/{laporan_id}/gabung` | Kirim permintaan gabung |
| PATCH | `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/setujui` | Setujui permintaan gabung |
| PATCH | `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/tolak` | Tolak permintaan gabung |
| POST | `/api/ob/laporan/{laporan_id}/gabung/keluar` | Keluar dari kolaborasi (anggota) |
| PATCH | `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/keluarkan` | Keluarkan anggota (pemilik) |
| PATCH | `/api/ob/laporan/{laporan_id}/kolaborasi` | Buka/tutup kolaborasi laporan |

⚠️ **`PATCH /api/ob/laporan/{laporan_id}` and `POST /api/ob/laporan/{laporan_id}` are the exact same URL with different HTTP verbs and completely different effects** ("ambil laporan" vs "submit hasil pekerjaan"). A wrong verb here won't 404 — it'll silently perform the wrong action. Double-check the HTTP method on every call site in `useLaporan`/`useObLaporan`, not just the path.

**GET `/api/ob/dashboard`**
Returns a summary for the logged-in OB, not just a raw list.
- `200`:
```json
{
  "success": true,
  "data": {
    "ob": { "nama_lengkap": "string" },
    "tugas_harian_stats": { "total": 0, "resolved": 0, "pending": 0 },
    "tugas_harian": [{
      "id": "uuid", "nama_tugas": "string", "kategori": "string",
      "lokasi": "string", "nomor_lantai": 0, "status": "string", "tanggal": "YYYY-MM-DD"
    }],
    "laporan": [{
      "id": "uuid", "kategori": "string", "deskripsi_kendala": "string", "status": "string",
      "foto_masalah": ["string"], "lokasi": "string", "nomor_lantai": 0,
      "priority": "string", "is_kolaborasi_open": true, "created_at": "ISO date"
    }]
  }
}
```
Laporan shown: (a) all laporan assigned to this OB (`ob_id` = self), plus (b) unassigned laporan (`ob_id` null) with status **other than** `PENDING`.

⚠️ The field is named `tugas_harian` here but its shape (`nama_tugas`, `kategori`, `lokasi`, `nomor_lantai`, `status`, `tanggal`) reads like **Checklist Harian** items, not the ad-hoc **Tugas** katalog resource. Verify which resource this actually queries before wiring a hook — don't assume from the name alone, since "tugas" is used loosely across three different resources in this API (see the resource comparison table above).

**PATCH `/api/ob/laporan/{laporan_id}`** — "Ambil laporan"
Side effects: `status → PENDING`, `ob_id → OB yang login`, `dikerjakan_at → now`.
- `200` → `{ "success": true, "message": "Laporan berhasil diambil" }`
- `400` Validation Failed (format `laporan_id` tidak valid)
- `401` Unauthorized
- `403` Forbidden (bukan OB)
- `404` Laporan tidak ditemukan
- `409` **Laporan sudah diambil oleh OB lain** — handle explicitly (race-condition guard), don't treat as generic error.
- `500` Terjadi kesalahan, tidak bisa mengambil laporan
- **WebSocket**: `LAPORAN_DIKERJAKAN` → pelapor.

**POST `/api/ob/laporan/{laporan_id}`** — "Submit hasil pekerjaan" (NEW)
Multipart/form-data: `catatan` (string, required), `foto_selesai` (array of files, required)
Side effects: `status → SELESAI`, `selesai_at → now`.
- `200` → Histori berhasil ditambahkan
- `403` Anda tidak memiliki akses ke laporan ini (bukan OB pemilik)
- `404` Laporan tidak ditemukan
- `500` Terjadi kesalahan
- **WebSocket**: `LAPORAN_BERES` → pelapor, message includes `catatan`.

⚠️ This means an OB can now mark a laporan `SELESAI` **directly**, without admin approval — this is a second, independent writer to the same `status`/`selesai_at` fields that `PATCH /api/admin/laporan/{id}` also writes. If the product expects admin to have final sign-off on completion, verify that's still true; if not, any FE logic that assumed "only admin can set SELESAI" is now outdated.

**POST `/api/ob/laporan/{laporan_id}/batalkan`** (multipart/form-data)
Fields: `catatan` (string, min 5 chars, **required**), `foto_selesai` (array of files, **now optional** — was required in the previous spec version, double check any FE validation that still marks it required)
Side effects: `status → DIBATALKAN`, `ob_id → null`, `dibatalkan_at → now`, `alasan_gagal ← catatan`.
- `200` Laporan dibatalkan / `403` bukan OB pemilik / `404` / `500`
- **WebSocket**: `LAPORAN_DIBATALKAN` → pelapor, with the cancellation reason.

**GET `/api/ob/laporan/{laporan_id}/gabung`**
- `200`:
```json
{ "success": true, "message": "string", "data": [{ "id": "uuid", "ob": { "id": "uuid", "nama_lengkap": "string" }, "status": "PENDING", "created_at": "ISO date" }] }
```
- `400` / `401`

**POST `/api/ob/laporan/{laporan_id}/gabung`**
- `201`:
```json
{ "success": true, "message": "string", "data": { "id": "uuid", "laporan_id": "uuid", "ob_id": "uuid", "status": "PENDING", "created_at": "ISO date" } }
```
- `400` / `401`
- **WebSocket**: `GABUNG_LAPORAN` → OB pemilik laporan.

**PATCH `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/setujui`**
- `200` / `400` / `401` — **WebSocket**: `GABUNG_DISETUJUI` → OB peminta.

**PATCH `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/tolak`**
- `200` / `400` / `401` — **WebSocket**: `GABUNG_DIBATALKAN` → OB peminta.

**POST `/api/ob/laporan/{laporan_id}/gabung/keluar`** — anggota only (not OB utama)
- `200` / `400` / `401` — **WebSocket**: `KELUAR_KOLABORASI` → OB utama.

**PATCH `/api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/keluarkan`** — OB pemilik mengeluarkan anggota
- `200` / `400` / `401` — **WebSocket**: `DIKELUARKAN_KOLABORASI` → OB yang dikeluarkan.

**PATCH `/api/ob/laporan/{laporan_id}/kolaborasi`**
Request: `{ "is_open": true }`
- `200` / `400` / `401` / `403` Hanya OB pemilik / `404`
- **WebSocket**: `KOLABORASI_DIBUKA` → semua OB lain.

### OB — Tugas (ad-hoc, NEW)

| Method | Path | Description |
|---|---|---|
| GET | `/api/ob/tugas` | Daftar tugas ad-hoc (belum diklaim + yang sudah diklaim OB ini) |
| PATCH | `/api/ob/tugas/{tugas_id}/claim` | Klaim tugas |
| PATCH | `/api/ob/tugas/{tugas_id}/selesai` | Selesaikan tugas |

**GET `/api/ob/tugas`**
- `200`:
```json
{
  "success": true, "message": "string",
  "data": [{
    "id": "uuid", "nama_tugas": "string", "kategori": "string",
    "lantai_id": "uuid", "lokasi": "string", "nomor_lantai": 0,
    "status": "BELUM_DIKERJAKAN", "catatan": "string", "created_at": "ISO date"
  }]
}
```
- `401` / `403` Forbidden

**PATCH `/api/ob/tugas/{tugas_id}/claim`**
Side effect: `status → SEDANG_DIKERJAKAN`, records the claim time.
- `200` → `{ "success": true, "message": "Tugas berhasil diklaim" }`
- `400` Gagal mengklaim tugas / `401` / `403` / `404` Tugas tidak ditemukan

**PATCH `/api/ob/tugas/{tugas_id}/selesai`**
Side effect: `status → SELESAI`, records completion time.
- `200` → `{ "success": true, "message": "Tugas berhasil diselesaikan" }`
- `400` Gagal menyelesaikan tugas / `401` / `403` / `404`

### Admin — Users & Roles

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/role` | List semua role (NEW) |
| GET | `/api/admin/user` | List semua user |
| POST | `/api/admin/user` | Buat user baru |
| GET | `/api/admin/user/all-ob` | List semua OB |
| GET | `/api/admin/user/all-karyawan` | List semua karyawan |
| GET | `/api/admin/dashboard` | Dashboard admin + KPI |
| GET | `/api/admin/user-stats` | Statistik user |
| GET | `/api/admin/user/{user_id}` | Detail user |
| PATCH | `/api/admin/user/{user_id}` | Update user (now includes `is_active`) |
| DELETE | `/api/admin/user/{user_id}` | Hapus user |
| POST | `/api/admin/user/{user_id}/renew-token` | Perpanjang token aktivasi (NEW) |
| GET | `/api/admin/user/{user_id}/performance/ob` | Statistik performa OB |
| GET | `/api/admin/user/{user_id}/performance/karyawan` | Statistik performa Karyawan |

**GET `/api/admin/role`**
- `200`:
```json
{
  "success": true, "message": "Berhasil mendapatkan data role",
  "data": [{ "id": "uuid", "nama_role": "admin", "created_at": "ISO date" }]
}
```
Use this to populate the `role_id` dropdown in create/edit user forms — don't hardcode role UUIDs anywhere in the FE.

**GET `/api/admin/user`**
Query: `page` (default 1), `limit` (default 10), `search`, `role_id` (uuid)
- `200` Daftar user

**POST `/api/admin/user`**
Request:
```json
{ "username": "string", "email": "user@example.com", "nama_lengkap": "string", "role_id": "uuid" }
```
- `201` → `{ "success": true, "message": "Berhasil menambahkan data user, link aktivasi sudah dikirim ke email user." }`

Created with **no password** — the flow is "admin creates account → activation email sent → user hits `check-token`/`activate-account` to set their own password."

**GET `/api/admin/user/all-ob`** / **GET `/api/admin/user/all-karyawan`**
- `200` (no query params)

**GET `/api/admin/dashboard`**
Query: `period` (`harian`|`mingguan`|`bulanan`|`tahunan`, default `mingguan`)
- `200` Data dashboard

**GET `/api/admin/user-stats`**
- `200` Statistik user

**GET `/api/admin/user/{user_id}`**
- `200` Data user

**PATCH `/api/admin/user/{user_id}`** (multipart/form-data) ⚠️ relevant to prior "status tidak berubah" reports
Fields (all optional, partial update presumed): `username`, `email`, `password`, `nama_lengkap`, `role_id`, `profile_picture` (binary), **`is_active`** (boolean — new field)
- `200` User berhasil diupdate

If a User Management "status tidak berubah" bug is still open, check whether the FE's active/inactive toggle actually sends `is_active` in this exact request (as a real boolean, not a string `"true"`/`"false"` inside `multipart/form-data`, which some multipart encoders will stringify) and whether the row re-fetches/updates from the `200` response instead of relying on stale local state.

**DELETE `/api/admin/user/{user_id}`**
- `200` User berhasil dihapus

**POST `/api/admin/user/{user_id}/renew-token`** (NEW) ⚠️ directly relevant to prior "token aktivasi" bug reports
Issues a new activation token and re-sends the activation email — for when a user's original activation link expired or was lost.
- `200` → `{ "success": true, "message": "Berhasil memperbarui token aktivasi, link aktivasi baru sudah dikirim ke email user." }`
- `400` Akun sudah diaktivasi
- `404` User tidak ditemukan
- `500` Gagal memperbarui token aktivasi

If "token aktivasi" issues are being reported, check whether the Admin UI actually exposes a way to call this endpoint (e.g. a "Kirim Ulang Token" button on a pending/unactivated user row) before assuming the bug is in token generation/validation logic — the fix may just be "wire this button up," not a backend trace.

**GET `/api/admin/user/{user_id}/performance/ob`**
Query: `period` (`mingguan`|`bulanan`|`tahunan`, default `mingguan`)
- `200` → `{ "success": true, "message": "Berhasil mendapatkan statistik performa OB", "data": {} }` — **`data` shape is unspecified in the spec.**
- `400` / `401` / `403` bukan admin / `404` OB tidak ditemukan / `500`

**GET `/api/admin/user/{user_id}/performance/karyawan`**
Query: `period` (`mingguan`|`bulanan`|`tahunan`, default `mingguan`)
- `200` → `{ "success": true, "message": "...", "data": { "laporan_terkirim": 15 } }`
- `400` / `401` / `403` bukan admin / `404` Karyawan tidak ditemukan / `500`

⚠️ **Mismatch found against the "Performa OB" page mockup — read before building this page.** The endpoint above is scoped to **one** `user_id` and its `data` is an undocumented empty `{}`. But the actual "Performa OB" page shown to me is a **multi-staff leaderboard/analytics dashboard**, displaying simultaneously:
- Aggregate stats: `tingkat_keberhasilan` (success rate %, + delta vs last period), `waktu_aktif_sistem` (uptime %, + status label like "Stabil"), `laporan_menunggu` (pending-review count, with a link to the list)
- `perbandingan_penyelesaian_tugas`: a bar chart comparing task completion **across multiple staff** (x-axis = staff names)
- `tren_keluhan`: a monthly line chart of complaint volume
- A leaderboard table: per-OB rank, name, role tags, **tasks claimed count**, **average speed (minutes)**, **badge earned** (e.g. "Speedy Cleaner", "High Reliability", "Hygiene Expert", or "Belum memperoleh badge" if none)

None of this aggregate/leaderboard shape is covered by the documented per-`user_id` endpoint. Before building this page:
1. Check whether a separate **aggregate** endpoint exists (e.g. something like `GET /api/admin/ob-performance` or a `period`-only query with no `user_id`) that isn't in this Swagger doc yet.
2. If it genuinely doesn't exist yet, this page's data requirement should go back to the backend team as a new endpoint spec — looping the single-user endpoint once per OB to build a leaderboard client-side is a real option but is N+1 and won't easily support the "Tren Keluhan" trend chart or "Waktu Aktif Sistem" system uptime metric (those aren't per-OB at all).
3. Don't guess field names for `data: {}` and start rendering — confirm the actual shape by hitting the endpoint for real, or get the backend to fill in the schema.

### Admin — Laporan

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/laporan` | List laporan dengan filter |
| GET | `/api/admin/laporan/{laporan_id}` | Detail laporan |
| PATCH | `/api/admin/laporan/{laporan_id}` | Update status/prioritas/catatan/OB laporan |
| DELETE | `/api/admin/laporan/{laporan_id}` | Hapus laporan beserta histori & kolaborasi (cascade, permanen) |

**GET `/api/admin/laporan`**
Query: `page`, `limit`, `search`, `status`, `prioritas`, `lokasi_id`, `lantai_id`, `start_date`, `end_date`, `sort_by` (`created_at`|`updated_at`|`prioritas`|`status`|`nama_karyawan`|`lokasi`), `sort_order` (`asc`|`desc`, default `desc`)
- `200` Response contains: `laporan` (paginated + meta), `ruangan_terpopuler` (array of `{ ruangan_id, nama_ruangan, nama_lantai, nama_lokasi, total_laporan }`), `laporan_aktif` (total active count)

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
- `400` / `401` / `403` bukan admin / `404` / `500`

**PATCH `/api/admin/laporan/{laporan_id}`** ⚠️ most important endpoint for report-status bugs
Partial update — at least one field must be non-null (`""` treated as null, doesn't satisfy the rule).

Request example:
```json
{ "status": "SELESAI", "admin_catatan": "Sudah dikonfirmasi selesai oleh admin" }
```

**Status transition side-effects (server-side, automatic):**
| New `status` | Automatic side-effect |
|---|---|
| `BELUM_DIKERJAKAN` | Re-open: `ob_id → null`, `dikerjakan_at → cleared` |
| `PENDING` | `dikerjakan_at → now` (requires `ob_id` already set) |
| `SELESAI` | `selesai_at → now` |
| `DIBATALKAN` | `dibatalkan_at → now`, `ob_id → null` |

- `200` → `{ "success": true, "message": "Laporan berhasil diperbarui" }`
- `400` no non-null field / invalid enum / invalid UUID / `PENDING` without `ob_id`
- `401` / `403` bukan admin / `404` / `500`

⚠️ Debug checklist for "status tidak berubah": (1) exact enum string, not UI label; (2) `status: ""` silently fails the non-null rule → expect `400`; (3) `PENDING` needs `ob_id` or `400`; (4) does the FE refetch after `200`? (5) **NEW as of this spec version**: is the value stale because an OB used `POST /api/ob/laporan/{id}` (submit hasil) to set `SELESAI` directly, bypassing this admin endpoint entirely? Both write the same field.

**DELETE `/api/admin/laporan/{laporan_id}`** ⚠️ hard delete, no undo
Menghapus laporan permanen; histori & kolaborasi ikut terhapus via cascade.
- `200` → `{ "success": true, "message": "Laporan berhasil dihapus" }`
- `401` / `403` bukan admin / `404` / `500`

This is a hard delete, not a status change like `DIBATALKAN` — no soft-delete flag, no restore path. Confirm before calling. Cascade includes any `kolaborasi`/`gabung` records — an OB with the laporan open in a "gabung" modal will get a `404` on their next action; handle that gracefully rather than crashing. After success, invalidate both admin-side and OB-side cached queries touching that laporan.

### Lokasi / Lantai / Ruangan / Kategori (Admin CRUD)

Standard CRUD, response bodies not further specified beyond "daftar X"/"data X" — treat as `{ success, message, data }`.

| Resource | List | Create | Detail | Edit | Delete |
|---|---|---|---|---|---|
| Lokasi | `GET /api/lokasi` | `POST /api/lokasi` `{ nama_lokasi, jumlah_lantai }` | `GET /api/lokasi/{id}` | `PATCH /api/lokasi/{id}` | `DELETE /api/lokasi/{id}` |
| Lantai | `GET /api/lantai?lokasi_id=` | `POST /api/lantai` `{ lokasi_id, nomor_lantai }` | `GET /api/lantai/{id}?lokasi_id=` | `PATCH /api/lantai/{id}?lokasi_id=` `{ nomor_lantai }` | `DELETE /api/lantai/{id}?lokasi_id=` |
| Ruangan | `GET /api/ruangan?lantai_id=` | `POST /api/ruangan` `{ lantai_id, nama }` | `GET /api/ruangan/{id}?lantai_id=` | `PATCH /api/ruangan/{id}?lantai_id=` `{ nama }` | `DELETE /api/ruangan/{id}?lantai_id=` |
| Kategori | `GET /api/kategori` | `POST /api/kategori` `{ nama_kategori }` | `GET /api/kategori/{id}` | **`PUT` (not PATCH)** `/api/kategori/{id}` `{ nama_kategori }` | `DELETE /api/kategori/{id}` |

⚠️ Kategori edit uses `PUT`, everything else uses `PATCH` — a copy-pasted hook calling `.patch()` is a likely silent-failure source.

### Admin — Tugas (katalog master data)

⚠️ **This resource's shape changed significantly** from earlier spec versions — it's no longer just a "jenis tugas" name lookup, it's now a full assignable work item (same lifecycle shape as an ad-hoc task, mirrored by `/api/ob/tugas/*`).

| Method | Path | Description |
|---|---|---|
| GET | `/api/tugas?kategori_id=` | List tugas (katalog) |
| POST | `/api/tugas` | Tambah tugas |
| GET | `/api/tugas/{tugas_id}` | Detail tugas |
| PATCH | `/api/tugas/{tugas_id}` | Edit tugas |
| DELETE | `/api/tugas/{tugas_id}` | Hapus tugas |

**GET `/api/tugas`** / **GET `/api/tugas/{tugas_id}`**
- `200` item shape:
```json
{
  "id": "uuid", "kategori_id": "uuid", "nama_tugas": "string",
  "lantai_id": "uuid", "ob_id": "uuid", "status": "BELUM_DIKERJAKAN",
  "catatan": "string", "is_active": true,
  "dikerjakan_at": "ISO date", "selesai_at": "ISO date",
  "created_at": "ISO date", "updated_at": "ISO date"
}
```

**POST `/api/tugas`**
Request:
```json
{ "kategori_id": "uuid", "nama_tugas": "string", "lantai_id": "uuid", "catatan": "string" }
```
- `201` Tugas berhasil dibuat (`ob_id`/`status` presumably default to `null`/`BELUM_DIKERJAKAN`)

**PATCH `/api/tugas/{tugas_id}`**
Request (partial, all optional presumed):
```json
{ "kategori_id": "uuid", "nama_tugas": "string", "lantai_id": "uuid", "catatan": "string", "is_active": true, "status": "BELUM_DIKERJAKAN", "ob_id": "uuid" }
```
- `200` Tugas berhasil diupdate

Admin can directly set `status` and `ob_id` here — i.e. force-assign or force-complete a tugas, bypassing the OB claim/selesai flow. Same "two independent writers" caution as the Laporan `SELESAI` case applies if both admin and OB can touch this concurrently.

**DELETE `/api/tugas/{tugas_id}`**
- `200` Tugas berhasil dihapus

### Checklist Harian

⚠️ **Request body changed**: no more `tugas_id` reference — `nama_tugas` is now a free-text string sent directly, and `lokasi_id` was removed (only `lantai_id` remains). If a `TaskFormModal`/similar form still shows a "Nama Tugas" dropdown backed by `tugas_id`, it needs to become a free-text field bound to `nama_tugas` to match this contract. (If that swap was already made in the form component, it's now correctly aligned with this endpoint — just double-check the mutation hook isn't still sending `tugas_id`/`lokasi_id`.)

| Method | Path | Description |
|---|---|---|
| GET | `/api/checklist-harian` | List checklist harian (OB, HR, Admin) |
| POST | `/api/checklist-harian` | Buat checklist harian (Admin) |
| GET | `/api/checklist-harian/{id}` | Detail checklist |
| PATCH | `/api/checklist-harian/{id}` | Edit checklist (Admin) |
| DELETE | `/api/checklist-harian/{id}` | Hapus checklist (Admin) |

**GET `/api/checklist-harian`**
Query: `page`, `limit`, `search` (by nama tugas), `lokasi_id`, `lantai_id`, `status` (`BELUM_DIKERJAKAN`|`SEDANG_DIKERJAKAN`|`SELESAI`|`TERLEWAT`)
- `200` Daftar checklist

**POST `/api/checklist-harian`** (Admin)
Request:
```json
{ "nama_tugas": "string", "kategori_id": "uuid", "lantai_id": "uuid", "ob_id": "uuid" }
```
- `201` Checklist berhasil dibuat
- **WebSocket**: `PENUGASAN_CHECKLIST` → all OB.

**PATCH `/api/checklist-harian/{id}`** (Admin)
Request:
```json
{ "nama_tugas": "string", "kategori_id": "uuid", "lantai_id": "uuid", "ob_id": "uuid", "status": "string", "catatan": "string" }
```
- `200` Checklist berhasil diupdate

`status` is typed as free `"string"` in the spec, but the valid values are the four from the GET filter — send the raw enum, not the UI label, and refetch after a successful update.

**DELETE `/api/checklist-harian/{id}`**
- `200` Checklist berhasil dihapus

### Notifikasi

⚠️ **Schema gained `ref_id` and `ref_tipe`** fields — use these to deep-link a notification click to the right detail view (e.g. open the specific laporan/tugas/checklist). Valid `ref_tipe` values aren't enumerated in the spec; confirm actual values from a live payload or backend source before switch/case-ing on them. Also note: the **WebSocket** real-time push example in the spec does **not** show `ref_id`/`ref_tipe` in its sample payload while the REST `GET /api/notifikasi` schema does — verify whether the socket push actually includes these fields too, or whether the FE needs to refetch via REST to get them.

| Method | Path | Description |
|---|---|---|
| GET | `/api/notifikasi` | Ambil notifikasi hari ini & kemarin |
| GET | `/api/notifikasi/unread-count` | Hitung notifikasi belum dibaca |
| PATCH | `/api/notifikasi/read-all` | Tandai semua sudah dibaca |
| PATCH | `/api/notifikasi/{notification_id}/read` | Tandai satu sudah dibaca |

**GET `/api/notifikasi`**
- `200`:
```json
{
  "success": true, "message": "Berhasil mendapatkan notifikasi",
  "data": {
    "hari_ini": [{
      "id": "uuid", "penerima_id": "uuid", "pengirim_id": "uuid",
      "tipe": "string", "judul": "string", "pesan": "string",
      "is_read": true, "read_at": "ISO date",
      "ref_id": "uuid", "ref_tipe": "string",
      "created_at": "ISO date",
      "pengirim": { "id": "uuid", "nama_lengkap": "string" }
    }],
    "kemarin": [ /* same shape */ ]
  }
}
```

**GET `/api/notifikasi/unread-count`**
- `200` → `{ "success": true, "message": "...", "data": 5 }` — `data` is a raw number, not an object.

**PATCH `/api/notifikasi/read-all`** / **PATCH `/api/notifikasi/{notification_id}/read`**
- `200` Success

**Known `tipe` values:** `ADMIN_MENUGASKAN_OB`, `LAPORAN_DIKERJAKAN`, `LAPORAN_BERES` (new), `LAPORAN_DIBATALKAN`, `LAPORAN_BARU`, `GABUNG_LAPORAN`, `GABUNG_DISETUJUI`, `GABUNG_DIBATALKAN`, `KELUAR_KOLABORASI`, `DIKELUARKAN_KOLABORASI`, `KOLABORASI_DIBUKA`, `PENUGASAN_CHECKLIST`

### WebSocket

`GET /ws?token=xxx` — same JWT as Bearer auth. On connect:
```json
{ "type": "CONNECTED" }
```
Real-time pushes are `Notifikasi` objects:
```json
{
  "id": "uuid", "penerima_id": "uuid", "pengirim_id": "uuid",
  "tipe": "LAPORAN_BARU", "judul": "Laporan baru", "pesan": "string",
  "is_read": false, "read_at": null, "created_at": "ISO date"
}
```
- `101` Switching Protocols / `400` Token invalid/kosong

Standard pattern: fetch `/api/notifikasi/unread-count` + `/api/notifikasi` on mount for initial state, then apply socket pushes incrementally rather than refetching on every message (watch for double-counting if both paths fire).

---

## Known Domain Gotchas (cross-referenced against actual frontend code and mockups seen in this project)

- **`PATCH` vs `POST` on the identical path `/api/ob/laporan/{laporan_id}`** do two unrelated things (ambil vs submit-hasil). Verify HTTP verb at every call site — a wrong verb silently does the wrong action instead of 404ing.
- **Laporan `status: SELESAI` now has two independent writers**: OB (`POST /api/ob/laporan/{id}`) and Admin (`PATCH /api/admin/laporan/{id}`). If the product still expects admin sign-off before a report counts as done, this needs a product decision, not just a bug fix.
- **Three "tugas"-named things exist** (Laporan, Checklist Harian, ad-hoc Tugas katalog) with overlapping status enums and overlapping field names (`nama_tugas`, `status`, `ob_id`, `dikerjakan_at`, `selesai_at` appear in more than one). Always confirm which table/hook you're actually touching before reusing a component or mapper across them.
- **`is_active` is now an explicit field on `PATCH /api/admin/user/{user_id}`** — if the User Management "status tidak berubah" bug is still open, this is the most likely concrete fix point: confirm the toggle sends a real boolean (not a stringified one inside multipart/form-data) and that the row refetches after `200`.
- **`POST /api/admin/user/{user_id}/renew-token` is the fix for stuck activation tokens** — if "token aktivasi" bugs are still open, check whether this endpoint is wired to a UI action at all before re-debugging token generation/validation logic from scratch.
- **Checklist Harian's request body dropped `tugas_id` and `lokasi_id`** in favor of a free-text `nama_tugas` and `lantai_id` only. Any form/hook still sending the old shape will silently mismatch or `400`.
- **`/api/tugas` (Admin) and `/api/ob/tugas` (OB) are two views of the same table** — a status/ob_id change from either side should invalidate both sides' cached queries.
- **The "Performa OB" page mockup doesn't match the documented per-`user_id` performance endpoint** — it's a multi-staff leaderboard/analytics view, the endpoint is single-user with an undocumented empty `data: {}`. Don't start building this page against assumed field names; confirm the real response shape or get a proper endpoint spec first.
- **Kategori edit uses `PUT`, everything else uses `PATCH`.**
- **`PENDING` on `/api/admin/laporan/{id}` requires `ob_id` already set**, or `400`.
- **Empty string is not "no value"** for the Laporan PATCH's "at least one non-null field" rule.
- **Login's "Ingat Saya" checkbox has no backing field in `LoginRequest`** — confirm whether it's purely client-side session persistence or needs a backend param before wiring it up.
- **`DELETE /api/admin/laporan/{id}` is a permanent, cascading hard-delete** — always confirm before calling, and refetch/invalidate OB-side queries (dashboard, gabung list) touching that laporan afterward.
- **Concurrent-session / stale-state pattern also applies to `ob_id` ownership.** Both "ambil laporan" (`409` if already taken) and "batalkan"/"kolaborasi keluarkan" (`403` if not owner) guard against the same race-condition class as concurrent logins — server is source of truth, always refetch after a state-changing action, surface conflict errors instead of swallowing them.