import Link from "next/link";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  href?: string;
}

function LogoMark({ iconSize }: { iconSize: number }) {
  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M14 4H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 9H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 15H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 20H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({
  className = "",
  iconSize = 20,
  showText = true,
  href = "/",
}: LogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="flex items-center justify-center rounded-xl bg-primary text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
        style={{ width: iconSize + 14, height: iconSize + 14 }}
      >
        <LogoMark iconSize={iconSize} />
      </div>
      {showText && (
        <span className="text-xl font-semibold tracking-tight text-slate-900">
          Sprinto
        </span>
      )}
    </Link>
  );
}
