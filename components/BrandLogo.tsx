// The wordmark's text color is baked into the SVG file itself, so we render both variants
// and let CSS (see .brand-logo-dark/.brand-logo-light in globals.css) show the right one —
// no client-side theme detection needed, works even before hydration.
export default function BrandLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/repra-full-logo.svg" alt="Repra" className={`${className} brand-logo-dark`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/repra-full-logo-light.svg" alt="Repra" className={`${className} brand-logo-light`} />
    </>
  );
}
