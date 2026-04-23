import type { SVGProps } from 'react';

export default function BuildIcon(props: SVGProps<SVGSVGElement>) {
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
      {/* Hammer: raised head with claw, long handle angled */}
      <path d="M 9 18 L 12 6" strokeWidth="1.75" />
      <rect x="10" y="4" width="4" height="3" rx="0.5" />
      <path d="M 10 4 L 9 2" />
      <path d="M 10 7 L 9 9" />
    </svg>
  );
}
