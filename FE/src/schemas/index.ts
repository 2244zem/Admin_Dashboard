import { z } from "zod";

export function validateList<T>(schema: z.ZodTypeAny, items: T[], label: string): T[] {
  const valid: T[] = [];
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(item);
    } else {
      console.warn(`[zod] Dropping invalid ${label}:`, result.error.issues, item);
    }
  }
  return valid;
}

export const petugasSchema = z.object({
  nama: z.string(),
});

export const taskSchema = z.object({
  id: z.string(),
  kategori: z.string(),
  namaTugas: z.string(),
  gedung: z.string(),
  lantai: z.string(),
  petugas: petugasSchema,
  waktu: z.string(),
  tanggal: z.string(),
  catatan: z.string().optional(),
  status: z.enum(["Belum", "Proses", "Selesai", "Delayed"]),
});

export const appUserSchema = z.object({
  id: z.number(),
  backendId: z.string().optional(),
  namaLengkap: z.string(),
  username: z.string(),
  email: z.string(),
  noTelepon: z.string(),
  role: z.string(),
  departemen: z.string(),
  status: z.string(),
  avatar: z.string().optional(),
  createdAt: z.string(),
  tokenStatus: z.string(),
  tokenExpiredAt: z.string(),
  tokenString: z.string(),
  lastLogin: z.string().optional(),
  deviceId: z.string().optional(),
  appVersion: z.string().optional(),
  stats: z.object({
    tasksCompleted: z.number(),
    avgResponseMinutes: z.number(),
    rejected: z.number(),
  }),
  activityLog: z.array(z.any()),
});

export const laporanSchema = z
  .object({
    id: z.number(),
    backendId: z.string(),
    name: z.string(),
    initial: z.string(),
    loc: z.string(),
    desc: z.string(),
    createdAt: z.string(),
    status: z.string(),
    foto: z.string(),
  })
  .passthrough();

export const ruanganSchema = z.object({
  id: z.string(),
  nama: z.string(),
});

export const lantaiSchema = z.object({
  id: z.string(),
  label: z.string(),
  nama: z.string(),
  ruangan: z.array(ruanganSchema),
});

export const gedungSchema = z.object({
  id: z.string(),
  nama: z.string(),
  kapasitas: z.string(),
  lantai: z.array(lantaiSchema),
});

export const optionSchema = z
  .object({
    id: z.string(),
    nama: z.string(),
  })
  .passthrough();
