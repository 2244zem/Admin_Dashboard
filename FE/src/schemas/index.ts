import { z } from "zod";

export function validateList<T>(schema: z.ZodTypeAny, items: T[]): T[] {
  const valid: T[] = [];
  const dropped: string[] = [];
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(item);
    } else {
      // ponytail: show first error detail in dev
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      console.warn(`[validateList] Dropped: ${issues}`, item);
      dropped.push(issues);
    }
  }
  return valid;
}

export const petugasSchema = z.object({
  nama: z.string(),
});

// ponytail: lenient — checklist-harian rows are normalized in mapApiChecklistToTask,
// so don't drop real tasks when a display field is missing/empty.
export const taskSchema = z.object({
  id: z.string(),
  kategori: z.string().optional(),
  namaTugas: z.string().optional(),
  gedung: z.string().optional(),
  lantai: z.string().optional(),
  petugas: petugasSchema.optional(),
  waktu: z.string().optional(),
  tanggal: z.string().optional(),
  catatan: z.string().optional(),
  status: z.enum(["Belum", "Proses", "Selesai", "Delayed"]).optional(),
}).passthrough();

// ponytail: lenient like laporanSchema — backend rows are normalized in mapApiUser,
// so don't drop real users just because a display-only field is absent.
export const appUserSchema = z.object({
  id: z.number(),
  backendId: z.string().optional(),
  namaLengkap: z.string(),
  username: z.string(),
  email: z.string().optional(),
  noTelepon: z.string().optional(),
  role: z.string(),
  departemen: z.string().optional(),
  status: z.string().optional(),
  avatar: z.string().nullish(),
  createdAt: z.string().optional(),
  tokenStatus: z.string().optional(),
  tokenExpiredAt: z.string().optional(),
  tokenString: z.string().optional(),
  lastLogin: z.string().optional(),
  deviceId: z.string().optional(),
  appVersion: z.string().optional(),
  stats: z.object({
    tasksCompleted: z.number().optional(),
    avgResponseMinutes: z.number().optional(),
    rejected: z.number().optional(),
  }).optional(),
  activityLog: z.array(z.any()).optional(),
}).passthrough();

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
