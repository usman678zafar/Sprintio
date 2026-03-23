import Image from "next/image";
import Link from "next/link";

interface PublicLogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  href?: string;
}

const LOGO_WIDTH = 522;
const LOGO_HEIGHT = 450;

export default function PublicLogo({
  className = "",
  iconSize = 32,
  showText = true,
  href = "/",
}: PublicLogoProps) {
  const width = Math.round((LOGO_WIDTH / LOGO_HEIGHT) * iconSize);

  return (
    <Link href={href} className={`flex items-center gap-3 transition-opacity hover:opacity-90 ${className}`}>
      <Image
        src="/logo.png"
        alt="Sprinto logo"
        width={width}
        height={iconSize}
        className="shrink-0 object-contain"
        priority
      />
      {showText && (
        <span className="text-2xl font-bold tracking-tight text-text-base">
          Sprinto
        </span>
      )}
    </Link>
  );
}
