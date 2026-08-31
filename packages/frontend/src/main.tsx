import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@frontend/index.css";
import { router } from "@frontend/router.tsx";
import { queryClient } from "@frontend/lib/trpc.ts";
import { useAuth } from "@frontend/lib/useAuth";
import AuthProvider from "@frontend/components/auth/AuthProvider";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

function InnerApp() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
