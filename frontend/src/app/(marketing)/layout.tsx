import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

function MarkGlyph({ className = "w-[1.05em] h-[1.05em]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0 L24 8.4 V15.6 L12 24 L0 15.6 V8.4 Z" opacity="0.35" />
      <path d="M12 4.6 L19.6 9.9 V14.1 L12 19.4 L4.4 14.1 V9.9 Z" />
    </svg>
  );
}

const anchorLinks = [
  { name: "How it works", href: "/#cycle" },
  { name: "Why trust it", href: "/#trust" },
  { name: "The numbers", href: "/#proof" },
  { name: "FAQ", href: "/#faq" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Marketing header: quiet, no wallet chrome */}
      <header className="settle sticky top-0 z-40 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-foreground">
            <MarkGlyph className="w-[1.15em] h-[1.15em] text-mark" />
            <span className="text-[1.05rem] font-medium tracking-tight">credence</span>
          </Link>

          <nav className="hidden md:flex flex-1 items-center justify-center gap-8">
            {anchorLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto md:ml-0">
            <Link
              href="/overview"
              className="group inline-flex items-center gap-1 text-sm text-foreground hover:text-accent transition-colors"
            >
              Launch app
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">{children}</main>

      {/* Compact marketing footer */}
      <footer className="border-t border-hairline bg-surface/40">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MarkGlyph className="w-[1.15em] h-[1.15em] text-mark" />
                <span className="text-base font-medium tracking-tight text-foreground">credence</span>
              </div>
              <p className="text-xs text-faint max-w-xs leading-relaxed">
                Verifiable cross-chain credit on Creditcoin, built on the
                Attestcoin Protocol.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {anchorLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <a
                href="https://attestcoin.org/"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Attestcoin
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-hairline pt-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-faint">
            <p>© 2026 Credence · BUIDL CTC 2026 Fall submission</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
