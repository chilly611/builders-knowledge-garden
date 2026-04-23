import type { SVGProps } from 'react';

export default function LockIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Padlock: body with rounded bottom, shackle, keyhole dot */}
      <path d="M 6 10 L 6 8 Q 6 4 12 4 Q 18 4 18 8 L 18 10" />
      <rect x="6" y="10" width="12" height="9" rx="1" />
      <circle cx="12" cy="14.5" r="1" />
    </svg>
  );
}
