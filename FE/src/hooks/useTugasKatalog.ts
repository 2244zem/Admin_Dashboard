import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllTugas, createTugas, updateTugas, deleteTugas, type Tugas, type GetTugasParams } from "../api/tugas";
import { extractArray } from "../lib/response";
import { getErrorMessage } from "../lib/utils";

export { useTugasKatalog };
export default useTugasKatalog;
function useTugasKatalog(filters?: GetTugasParams) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["tugas-katalog", filters ?? {}],
    queryFn: async () => {
      try {
        const raw = await getAllTugas(filters);
        if (import.meta.env.DEV) console.log("[useTugasKatalog raw]", JSON.stringify(raw));
        const result = extractArray<Tugas>(raw);
        if (import.meta.env.DEV) console.log("[useTugasKatalog extracted]", result.length, "items");
        return result;
      } catch (e) {
        if (import.meta.env.DEV) console.log("[useTugasKatalog error]", e);
        throw e;
      }
    },
  });

  // ponytail: invalidate after every write so list stays in sync
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tugas-katalog"] });

  return {
    tugasList: (query.data as Tugas[] | undefined) ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: invalidate,
    createTugas: async (p: Parameters<typeof createTugas>[0]) => {
      const r = await createTugas(p);
      invalidate();
      return r;
    },
    updateTugas: async (id: string, p: Partial<Tugas>) => {
      const r = await updateTugas(id, p);
      invalidate();
      return r;
    },
    deleteTugas: async (id: string) => {
      const r = await deleteTugas(id);
      invalidate();
      return r;
    },
  };
}
