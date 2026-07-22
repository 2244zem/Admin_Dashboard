import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

// ── Types ───────────────────────────────────────────────────────────────────

export type AchievementType = "KEYWORD" | "TIME" | "KEYWORD_AND_TIME";

export interface Achievement {
  id: string;
  nama: string;
  deskripsi: string;
  tipe: AchievementType;
  keyword: string[];
  threshold: number;
  response_time_threshold_seconds: number;
  icon: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ObAchievement extends Achievement {
  diperoleh_at: string; // timestamp when OB unlocked this achievement
}

export interface CreateAchievementPayload {
  nama: string;
  deskripsi: string;
  tipe: AchievementType;
  keyword: string[];
  threshold: number;
  response_time_threshold_seconds?: number;
  icon: string;
}

export type UpdateAchievementPayload = Partial<CreateAchievementPayload>;

// ── API functions ────────────────────────────────────────────────────────────

export async function getAchievements(includeInactive = false) {
  const data = await apiClient.get<unknown>("/api/achievement", {
    params: includeInactive ? { include_inactive: true } : undefined,
  });
  return unwrapData<Achievement[]>(data);
}

export async function getAchievementById(id: string) {
  const data = await apiClient.get<unknown>(`/api/achievement/${id}`);
  return unwrapData<Achievement>(data);
}

export async function createAchievement(payload: CreateAchievementPayload) {
  return apiClient.post("/api/achievement", payload);
}

export async function updateAchievement(id: string, payload: UpdateAchievementPayload) {
  return apiClient.patch(`/api/achievement/${id}`, payload);
}

export async function deleteAchievement(id: string) {
  return apiClient.delete(`/api/achievement/${id}`);
}

export async function getObAchievements(obId: string) {
  const data = await apiClient.get<unknown>(`/api/achievement/ob/${obId}`);
  return unwrapData<ObAchievement[]>(data);
}
