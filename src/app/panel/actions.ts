"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

// Cierra la sesión (Better Auth la invalida y nextCookies() borra la cookie) y
// vuelve al login.
export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
