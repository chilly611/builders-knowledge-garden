import type { SVGProps } from 'react';

export default function SizeUpIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Measuring tape: left and right ends with tick marks, curved tape in middle */}
      <circle cx="4" cy="12" r="2" />
      <circle cx="20" cy="12" r="2" />
      <path d="M 6 12 Q 12 8 18 12" />
      <line x1="3" y1="10" x2="3" y2="14" />
      <line x1="21" y1="10" x2="21" y2="14" />
    </svg>
  );
}
