"use client";

import Image from "next/image";

interface LogomarkProps {
  size?: number;
  alt?: string;
}

export default function Logomark({
  size = 32,
  alt = "Builder's Knowledge Garden",
}: LogomarkProps) {
  return (
    <Image
      src="/icon.png"
      alt={alt}
      width={size}
      height={size}
      priority
      style={{
        width: size,
        height: size,
        display: "block",
      }}
    />
  );
}
