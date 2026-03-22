import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  href?: string;
}

export default function Logo({
  className = "",
  iconSize = 32,
  showText = true,
  href = "/",
}: LogoProps) {
  // Using the exact manual logo icon you uploaded locally to the public folder
  const markWidth = iconSize * 1.2; 
  const markHeight = iconSize * 1.2;

  return (
    <Link href={href} className={`flex items-center gap-3 transition-opacity hover:opacity-90 ${className}`}>
      <div className="flex items-center justify-center shrink-0">
        <Image 
          src="/favicon.svg"
          alt="Sprinto Logo"
          width={markWidth}
          height={markHeight}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <span className="text-2xl font-bold tracking-tight text-text-base">
          Sprinto
        </span>
      )}
    </Link>
  );
}
