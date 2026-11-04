import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

// Por ahora la home solo encamina: al panel si hay sesión, al login si no.
export default async function Home() {
  const session = await getSession();
  redirect(session ? "/panel" : "/login");
}
