import { ThemeToggle } from './ThemeToggle';

/** "Back" pill + theme toggle header used on the static pages. */
export function PageHeader({ width = 'max-w-3xl' }: { width?: string }) {
  return (
    <header className="border-b border-border">
      <div className={`${width} mx-auto px-4 py-4 flex items-center justify-between`}>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
