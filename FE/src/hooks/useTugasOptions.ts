import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllTugas } from "../api/tugas";
import { extractArray } from "../lib/response";
import { getErrorMessage } from "../lib/utils";
import { optionSchema, validateList } from "../schemas";

async function fetchTugas(kategori_id?: string) {
  const data = await getAllTugas({ kategori_id });
  const list = extractArray(data, "tugas");
  return validateList(optionSchema, list.map((t: any) => ({ id: String(t.id), nama: t.nama_tugas || "-" })), "tugas");
}

export { useTugasOptions };
export default useTugasOptions;
function useTugasOptions(kategoriId?: string) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["tugas", kategoriId], queryFn: () => fetchTugas(kategoriId) });

  return {
    tugasList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: (id?: string) => qc.invalidateQueries({ queryKey: ["tugas", id] }),
  };
}
