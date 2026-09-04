// Downward chevron that smoothly rotates to point up when its section is open — shared by
// every click-to-expand row in the app so they all animate the same way.
export default function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={`shrink-0 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""} ${className}`}
      aria-hidden="true"
    >
      <path d="M3 5.5L7 9.5L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
