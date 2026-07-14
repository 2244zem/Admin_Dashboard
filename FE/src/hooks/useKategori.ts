import { useState, useEffect, useCallback } from "react";
import { getAllKategori, type Kategori } from "../api/kategori";
import { getErrorMessage } from "../lib/utils";

export function useKategori() {
  const [kategoriList, setKategoriList] = useState<Array<{ id: string; nama: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKategori = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllKategori();
      const list = Array.isArray(data) ? data : (data?.data || data?.kategori || []);
      
      setKategoriList(
        list.map((k: Kategori) => ({
          id: String(k.id),
          nama: k.nama_kategori || "-",
        }))
      );
    } catch (err: any) {
      setError(getErrorMessage(err));
      console.error("Failed to fetch kategori:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKategori();
  }, [fetchKategori]);

  return {
    kategoriList,
    isLoading,
    error,
    fetchKategori,
  };
}

export default useKategori;
