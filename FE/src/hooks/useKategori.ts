import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllKategori } from "../api/kategori";
import { extractArray } from "../lib/response";
import { getErrorMessage } from "../lib/utils";
import { optionSchema, validateList } from "../schemas";

async function fetchKategori() {
  const data = await getAllKategori();
  const list = extractArray<{ id: unknown; nama_kategori?: string }>(data, "kategori");
  return validateList(optionSchema, list.map((k) => ({ id: String(k.id), nama: k.nama_kategori || "-" })));
}

export { useKategori };
export default useKategori;
function useKategori() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["kategori"], queryFn: fetchKategori });

  return {
    kategoriList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    fetchKategori: () => qc.invalidateQueries({ queryKey: ["kategori"] }),
  };
}
