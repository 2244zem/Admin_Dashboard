<CLAUDE_DOCUMENTATION>

<DOCUMENT_INFO>
Title: CLAUDE.md
Purpose: System guidance for AI assistants working on the WGS Admin Page Frontend repository.
</DOCUMENT_INFO>

<PROJECT_OVERVIEW>
Name: WGS Admin Page Frontend
Description: React-based admin dashboard for building management operations. Manages reports (laporan), ad-hoc tasks (tugas), daily checklists (checklist harian), users (OB, HR, Admin, Karyawan), and locations (gedung/lantai/ruangan).
</PROJECT_OVERVIEW>

<TECH_STACK>
Framework: React 19 + TypeScript
Routing: React Router DOM v7
State/Data: TanStack Query (React Query) v5
HTTP Client: Axios
Styling: Tailwind CSS v4
Animations: Framer Motion
Validation: Zod
Build Tool: Vite
</TECH_STACK>

<DATA_FLOW_PATTERN>
All API calls go through src/api/*.ts modules -> src/hooks/*.ts (TanStack Query) -> React components.
Rule: Never call apiClient directly from components. Always use hooks.
</DATA_FLOW_PATTERN>

<API_STRUCTURE>
src/api/       : API function definitions
src/hooks/      : TanStack Query hooks (data + mutations)
src/types/      : TypeScript interfaces
src/services/   : apiClient singleton
src/config/     : Endpoint URLs
</API_STRUCTURE>

<KEY_API_ENDPOINTS_SUMMARY>
Feature | Endpoint
Auth (login/logout/activation/password) | /api/auth/*
User profile (self) | /api/user/profile
Karyawan | /api/karyawan/*
OB - laporan (ambil/submit/batalkan/kolaborasi) | /api/ob/laporan/*
OB - dashboard | /api/ob/dashboard
OB - tugas ad-hoc (claim/selesai) | /api/ob/tugas/*
Users (Admin) | /api/admin/user
Roles (Admin) | /api/admin/role
Reports (Admin) | /api/admin/laporan
Locations / Floors / Rooms | /api/lokasi, /api/lantai, /api/ruangan
Kategori | /api/kategori
Tugas (katalog master data, Admin) | /api/tugas
Checklist Harian | /api/checklist-harian
Notifications | /api/notifikasi
WebSocket | /ws
</KEY_API_ENDPOINTS_SUMMARY>

<THREE_ASSIGNABLE_WORK_RESOURCES>
This system has three separate "work item" resources that all get assigned to an OB. Do not conflate them.

Resource 1: Laporan (report)

* Created by: Karyawan via POST /api/karyawan/laporan
* Assignment model: OB self-claims from open pool via PATCH /api/ob/laporan/{id}, or joins as collaborator (gabung)
* Collaboration support: Yes - full gabung (join-request) system with approve/reject/kick
* Status enum: BELUM_DIKERJAKAN | PENDING | SELESAI | DIBATALKAN
* Completion path: OB submits directly via POST /api/ob/laporan/{id} (status -> SELESAI), or Admin approves via PATCH /api/admin/laporan/{id} (status -> SELESAI) - two independent writers.
* Endpoints (OB side): /api/ob/laporan/*
* Endpoints (Admin side): /api/admin/laporan/*

Resource 2: Checklist Harian

* Created by: Admin via POST /api/checklist-harian
* Assignment model: Admin pushes directly to a specific OB (ob_id set at creation)
* Collaboration support: No
* Status enum: BELUM_DIKERJAKAN | SEDANG_DIKERJAKAN | SELESAI | TERLEWAT
* Completion path: Admin edits status via PATCH /api/checklist-harian/{id}
* Endpoints (OB side): Read-only, surfaced via /api/ob/dashboard
* Endpoints (Admin side): /api/checklist-harian/*

Resource 3: Tugas (ad-hoc katalog)

* Created by: Admin via POST /api/tugas
* Assignment model: OB self-claims from an unclaimed pool via PATCH /api/ob/tugas/{id}/claim, or admin force-assigns via PATCH /api/tugas/{id} with ob_id
* Collaboration support: No
* Status enum: BELUM_DIKERJAKAN | SEDANG_DIKERJAKAN | SELESAI (TERLEWAT not confirmed for this resource - verify)
* Completion path: OB marks done via PATCH /api/ob/tugas/{id}/selesai or Admin force-sets status via PATCH /api/tugas/{id}
* Endpoints (OB side): /api/ob/tugas/*
* Endpoints (Admin side): /api/tugas/*

Note: /api/tugas (Admin katalog CRUD) and /api/ob/tugas (OB claim/selesai) read/write the same underlying table - they are two role-scoped views of one resource, not two resources.
</THREE_ASSIGNABLE_WORK_RESOURCES>

<TANSTACK_QUERY_HOOKS>

* useAuth() (or equivalent) - login, logout, forgot/reset/change password
* useTasks(filters?) - Checklist Harian, server-side filter params
* useObTugas() - ad-hoc Tugas pool (OB side: list/claim/selesai)
* useTugasKatalog() / useTugas() (Admin) - Tugas master data CRUD
* useLokasi() - Location hierarchy (gedung -> lantai -> ruangan)
* useUsers() - User management
* useKategori() - Task categories
* useLaporan() - Reports (talks to /api/admin/laporan, page-based pagination)
* useRoles() - populate role_id dropdown (backed by GET /api/admin/role, don't hardcode role IDs)
* useNotifikasi() - notification list + unread count + WebSocket sync
</TANSTACK_QUERY_HOOKS>

<LOCATION_DATA_MODEL>
The useLokasi hook fetches from 3 endpoints and normalizes into a nested hierarchy:

```json
gedungList: [{
  "id": "string",
  "nama": "string",
  "kapasitas": "number",
  "lantai": [{
    "id": "string",
    "label": "string",
    "nama": "string",
    "ruangan": [{ "id": "string", "nama": "string" }]
  }]
}]

```

</LOCATION_DATA_MODEL>

<AUTH_AND_PERMISSIONS>
AuthContext decodes JWT and assigns permissions based on role:

Role | Permissions
Admin | Full access
HR | tasks:create, tasks:edit, lokasi:read
OB | tasks:read, lokasi:read

Components: Use  or <Can roles="{["Admin"]}"> components to gate UI elements.

Backend roles across the API surface: Admin, HR, OB, Karyawan.
Role IDs needed for POST/PATCH /api/admin/user's role_id field should come from GET /api/admin/role - don't hardcode UUIDs for roles anywhere in the FE.

Users carry an is_active boolean, editable via PATCH /api/admin/user/{user_id}.
</AUTH_AND_PERMISSIONS>

<STATUS_MAPPING>
There are four separate status vocabularies in this system. Do not treat them as interchangeable.

1. Laporan (Report) status - backend enum:
BELUM_DIKERJAKAN | PENDING | SELESAI | DIBATALKAN
2. Laporan status - UI labels (observed in StatusBadge on dashboard/report pages):
Menunggu | Ditugaskan | Selesai | Ditolak

Mapping:
BELUM_DIKERJAKAN -> Menunggu
PENDING -> Ditugaskan
SELESAI -> Selesai
DIBATALKAN -> Ditolak

3. Checklist Harian status:
BELUM_DIKERJAKAN | SEDANG_DIKERJAKAN | SELESAI | TERLEWAT
UI Labels: Belum / Proses / Selesai / Delayed
Mapper functions in useTasks.ts: mapApiStatus() (API -> UI), mapUiStatus() (UI -> API).
4. Tugas (ad-hoc katalog) status:
BELUM_DIKERJAKAN (default on create) -> SEDANG_DIKERJAKAN (after OB claims) -> SELESAI (after OB finishes).
Same literal strings as #3 for the first three values, but this is a separate resource/table from Checklist Harian - don't reuse a Checklist mapper/badge component for Tugas rows without checking it handles this resource's own value set (TERLEWAT is unconfirmed here).

Prioritas (report priority, Laporan only): STANDARD | URGENT.
</STATUS_MAPPING>

<ID_HANDLING>
Backend UUIDs may come with prefixes (e.g., gd-, lt-). The stripIdPrefix() utility removes these when sending to API. Frontend components should NOT strip IDs - let hooks handle it.
</ID_HANDLING>

<RESPONSE_WRAPPING>
Backend returns wrapped responses:
Success shape: { "success": true, "message": "string", "data": {...} }
Error shape: { "success": false, "message": "string", "errors": {} }

The apiClient unwraps to response.data, but hooks like useTasks.extractArray() handle multiple possible structures:

* response.checklist.items
* response.data
* response.items
* Direct array

Two pagination styles exist:

* Offset/page-based (page, limit, meta: { total_items, current_page, limit, total_pages }) - used by all /api/admin/* list endpoints and /api/checklist-harian.
* Cursor-based (cursor, next_cursor) - used only by GET /api/user/profile (the logged-in user's own report history).
</RESPONSE_WRAPPING>

<ROUTE_STRUCTURE>
/login             : Login page
/forgot-password    : Request password reset link
/reset-password     : Set new password from email token
/activate-account   : Account activation
/dashboard          : Main dashboard
/tasks              : Task management (CRUD + filter by lokasi/lantai)
/users              : User management
/datalokasi         : Location management (gedung/lantai/ruangan)
/reports            : Reports view
/performance/:userId : OB/Karyawan performance analytics
</ROUTE_STRUCTURE>

<API_REFERENCE_FULL>

Base response envelope for all endpoints below:
Success: { "success": true, "message": "string", "data": { } }
Error: { "success": false, "message": "string", "errors": { } }

<SECTION_AUTH>

POST /api/auth/login
Access: Public
Description: Login user
Request:

```json
{ "identifier": "string", "password": "string" }

```

Response 200:

```json
{ "success": true, "message": "string", "data": { "jwt_token": "string" } }

```

Response 401: Login gagal

Note: FE error copy for failed login is "Username atau password salah. Silakan coba lagi." - identifier accepts either username or email (field labeled "Email/Username" in the UI), keep label/behavior consistent with what this field actually validates.

Note on "Ingat Saya": The login mockup shows an "Ingat Saya" (remember me) checkbox with no corresponding field in LoginRequest (only identifier/password). Either client-side decision (localStorage vs sessionStorage for JWT) with no backend involvement, or backend needs a param added. Confirm with backend before wiring checkbox.

GET /api/auth/check-token
Access: Public
Description: Verifikasi token aktivasi
Query: token (string, required) - token aktivasi dari link email.
Response 200: Token valid

POST /api/auth/activate-account
Access: Public
Description: Aktivasi akun & set password pertama kali
Query: token (string, required)
Request:

```json
{ "password": "string", "confirmPassword": "string" }

```

Response 200:

```json
{ "success": true, "message": "Akun berhasil diaktivasi, silahkan login" }

```

Response 400: Token tidak valid / Validation Failed / Password tidak cocok

POST /api/auth/logout
Access: Terautentikasi
Description: Logout & revoke session (token becomes unusable immediately after this call).
Response 200:

```json
{ "success": true, "message": "Logout berhasil" }

```

Response 401: Session tidak valid / Token expired

POST /api/auth/forgot-password
Access: Public
Description: Request reset link password
Request:

```json
{ "email": "user@example.com" }

```

Response 200:

```json
{ "success": true, "message": "Link reset password telah dikirim ke email Anda" }

```

Response 404: Email tidak terdaftar
Response 500: Gagal memproses permintaan reset password

POST /api/auth/reset-password
Access: Public
Description: Reset password pakai token dari email
Query: token (string, required) - token reset dari email.
Request:

```json
{ "password": "string", "confirmPassword": "string" }

```

Response 200:

```json
{ "success": true, "message": "Password berhasil diubah, silakan login" }

```

Response 400: Validation Failed (password tidak cocok atau kurang dari 6 karakter)
Response 401: Token tidak valid / kadaluwarsa / sudah digunakan

POST /api/auth/change-password
Access: Terautentikasi
Description: Ubah password (sudah login)
Request:

```json
{ "oldPassword": "string", "newPassword": "string", "confirmNewPassword": "string" }

```

Response 200:

```json
{ "success": true, "message": "Password berhasil diubah" }

```

Response 400: Password lama salah / validation failed
Response 401: Unauthorized

Note on Password Flows: There are three separate password-change flows:

1. First-time activation (activate-account, no old password, uses activation token)
2. Forgot-password (forgot-password -> reset-password, no old password, uses reset token, public)
3. Change-password while logged in (change-password, requires oldPassword, requires auth, no token param)

</SECTION_AUTH>

<SECTION_USER>

GET /api/user/profile
Access: Terautentikasi (Semua role)
Description: Ambil profil + riwayat laporan
Query: search, status, cursor, limit (default 10).
Response 200:

```json
{
  "success": true,
  "message": "string",
  "data": {
    "user": {
      "id": "uuid",
      "nama_lengkap": "string",
      "username": "string",
      "email": "string",
      "role": "string",
      "profile_picture": "string",
      "total_laporan": 0,
      "tasksCompleted": 0,
      "rejected": 0
    },
    "laporan": {
      "items": [{
        "id": "uuid",
        "kategori": "string",
        "deskripsi_kendala": "string",
        "status": "BELUM_DIKERJAKAN",
        "prioritas": "STANDARD",
        "foto_masalah": ["string"],
        "lokasi": "string",
        "nomor_lantai": 0,
        "nama_ob": "string",
        "created_at": "ISO date",
        "updated_at": "ISO date"
      }],
      "next_cursor": "string",
      "meta": { "total_items": 0, "current_page": 0, "limit": 0, "total_pages": 0 }
    }
  }
}

```

PATCH /api/user/profile
Access: Terautentikasi
Description: Update profile sendiri
Content-Type: multipart/form-data
Fields: nama_lengkap (string), profile_picture (binary file)
Response 200: Berhasil mengubah profile
Response 400: Validation Failed
Response 401: Unauthorized
Response 404: User tidak ditemukan

GET /api/user/profile/laporan/{laporan_id}
Access: Terautentikasi
Description: Detail laporan user (OB & Karyawan)
Response 200: Berhasil

</SECTION_USER>

<SECTION_KARYAWAN>

GET /api/karyawan/dashboard
Access: Karyawan
Description: Dashboard karyawan

POST /api/karyawan/laporan
Access: Karyawan
Description: Buat laporan baru
Content-Type: multipart/form-data
Fields (all required): lantai_id (uuid), ruangan_id (uuid), kategori_id (uuid), deskripsi_kendala (string), prioritas (string), foto_masalah (array of files, max 5)
Response 201: Laporan berhasil dibuat
WebSocket: Sends ADMIN_MENUGASKAN_OB to all OB + all admin.

</SECTION_KARYAWAN>

<SECTION_OB_LAPORAN>

Overview Endpoints:
GET /api/ob/dashboard : Ringkasan tugas harian + laporan OB
PATCH /api/ob/laporan/{laporan_id} : Ambil laporan
POST /api/ob/laporan/{laporan_id} : Submit hasil pekerjaan (same path as PATCH above, different verb)
POST /api/ob/laporan/{laporan_id}/batalkan : Batalkan laporan
GET /api/ob/laporan/{laporan_id}/gabung : Daftar permintaan gabung
POST /api/ob/laporan/{laporan_id}/gabung : Kirim permintaan gabung
PATCH /api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/setujui : Setujui permintaan gabung
PATCH /api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/tolak : Tolak permintaan gabung
POST /api/ob/laporan/{laporan_id}/gabung/keluar : Keluar dari kolaborasi (anggota)
PATCH /api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/keluarkan : Keluarkan anggota (pemilik)
PATCH /api/ob/laporan/{laporan_id}/kolaborasi : Buka/tutup kolaborasi laporan

Warning: PATCH /api/ob/laporan/{laporan_id} and POST /api/ob/laporan/{laporan_id} are the exact same URL with different HTTP verbs and completely different effects ("ambil laporan" vs "submit hasil pekerjaan"). A wrong verb will not 404 - it will silently perform the wrong action. Double-check HTTP method on every call site in useLaporan/useObLaporan.

GET /api/ob/dashboard
Description: Returns a summary for the logged-in OB.
Response 200:

```json
{
  "success": true,
  "data": {
    "ob": { "nama_lengkap": "string" },
    "tugas_harian_stats": { "total": 0, "resolved": 0, "pending": 0 },
    "tugas_harian": [{
      "id": "uuid",
      "nama_tugas": "string",
      "kategori": "string",
      "lokasi": "string",
      "nomor_lantai": 0,
      "status": "string",
      "tanggal": "YYYY-MM-DD"
    }],
    "laporan": [{
      "id": "uuid",
      "kategori": "string",
      "deskripsi_kendala": "string",
      "status": "string",
      "foto_masalah": ["string"],
      "lokasi": "string",
      "nomor_lantai": 0,
      "priority": "string",
      "is_kolaborasi_open": true,
      "created_at": "ISO date"
    }]
  }
}

```

Laporan shown: (a) all laporan assigned to this OB (ob_id = self), plus (b) unassigned laporan (ob_id null) with status other than PENDING.
Note on tugas_harian field: Shape reads like Checklist Harian items, not ad-hoc Tugas katalog resource. Verify resource before wiring hook.

PATCH /api/ob/laporan/{laporan_id}
Description: Ambil laporan
Side effects: status -> PENDING, ob_id -> OB yang login, dikerjakan_at -> now.
Response 200: { "success": true, "message": "Laporan berhasil diambil" }
Response 400: Validation Failed (format laporan_id tidak valid)
Response 401: Unauthorized
Response 403: Forbidden (bukan OB)
Response 404: Laporan tidak ditemukan
Response 409: Laporan sudah diambil oleh OB lain - handle explicitly (race-condition guard), do not treat as generic error.
Response 500: Terjadi kesalahan, tidak bisa mengambil laporan
WebSocket: LAPORAN_DIKERJAKAN -> pelapor.

POST /api/ob/laporan/{laporan_id}
Description: Submit hasil pekerjaan
Content-Type: multipart/form-data
Fields: catatan (string, required), foto_selesai (array of files, required)
Side effects: status -> SELESAI, selesai_at -> now.
Response 200: Histori berhasil ditambahkan
Response 403: Anda tidak memiliki akses ke laporan ini (bukan OB pemilik)
Response 404: Laporan tidak ditemukan
Response 500: Terjadi kesalahan
WebSocket: LAPORAN_BERES -> pelapor, message includes catatan.

Note: OB can mark a laporan SELESAI directly without admin approval. This is a second independent writer to the same status/selesai_at fields that PATCH /api/admin/laporan/{id} also writes.

POST /api/ob/laporan/{laporan_id}/batalkan
Description: Batalkan laporan
Content-Type: multipart/form-data
Fields: catatan (string, min 5 chars, required), foto_selesai (array of files, optional)
Side effects: status -> DIBATALKAN, ob_id -> null, dibatalkan_at -> now, alasan_gagal <- catatan.
Response 200: Laporan dibatalkan
Response 403: Bukan OB pemilik
Response 404: Laporan tidak ditemukan
Response 500: Terjadi kesalahan
WebSocket: LAPORAN_DIBATALKAN -> pelapor, with cancellation reason.

GET /api/ob/laporan/{laporan_id}/gabung
Response 200:

```json
{
  "success": true,
  "message": "string",
  "data": [{
    "id": "uuid",
    "ob": { "id": "uuid", "nama_lengkap": "string" },
    "status": "PENDING",
    "created_at": "ISO date"
  }]
}

```

Response 400 / 401

POST /api/ob/laporan/{laporan_id}/gabung
Response 201:

```json
{
  "success": true,
  "message": "string",
  "data": {
    "id": "uuid",
    "laporan_id": "uuid",
    "ob_id": "uuid",
    "status": "PENDING",
    "created_at": "ISO date"
  }
}

```

Response 400 / 401
WebSocket: GABUNG_LAPORAN -> OB pemilik laporan.

PATCH /api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/setujui
Response 200 / 400 / 401
WebSocket: GABUNG_DISETUJUI -> OB peminta.

PATCH /api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/tolak
Response 200 / 400 / 401
WebSocket: GABUNG_DIBATALKAN -> OB peminta.

POST /api/ob/laporan/{laporan_id}/gabung/keluar
Description: anggota only (not OB utama)
Response 200 / 400 / 401
WebSocket: KELUAR_KOLABORASI -> OB utama.

PATCH /api/ob/laporan/{laporan_id}/gabung/{kolaborasi_id}/keluarkan
Description: OB pemilik mengeluarkan anggota
Response 200 / 400 / 401
WebSocket: DIKELUARKAN_KOLABORASI -> OB yang dikeluarkan.

PATCH /api/ob/laporan/{laporan_id}/kolaborasi
Request: { "is_open": true }
Response 200 / 400 / 401
Response 403: Hanya OB pemilik
Response 404: Laporan tidak ditemukan
WebSocket: KOLABORASI_DIBUKA -> semua OB lain.

</SECTION_OB_LAPORAN>

<SECTION_OB_TUGAS>

GET /api/ob/tugas
Description: Daftar tugas ad-hoc (belum diklaim + yang sudah diklaim OB ini)
Response 200:

```json
{
  "success": true,
  "message": "string",
  "data": [{
    "id": "uuid",
    "nama_tugas": "string",
    "kategori": "string",
    "lantai_id": "uuid",
    "lokasi": "string",
    "nomor_lantai": 0,
    "status": "BELUM_DIKERJAKAN",
    "catatan": "string",
    "created_at": "ISO date"
  }]
}

```

Response 401 / 403: Forbidden

PATCH /api/ob/tugas/{tugas_id}/claim
Description: Klaim tugas
Side effect: status -> SEDANG_DIKERJAKAN, records claim time.
Response 200: { "success": true, "message": "Tugas berhasil diklaim" }
Response 400: Gagal mengklaim tugas
Response 401 / 403 / 404: Tugas tidak ditemukan

PATCH /api/ob/tugas/{tugas_id}/selesai
Description: Selesaikan tugas
Side effect: status -> SELESAI, records completion time.
Response 200: { "success": true, "message": "Tugas berhasil diselesaikan" }
Response 400: Gagal menyelesaikan tugas
Response 401 / 403 / 404

</SECTION_OB_TUGAS>

<SECTION_ADMIN_USERS_AND_ROLES>

Overview Endpoints:
GET /api/admin/role : List semua role
GET /api/admin/user : List semua user
POST /api/admin/user : Buat user baru
GET /api/admin/user/all-ob : List semua OB
GET /api/admin/user/all-karyawan : List semua karyawan
GET /api/admin/dashboard : Dashboard admin + KPI
GET /api/admin/user-stats : Statistik user
GET /api/admin/user/{user_id} : Detail user
PATCH /api/admin/user/{user_id} : Update user (includes is_active)
DELETE /api/admin/user/{user_id} : Hapus user
POST /api/admin/user/{user_id}/renew-token : Perpanjang token aktivasi
GET /api/admin/user/{user_id}/performance/ob : Statistik performa OB
GET /api/admin/user/{user_id}/performance/karyawan : Statistik performa Karyawan

GET /api/admin/role
Response 200:

```json
{
  "success": true,
  "message": "Berhasil mendapatkan data role",
  "data": [{ "id": "uuid", "nama_role": "admin", "created_at": "ISO date" }]
}

```

Use to populate role_id dropdown in create/edit user forms - do not hardcode role UUIDs in FE.

GET /api/admin/user
Query: page (default 1), limit (default 10), search, role_id (uuid)
Response 200: Daftar user

POST /api/admin/user
Request:

```json
{ "username": "string", "email": "user@example.com", "nama_lengkap": "string", "role_id": "uuid" }

```

Response 201: { "success": true, "message": "Berhasil menambahkan data user, link aktivasi sudah dikirim ke email user." }
Note: Account created with no password - admin creates account -> activation email sent -> user hits check-token/activate-account to set password.

GET /api/admin/user/all-ob
Response 200 (no query params)

GET /api/admin/user/all-karyawan
Response 200 (no query params)

GET /api/admin/dashboard
Query: period (harian | mingguan | bulanan | tahunan, default mingguan)
Response 200: Data dashboard

GET /api/admin/user-stats
Response 200: Statistik user

GET /api/admin/user/{user_id}
Response 200: Data user

PATCH /api/admin/user/{user_id}
Content-Type: multipart/form-data
Fields (all optional, partial update): username, email, password, nama_lengkap, role_id, profile_picture (binary), is_active (boolean)
Response 200: User berhasil diupdate

Note on Status/Active Bug: If "status tidak berubah" bug is open, verify FE active/inactive toggle sends is_active in this exact request (as a real boolean, not string "true"/"false" inside multipart/form-data) and row refetches from 200 response rather than relying on stale local state.

DELETE /api/admin/user/{user_id}
Response 200: User berhasil dihapus

POST /api/admin/user/{user_id}/renew-token
Description: Issues a new activation token and re-sends activation email (when link expired or lost).
Response 200: { "success": true, "message": "Berhasil memperbarui token aktivasi, link aktivasi baru sudah dikirim ke email user." }
Response 400: Akun sudah diaktivasi
Response 404: User tidak ditemukan
Response 500: Gagal memperbarui token aktivasi

GET /api/admin/user/{user_id}/performance/ob
Query: period (mingguan | bulanan | tahunan, default mingguan)
Response 200: { "success": true, "message": "Berhasil mendapatkan statistik performa OB", "data": {} } (data shape unspecified in spec)
Response 400 / 401
Response 403: bukan admin
Response 404: OB tidak ditemukan
Response 500

GET /api/admin/user/{user_id}/performance/karyawan
Query: period (mingguan | bulanan | tahunan, default mingguan)
Response 200: { "success": true, "message": "...", "data": { "laporan_terkirim": 15 } }
Response 400 / 401
Response 403: bukan admin
Response 404: Karyawan tidak ditemukan
Response 500

Note on Performa OB Page Mismatch:
The endpoint above is scoped to one user_id and data is undocumented empty {}. But the actual Performa OB page is a multi-staff leaderboard/analytics dashboard displaying:

* Aggregate stats: tingkat_keberhasilan (success rate %, + delta vs last period), waktu_aktif_sistem (uptime %, + status label like "Stabil"), laporan_menunggu (pending-review count, link to list)
* perbandingan_penyelesaian_tugas: bar chart comparing task completion across multiple staff (x-axis = staff names)
* tren_keluhan: monthly line chart of complaint volume
* Leaderboard table: per-OB rank, name, role tags, tasks claimed count, average speed (minutes), badge earned ("Speedy Cleaner", "High Reliability", "Hygiene Expert", or "Belum memperoleh badge")

Before building this page:

1. Check if separate aggregate endpoint exists (e.g. GET /api/admin/ob-performance or period-only query without user_id).
2. If non-existent, data requirement should go to backend team as a new endpoint spec.
3. Confirm actual response shape with backend before rendering.

</SECTION_ADMIN_USERS_AND_ROLES>

<SECTION_ADMIN_LAPORAN>

Overview Endpoints:
GET /api/admin/laporan : List laporan dengan filter
GET /api/admin/laporan/{laporan_id} : Detail laporan
PATCH /api/admin/laporan/{laporan_id} : Update status/prioritas/catatan/OB laporan
DELETE /api/admin/laporan/{laporan_id} : Hapus laporan beserta histori & kolaborasi (cascade, permanen)

GET /api/admin/laporan
Query: page, limit, search, status, prioritas, lokasi_id, lantai_id, start_date, end_date, sort_by (created_at | updated_at | prioritas | status | nama_karyawan | lokasi), sort_order (asc | desc, default desc)
Response 200: Contains laporan (paginated + meta), ruangan_terpopuler (array of { ruangan_id, nama_ruangan, nama_lantai, nama_lokasi, total_laporan }), laporan_aktif (total active count)

GET /api/admin/laporan/{laporan_id}
Response 200:

```json
{
  "success": true,
  "message": "Berhasil mendapatkan detail laporan",
  "data": {
    "id": "uuid",
    "status": "BELUM_DIKERJAKAN",
    "prioritas": "STANDARD",
    "nama_karyawan": "string",
    "lokasi": "string",
    "kategori": "string",
    "ob_ditugaskan": "string",
    "waktu_laporan": "ISO date",
    "waktu_selesai": "ISO date",
    "dikerjakan_at": "ISO date",
    "selesai_at": "ISO date",
    "dibatalkan_at": "ISO date",
    "admin_catatan": "string",
    "deskripsi_kendala": "string",
    "bukti_foto": { "urls": ["string"], "diupload_oleh": "string", "jam_upload": "string" }
  }
}

```

Response 400 / 401
Response 403: bukan admin
Response 404 / 500

PATCH /api/admin/laporan/{laporan_id}
Description: Partial update - at least one field must be non-null ("" treated as null, does not satisfy rule).
Request example:

```json
{ "status": "SELESAI", "admin_catatan": "Sudah dikonfirmasi selesai oleh admin" }

```

Status transition side-effects (server-side, automatic):
New status | Automatic side-effect
BELUM_DIKERJAKAN | Re-open: ob_id -> null, dikerjakan_at -> cleared
PENDING | dikerjakan_at -> now (requires ob_id already set)
SELESAI | selesai_at -> now
DIBATALKAN | dibatalkan_at -> now, ob_id -> null

Response 200: { "success": true, "message": "Laporan berhasil diperbarui" }
Response 400: no non-null field / invalid enum / invalid UUID / PENDING without ob_id
Response 401
Response 403: bukan admin
Response 404 / 500

Debug checklist for "status tidak berubah":

1. Exact enum string, not UI label
2. status: "" silently fails non-null rule -> expect 400
3. PENDING needs ob_id or 400
4. FE refetches after 200
5. Check if value is stale because OB used POST /api/ob/laporan/{id} (submit hasil) to set SELESAI directly. Both write the same field.

DELETE /api/admin/laporan/{laporan_id}
Description: Hard delete, no undo. Menghapus laporan permanen; histori & kolaborasi ikut terhapus via cascade.
Response 200: { "success": true, "message": "Laporan berhasil dihapus" }
Response 401
Response 403: bukan admin
Response 404 / 500

Note: Permanent hard delete, no soft-delete flag, no restore path. Cascade includes kolaborasi/gabung records. OB with open gabung modal will get 404 on next action; handle gracefully. Invalidate both admin-side and OB-side cached queries.

</SECTION_ADMIN_LAPORAN>

<SECTION_LOKASI_LANTAI_RUANGAN_KATEGORI>

Standard CRUD Table:
Resource | List | Create | Detail | Edit | Delete
Lokasi | GET /api/lokasi | POST /api/lokasi { nama_lokasi, jumlah_lantai } | GET /api/lokasi/{id} | PATCH /api/lokasi/{id} | DELETE /api/lokasi/{id}
Lantai | GET /api/lantai?lokasi_id= | POST /api/lantai { lokasi_id, nomor_lantai } | GET /api/lantai/{id}?lokasi_id= | PATCH /api/lantai/{id}?lokasi_id= { nomor_lantai } | DELETE /api/lantai/{id}?lokasi_id=
Ruangan | GET /api/ruangan?lantai_id= | POST /api/ruangan { lantai_id, nama } | GET /api/ruangan/{id}?lantai_id= | PATCH /api/ruangan/{id}?lantai_id= { nama } | DELETE /api/ruangan/{id}?lantai_id=
Kategori | GET /api/kategori | POST /api/kategori { nama_kategori } | GET /api/kategori/{id} | PUT (not PATCH) /api/kategori/{id} { nama_kategori } | DELETE /api/kategori/{id}

Warning: Kategori edit uses PUT, everything else uses PATCH. Copy-pasted hook calling .patch() will silently fail.

</SECTION_LOKASI_LANTAI_RUANGAN_KATEGORI>

<SECTION_ADMIN_TUGAS_KATALOG>

Overview Endpoints:
GET /api/tugas?kategori_id= : List tugas (katalog)
POST /api/tugas : Tambah tugas
GET /api/tugas/{tugas_id} : Detail tugas
PATCH /api/tugas/{tugas_id} : Edit tugas
DELETE /api/tugas/{tugas_id} : Hapus tugas

GET /api/tugas / GET /api/tugas/{tugas_id}
Response 200 item shape:

```json
{
  "id": "uuid",
  "kategori_id": "uuid",
  "nama_tugas": "string",
  "lantai_id": "uuid",
  "ob_id": "uuid",
  "status": "BELUM_DIKERJAKAN",
  "catatan": "string",
  "is_active": true,
  "dikerjakan_at": "ISO date",
  "selesai_at": "ISO date",
  "created_at": "ISO date",
  "updated_at": "ISO date"
}

```

POST /api/tugas
Request:

```json
{ "kategori_id": "uuid", "nama_tugas": "string", "lantai_id": "uuid", "catatan": "string" }

```

Response 201: Tugas berhasil dibuat (ob_id/status default to null/BELUM_DIKERJAKAN)

PATCH /api/tugas/{tugas_id}
Request (partial):

```json
{
  "kategori_id": "uuid",
  "nama_tugas": "string",
  "lantai_id": "uuid",
  "catatan": "string",
  "is_active": true,
  "status": "BELUM_DIKERJAKAN",
  "ob_id": "uuid"
}

```

Response 200: Tugas berhasil diupdate

Note: Admin can directly set status and ob_id here (force-assign or force-complete a tugas, bypassing OB claim/selesai flow).

DELETE /api/tugas/{tugas_id}
Response 200: Tugas berhasil dihapus

</SECTION_ADMIN_TUGAS_KATALOG>

<SECTION_CHECKLIST_HARIAN>

Request body change: no tugas_id reference - nama_tugas is now a free-text string sent directly, and lokasi_id was removed (only lantai_id remains). Ensure forms and mutation hooks bind nama_tugas as free-text string.

Overview Endpoints:
GET /api/checklist-harian : List checklist harian (OB, HR, Admin)
POST /api/checklist-harian : Buat checklist harian (Admin)
GET /api/checklist-harian/{id} : Detail checklist
PATCH /api/checklist-harian/{id} : Edit checklist (Admin)
DELETE /api/checklist-harian/{id} : Hapus checklist (Admin)

GET /api/checklist-harian
Query: page, limit, search (by nama tugas), lokasi_id, lantai_id, status (BELUM_DIKERJAKAN | SEDANG_DIKERJAKAN | SELESAI | TERLEWAT)
Response 200: Daftar checklist

POST /api/checklist-harian (Admin)
Request:

```json
{ "nama_tugas": "string", "kategori_id": "uuid", "lantai_id": "uuid", "ob_id": "uuid" }

```

Response 201: Checklist berhasil dibuat
WebSocket: PENUGASAN_CHECKLIST -> all OB.

PATCH /api/checklist-harian/{id} (Admin)
Request:

```json
{ "nama_tugas": "string", "kategori_id": "uuid", "lantai_id": "uuid", "ob_id": "uuid", "status": "string", "catatan": "string" }

```

Response 200: Checklist berhasil diupdate
Note: Send raw enum for status, not UI label, and refetch after update.

DELETE /api/checklist-harian/{id}
Response 200: Checklist berhasil dihapus

</SECTION_CHECKLIST_HARIAN>

<SECTION_NOTIFIKASI>

Schema gained ref_id and ref_tipe fields - use these to deep-link a notification click to the right detail view.

Overview Endpoints:
GET /api/notifikasi : Ambil notifikasi hari ini & kemarin
GET /api/notifikasi/unread-count : Hitung notifikasi belum dibaca
PATCH /api/notifikasi/read-all : Tandai semua sudah dibaca
PATCH /api/notifikasi/{notification_id}/read : Tandai satu sudah dibaca

GET /api/notifikasi
Response 200:

```json
{
  "success": true,
  "message": "Berhasil mendapatkan notifikasi",
  "data": {
    "hari_ini": [{
      "id": "uuid",
      "penerima_id": "uuid",
      "pengirim_id": "uuid",
      "tipe": "string",
      "judul": "string",
      "pesan": "string",
      "is_read": true,
      "read_at": "ISO date",
      "ref_id": "uuid",
      "ref_tipe": "string",
      "created_at": "ISO date",
      "pengirim": { "id": "uuid", "nama_lengkap": "string" }
    }],
    "kemarin": []
  }
}

```

GET /api/notifikasi/unread-count
Response 200: { "success": true, "message": "...", "data": 5 } (data is raw number)

PATCH /api/notifikasi/read-all
PATCH /api/notifikasi/{notification_id}/read
Response 200: Success

Known tipe values:
ADMIN_MENUGASKAN_OB | LAPORAN_DIKERJAKAN | LAPORAN_BERES | LAPORAN_DIBATALKAN | LAPORAN_BARU | GABUNG_LAPORAN | GABUNG_DISETUJUI | GABUNG_DIBATALKAN | KELUAR_KOLABORASI | DIKELUARKAN_KOLABORASI | KOLABORASI_DIBUKA | PENUGASAN_CHECKLIST

</SECTION_NOTIFIKASI>

<SECTION_WEBSOCKET>

Connection URL: GET /ws?token=xxx (same JWT as Bearer auth)
On connect:

```json
{ "type": "CONNECTED" }

```

Real-time push payload:

```json
{
  "id": "uuid",
  "penerima_id": "uuid",
  "pengirim_id": "uuid",
  "tipe": "LAPORAN_BARU",
  "judul": "Laporan baru",
  "pesan": "string",
  "is_read": false,
  "read_at": null,
  "created_at": "ISO date"
}

```

Response status: 101 Switching Protocols / 400 Token invalid/kosong
Standard pattern: Fetch /api/notifikasi/unread-count + /api/notifikasi on mount for initial state, apply socket pushes incrementally.

</SECTION_WEBSOCKET>

</API_REFERENCE_FULL>

<KNOWN_DOMAIN_GOTCHAS>

1. PATCH vs POST on identical path /api/ob/laporan/{laporan_id} do two unrelated things (ambil vs submit-hasil). Verify HTTP verb at every call site - wrong verb silently does wrong action instead of 404ing.
2. Laporan status: SELESAI has two independent writers: OB (POST /api/ob/laporan/{id}) and Admin (PATCH /api/admin/laporan/{id}).
3. Three "tugas"-named things exist (Laporan, Checklist Harian, ad-hoc Tugas katalog) with overlapping status enums and field names (nama_tugas, status, ob_id, dikerjakan_at, selesai_at). Confirm table/hook before reusing component or mapper.
4. is_active is an explicit field on PATCH /api/admin/user/{user_id}. Confirm toggle sends real boolean (not stringified) and row refetches after 200.
5. POST /api/admin/user/{user_id}/renew-token is the fix for stuck activation tokens. Check if endpoint is wired to UI action.
6. Checklist Harian request body dropped tugas_id and lokasi_id in favor of free-text nama_tugas and lantai_id only.
7. /api/tugas (Admin) and /api/ob/tugas (OB) are two views of the same table - status/ob_id change from either side should invalidate both sides' cached queries.
8. The "Performa OB" page mockup does not match documented per-user_id performance endpoint. It is a multi-staff leaderboard/analytics view, while endpoint is single-user with undocumented empty data: {}. Confirm response shape first.
9. Kategori edit uses PUT, everything else uses PATCH.
10. PENDING on /api/admin/laporan/{id} requires ob_id already set, or 400.
11. Empty string "" is not "no value" for Laporan PATCH's "at least one non-null field" rule.
12. Login "Ingat Saya" checkbox has no backing field in LoginRequest. Confirm whether client-side session persistence or needs backend param.
13. DELETE /api/admin/laporan/{id} is a permanent, cascading hard-delete. Confirm before calling, refetch/invalidate OB-side queries touching that laporan afterward.
14. Concurrent-session / stale-state pattern applies to ob_id ownership. Both "ambil laporan" (409 if taken) and "batalkan"/"kolaborasi keluarkan" (403 if not owner) guard against race conditions - server is source of truth, always refetch after state-changing action, surface conflict errors.
</KNOWN_DOMAIN_GOTCHAS>

</CLAUDE_DOCUMENTATION>