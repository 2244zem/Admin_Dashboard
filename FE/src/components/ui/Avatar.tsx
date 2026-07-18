import { getInitials, getAvatarColor } from "../../lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null | false;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-16 w-16 text-2xl",
};

/** Shows a profile photo if src is available, otherwise a colored initials circle. */
export default function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(name);
  const sizeClass = SIZE_CLASS[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextElementSibling?.classList.remove("hidden");
        }}
        className={`rounded-full object-cover border border-gray-200 shrink-0 ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold ${colorClass} ${sizeClass} ${className}`}
    >
      {initials}
    </span>
  );
}
