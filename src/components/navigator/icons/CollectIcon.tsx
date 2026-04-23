import type { SVGProps } from 'react';

export default function CollectIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Dollar sign in circle: circle outline, dollar symbol centered */}
      <circle cx="12" cy="12" r="8" />
      <path d="M 12 8 L 12 16" />
      <path d="M 10 9 L 14 9" />
      <path d="M 10 15 L 14 15" />
    </svg>
  );
}
