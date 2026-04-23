import type { SVGProps } from 'react';

export default function ReflectIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Open book with leaves: two pages, three leaf shapes rising */}
      <path d="M 4 6 Q 4 4 6 4 L 12 4 L 12 18 L 6 18 Q 4 18 4 16" />
      <path d="M 20 6 Q 20 4 18 4 L 12 4 L 12 18 L 18 18 Q 20 18 20 16" />
      <path d="M 10 9 Q 9 7 11 6" />
      <path d="M 12 8 Q 11 5 13 4" />
      <path d="M 14 10 Q 13 7 15 6" />
    </svg>
  );
}
