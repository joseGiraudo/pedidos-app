import Link from "next/link";

import { resolveCustomerContext } from "@/lib/customer-access";
import { loadDraftView } from "@/lib/order-draft";

import { LinkInactive } from "../link-inactive";
import { ReviewForm } from "./review-form";

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await resolveCustomerContext(token);
  if (!ctx) return <LinkInactive />;

  const draft = await loadDraftView(ctx.customer);

  if (!draft) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-xl font-semibold">Tu pedido está vacío</h1>
        <p className="text-muted-foreground">Agregá artículos desde la lista para armar tu pedido.</p>
        <Link href={`/p/${token}`} className="text-primary text-sm hover:underline">
          ← Volver a la lista
        </Link>
      </main>
    );
  }

  return <ReviewForm token={token} draft={draft} />;
}
