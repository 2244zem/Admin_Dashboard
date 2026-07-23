import { useState } from "react";

export interface DetailRow {
  id: string;
  namaTugas: string;
  kategori: string;
  lantai: string;
  status: string;
  catatan: string;
  ob_id: string | null;
  obNama?: string | null;
  // NEW fields assumed from backend — extend useTugasKatalog to return these
  fotoSebelum?: string | null;
  fotoSesudah?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  catatanOb?: string | null;
  isNonRutin?: boolean;
}

interface Props {
  row: DetailRow | null;
  onClose: () => void;
  onApprove?: (id: string, catatanAdmin: string) => void;
}

function durasi(mulai?: string | null, selesai?: string | null) {
  if (!mulai || !selesai) return "-";
  const ms = new Date(selesai).getTime() - new Date(mulai).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}
function jam(dateStr?: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const TugasDetailModal = ({ row, onClose, onApprove }: Props) => {
  const [catatanAdmin, setCatatanAdmin] = useState("");

  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-[#0F4C81]">
                  #{row.id.slice(0, 8).toUpperCase()} · {row.lantai}
                </span>
                {row.isNonRutin && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Tugas Non Rutin
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900">Detail Tugas: {row.namaTugas}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Setuju Tugas · Dikerjakan oleh: {row.obNama ?? "-"} (OB)
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Bukti Foto */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">Bukti Foto</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="relative rounded-lg overflow-hidden aspect-square bg-gray-100">
                  {row.fotoSebelum && <img src={row.fotoSebelum} alt="Sebelum" className="w-full h-full object-cover" />}
                  <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    SEBELUM
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Diambil Pada {jam(row.waktuMulai)}</p>
              </div>
              <div>
                <div className="relative rounded-lg overflow-hidden aspect-square bg-gray-100">
                  {row.fotoSesudah && <img src={row.fotoSesudah} alt="Sesudah" className="w-full h-full object-cover" />}
                  <span className="absolute top-1 left-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    SESUDAH
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Diambil Pada {jam(row.waktuSelesai)}</p>
              </div>
            </div>
          </div>

          {/* Performa Waktu */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Performa Waktu</p>
            <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Diambil</span>
                <span className="font-semibold text-gray-800">{jam(row.waktuMulai)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Selesai</span>
                <span className="font-semibold text-gray-800">{jam(row.waktuSelesai)}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">Total Durasi</p>
                <p className="text-xl font-bold text-[#0F4C81]">{durasi(row.waktuMulai, row.waktuSelesai)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Catatan OB */}
        <div className="px-6 pb-4">
          <p className="text-xs font-bold text-gray-500 mb-2">Catatan OB</p>
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-sm text-gray-700">
            {row.catatanOb || "Tidak ada catatan."}
          </div>
        </div>
masih
        {/* Catatan Admin */}
        <div className="px-6 pb-5">
          <p className="text-xs font-bold text-gray-500 mb-2">Catatan Admin</p>
          <textarea
            value={catatanAdmin}
            onChange={(e) => setCatatanAdmin(e.target.value)}
            placeholder="Berikan balasan untuk OB..."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#0F4C81]"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={() => onApprove?.(row.id, catatanAdmin)}
            className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Setujui
          </button>
        </div>
      </div>
    </div>
  );
};

export default TugasDetailModal;