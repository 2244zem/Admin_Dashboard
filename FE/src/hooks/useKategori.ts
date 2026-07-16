import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllKategori, type Kategori } from "../api/kategori";
import { getErrorMessage } from "../lib/utils";
import { optionSchema, validateList } from "../schemas";

type KategoriItem = { id: string; nama_kategori?: string };
type KategoriListResponse =
  | Array<KategoriItem>
  | { data?: Array<KategoriItem>; kategori?: Array<KategoriItem> };

async function fetchKategoriQuery(): Promise<Array<{ id: string; nama: string }>> {
  const data = (await getAllKategori()) as KategoriListResponse;
  const list = Array.isArray(data) ? data : data?.data ?? data?.kategori ?? [];
  const mapped = (list as Kategori[]).map((k) => ({
    id: String(k.id),
    nama: k.nama_kategori || "-",
  }));
  return validateList(optionSchema, mapped, "kategori");
}

export function useKategori() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["kategori"],
    queryFn: fetchKategoriQuery,
  });

  const kategoriList = query.data ?? [];
  const isLoading = query.isPending;
  const error = query.error ? getErrorMessage(query.error) : null;

  const fetchKategori = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["kategori"] });
  }, [queryClient]);

  return {
    kategoriList,
    isLoading,
    error,
    fetchKategori,
  };
}

export default useKategori;
