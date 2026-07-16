import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllTugas, type Tugas } from "../api/tugas";
import { getErrorMessage } from "../lib/utils";
import { optionSchema, validateList } from "../schemas";

type TugasItem = { id: string; nama_tugas?: string; kategori_id?: string };
type TugasListResponse =
  | Array<TugasItem>
  | { data?: Array<TugasItem>; tugas?: Array<TugasItem> };

async function fetchTugasQuery(kategori_id?: string): Promise<Array<{ id: string; nama: string; kategori_id?: string }>> {
  const params = kategori_id ? { kategori_id } : undefined;
  const data = (await getAllTugas(params)) as TugasListResponse;
  const list = Array.isArray(data) ? data : data?.data ?? data?.tugas ?? [];
  const mapped = (list as Tugas[]).map((t) => ({
    id: String(t.id),
    nama: t.nama_tugas || "-",
    kategori_id: t.kategori_id,
  }));
  return validateList(optionSchema, mapped, "tugas");
}

export function useTugasOptions() {
  const queryClient = useQueryClient();
  const [kategoriId, setKategoriId] = useState<string | undefined>(undefined);

  const query = useQuery({
    queryKey: ["tugas", kategoriId],
    queryFn: () => fetchTugasQuery(kategoriId),
  });

  const tugasList = query.data ?? [];
  const isLoading = query.isPending;
  const error = query.error ? getErrorMessage(query.error) : null;

  const fetchTugas = useCallback(async (id?: string) => {
    setKategoriId(id);
    await queryClient.invalidateQueries({ queryKey: ["tugas", id] });
  }, [queryClient]);

  return {
    tugasList,
    isLoading,
    error,
    fetchTugas,
  };
}

export default useTugasOptions;
