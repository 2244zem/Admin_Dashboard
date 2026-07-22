import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllKategori } from "../api/kategori";
import { extractArray } from "../lib/response";
import { getErrorMessage } from "../lib/utils";
import { optionSchema, validateList } from "../schemas";

// Mock data sementara - ganti dengan data real dari API saat backend sudah tersedia
const MOCK_KATEGORI = [
  { id: "mock-1", nama: "Kebersihan Umum" },
  { id: "mock-2", nama: "Perawatan AC" },
  { id: "mock-3", nama: "Perbaikan Listrik" },
  { id: "mock-4", nama: "Kebersihan Toilet" },
  { id: "mock-5", nama: "Perawatan Taman" },
];

async function fetchKategori() {
  try {
    const data = await getAllKategori();
    const list = extractArray<{ id: unknown; nama_kategori?: string }>(data, "kategori");
    if (list.length === 0) return MOCK_KATEGORI;
    return validateList(optionSchema, list.map((k) => ({ id: String(k.id), nama: k.nama_kategori || "-" })));
  } catch {
    // Fallback ke mock data jika API gagal
    return MOCK_KATEGORI;
  }
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
