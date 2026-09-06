/**
 * CleanConnect logo.
 *
 * Concept: a location pin (the "Connect" — local marketplace matching you to a
 * cleaner near you) with a sparkle inside it (the "Clean" — a spotless result).
 *
 * - <LogoMark />  : just the SVG symbol. Inherits colour via `currentColor`
 *                   (so the existing `.brand-icon` rule still tints it green);
 *                   the sparkles use the amber `--accent` token.
 * - <Logo />      : the symbol + "CleanConnect" wordmark lockup (default export).
 */

export function LogoMark({ size = 24, accent = 'var(--accent, #f59e0b)', className = '', title = 'CleanConnect', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      {/* Pin body */}
      <path
        d="M12 2C7.582 2 4 5.582 4 10c0 4.998 5.223 10.44 7.06 12.207a1.3 1.3 0 0 0 1.88 0C14.777 20.44 20 14.998 20 10c0-4.418-3.582-8-8-8Z"
        fill="currentColor"
      />
      {/* Main sparkle inside the pin */}
      <path
        d="M12 5.2c.62 2.94 1.84 4.16 4.8 4.8-2.96.64-4.18 1.86-4.8 4.8-.62-2.94-1.84-4.16-4.8-4.8 2.96-.64 4.18-1.86 4.8-4.8Z"
        fill={accent}
      />
      {/* Small accent sparkle */}
      <path
        d="M17 3c.26 1.15.71 1.6 1.86 1.86C17.71 5.12 17.26 5.57 17 6.72c-.26-1.15-.71-1.6-1.86-1.86C16.29 4.6 16.74 4.15 17 3Z"
        fill={accent}
        opacity="0.9"
      />
    </svg>
  );
}

export default function Logo({ size = 24, text = 'CleanConnect', className = '', markClassName = 'brand-icon', accent, title }) {
  return (
    <span className={`app-logo ${className}`.trim()}>
      <LogoMark size={size} accent={accent} title={title} className={markClassName} />
      {text && <span className="app-logo-text">{text}</span>}
    </span>
  );
}
