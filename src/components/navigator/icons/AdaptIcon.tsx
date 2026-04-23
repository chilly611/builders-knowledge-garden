import type { SVGProps } from 'react';

export default function AdaptIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
      {...props}
    >
      {/* Crossed arrows: two arrows pointing at each other, forming refresh loop */}
      <path d="M 6 9 L 10 13 L 9 10" />
      <path d="M 18 15 L 14 11 L 15 14" />
      <path d="M 10 13 L 14 11" />
    </svg>
  );
}
