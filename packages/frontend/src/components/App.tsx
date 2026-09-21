import { RouterProvider } from "@tanstack/react-router";
import { router } from "@frontend/router.tsx";
import { useAuth } from "@frontend/lib/useAuth.ts";

/**
 * Reads the auth state from context and hands it to the router, so loaders and
 * `beforeLoad` guards see the signed-in user. Must render inside `AuthProvider`.
 */
export function App() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}
