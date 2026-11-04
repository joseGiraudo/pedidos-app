import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./auth";

// Cliente de Better Auth para el navegador. `inferAdditionalFields` trae los campos
// extra de `user` (supplierId, role) a los tipos del cliente. El baseURL se toma del
// origen actual. Se usa en login/logout; el registro va por una server action.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, useSession } = authClient;
