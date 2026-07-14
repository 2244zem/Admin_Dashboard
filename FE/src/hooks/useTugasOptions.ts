import { useState, useEffect, useCallback } from "react";
import { getAllTugas, type Tugas } from "../api/tugas";
import { getErrorMessage } from "../lib/utils";

export function useTugasOptions() {
  const [tugasList, setTugasList] = useState<Array<{ id: string; nama: string; kategori_id?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTugas = useCallback(async (kategori_id?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = kategori_id ? { kategori_id } : undefined;
      const data = await getAllTugas(params);
      const list = Array.isArray(data) ? data : (data?.data || data?.tugas || []);
      
      setTugasList(
        list.map((t: Tugas) => ({
          id: String(t.id),
          nama: t.nama_tugas || "-",
          kategori_id: t.kategori_id,
        }))
      );
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error("Failed to fetch tugas:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTugas();
  }, [fetchTugas]);

  return {
    tugasList,
    isLoading,
    error,
    fetchTugas,
  };
}

export default useTugasOptions;
