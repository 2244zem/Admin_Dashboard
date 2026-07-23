interface Props {
  data: { label: string; count: number }[];
  legendLabel?: string;
  color?: string;
}

const SmoothLineChart = ({ data, legendLabel = "Masalah Bulanan", color = "#0ea5e9" }: Props) => {
  // Safety-net: kalau data cuma 0-1 titik, rumus x = i/(length-1) akan
  // menumpuk semua titik di x=0 (persis bug yang bikin chart "kepotong").
  // Tampilkan empty-state yang jelas daripada render kurva rusak.
  if (data.length < 2) {
    return (
      <div className="w-full flex flex-col">
        <div className="flex items-center justify-end gap-1.5 mb-1">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">
            {legendLabel}
          </span>
        </div>
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded-lg dark:bg-elevated">
          Data belum cukup untuk menampilkan tren
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const isAllZero = data.every((d) => d.count === 0);
  const svgWidth = 800;
  const svgHeight = 220;
  const pt = 20;
  const pb = 10;
  const pl = 0;
  const pr = 0;
  const w = svgWidth - pl - pr;
  const h = svgHeight - pt - pb;

  const points = data.map((d, i) => {
    const x = pl + (i / Math.max(data.length - 1, 1)) * w;
    const y = isAllZero ? pt + h : pt + h - (d.count / max) * h;
    return { x, y, label: d.label };
  });

  let pathD = `M ${points[0]?.x || 0} ${points[0]?.y || 0}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = prev.x + (curr.x - prev.x) / 2;
    pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${pt + h} L ${points[0].x} ${pt + h} Z`
      : "";

  const gradientId = `gradientArea-${legendLabel.replace(/\s+/g, "-").toLowerCase()}`;
  const lastPoint = points[points.length - 1];

  return (
    <div className="w-full flex flex-col relative">
      <div className="flex items-center justify-end gap-1.5 mb-1">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">
          {legendLabel}
        </span>
      </div>

      <div className="relative w-full h-[220px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gradientId})`} />
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {!isAllZero && lastPoint && (
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="6"
              fill="white"
              stroke={color}
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase mt-3 px-1 z-10">
        {data.map((d, i) => (
          <span key={i} className="text-center truncate max-w-[60px]">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SmoothLineChart;