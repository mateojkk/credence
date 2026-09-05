import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      {/* Shared ambient layer: soft glow + grain behind every app page */}
      <div aria-hidden className="grain pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh] overflow-hidden">
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 8%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 66%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background"
        />
      </div>

      <Navbar />
      <main className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
      <Footer />
    </ToastProvider>
  );
}
