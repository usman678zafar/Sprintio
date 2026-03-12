import { LayoutList } from "lucide-react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
}

export default function Logo({ className = "", iconSize = 24, showText = true }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <div className="bg-primary p-1.5 rounded-lg text-white">
        <LayoutList size={iconSize} />
      </div>
      {showText && (
        <span className="text-2xl font-bold tracking-tight text-primary">
          Sprintio
        </span>
      )}
    </Link>
  );
}
