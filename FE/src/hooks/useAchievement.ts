import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  getObAchievements,
  type CreateAchievementPayload,
  type UpdateAchievementPayload,
  type Achievement,
  type ObAchievement,
} from "../api/achievement";
import { extractArray } from "../lib/response";
import { getErrorMessage } from "../lib/utils";

export { useAchievementList, useAchievementDetail, useObAchievements };

// ── Admin: list all achievement definitions ──────────────────────────────────
function useAchievementList(includeInactive = false) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["achievements", includeInactive],
    queryFn: async () => {
      const raw = await getAchievements(includeInactive);
      return extractArray<Achievement>(raw);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["achievements"] });

  return {
    achievements: (query.data as Achievement[] | undefined) ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: invalidate,
    create: async (p: CreateAchievementPayload) => {
      const r = await createAchievement(p);
      invalidate();
      return r;
    },
    update: async (id: string, p: UpdateAchievementPayload) => {
      const r = await updateAchievement(id, p);
      invalidate();
      return r;
    },
    remove: async (id: string) => {
      const r = await deleteAchievement(id);
      invalidate();
      return r;
    },
  };
}

// ── Admin: single achievement detail ─────────────────────────────────────────
function useAchievementDetail(id: string | undefined) {
  const query = useQuery({
    queryKey: ["achievement", id],
    queryFn: () => getAchievementById(id!),
    enabled: !!id,
  });

  return {
    achievement: query.data ?? null,
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}

// ── Per-OB achievements (used in Performa leaderboard) ───────────────────────
function useObAchievements(obId: string | undefined) {
  const query = useQuery({
    queryKey: ["ob-achievements", obId],
    queryFn: async () => {
      const raw = await getObAchievements(obId!);
      return extractArray<ObAchievement>(raw);
    },
    enabled: !!obId,
  });

  return {
    achievements: (query.data as ObAchievement[] | undefined) ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
  };
}
