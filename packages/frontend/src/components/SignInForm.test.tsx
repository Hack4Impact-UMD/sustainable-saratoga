import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignInForm } from "@frontend/components/SignInForm.tsx";

describe("SignInForm", () => {
  it("renders the sign-in fields", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SignInForm />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Email")).toHaveValue("demo@example.com");
    expect(screen.getByTestId("sign-in")).toBeEnabled();
  });
});
