import React from "react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Terjadi kesalahan saat memuat data. Silakan periksa koneksi Anda.",
  onRetry,
  title = "Gagal Memuat Data",
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center w-full">
      <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-5 text-red-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
};

export default ErrorState;
