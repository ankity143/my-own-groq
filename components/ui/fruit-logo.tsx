import React from "react";
import Link from "next/link";

interface FruitLogoProps {
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

export function FruitLogo({ size = "md", showBadge = true }: FruitLogoProps) {
  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <Link href="/" className="flex items-center gap-2.5 group select-none">
      <div className={`relative ${iconSizes[size]} transition-transform duration-300 group-hover:scale-105`}>
        {/* Modern Citrus-AI Geometric SVG Logo */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
        >
          <defs>
            <linearGradient id="fruitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="sliceGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="100%" stopColor="#FCD34D" />
            </linearGradient>
          </defs>

          {/* Outer Citrus Rind Arc */}
          <path
            d="M 6 24 A 18 18 0 0 0 42 24 Z"
            fill="url(#fruitGrad)"
            stroke="#B45309"
            strokeWidth="1.5"
          />

          {/* Inner Pith Rim */}
          <path
            d="M 9 24 A 15 15 0 0 0 39 24 Z"
            fill="#FFFBEB"
            className="dark:fill-slate-900"
          />

          {/* Citrus Segments / Neural Radii */}
          {/* Segment 1 */}
          <path
            d="M 12 23 A 12 12 0 0 0 17 33 L 23 23 Z"
            fill="url(#sliceGrad)"
          />
          {/* Segment 2 */}
          <path
            d="M 19 34 A 12 12 0 0 0 29 34 L 24 23 Z"
            fill="url(#sliceGrad)"
          />
          {/* Segment 3 */}
          <path
            d="M 31 33 A 12 12 0 0 0 36 23 L 25 23 Z"
            fill="url(#sliceGrad)"
          />

          {/* AI Neural Spark at Center Node */}
          <circle cx="24" cy="22" r="3" fill="#D97706" />
          <circle cx="24" cy="22" r="1.5" fill="#FFFBEB" />

          {/* Playful Top Leaf Accent */}
          <path
            d="M 23 18 C 22 12 28 8 32 9 C 33 13 29 17 25 18 Z"
            fill="#10B981"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight ${textSizes[size]} text-foreground font-sans`}>
            Fruit<span className="text-fruit-500 dark:text-fruit-400">AI</span>
          </span>
          {showBadge && (
            <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-fruit-500/10 text-fruit-600 dark:text-fruit-400 border border-fruit-500/20">
              BYOK
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
