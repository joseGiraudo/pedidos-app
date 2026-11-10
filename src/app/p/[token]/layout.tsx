import type { Metadata } from "next";

// Las páginas del kiosquero no se indexan (regla de CLAUDE.md: `/p/*` con noindex). El
// metadata se hereda a todo /p/*.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">{children}</div>;
}
