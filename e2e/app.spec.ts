import { expect, test } from "@playwright/test";
import { TEST_USER } from "@e2e/emulator.ts";

test("signs in, then navigates to a protected route", async ({ page }) => {
  await page.goto("/");

  // Public procedure: no token needed.
  await expect(page.getByTestId("hello")).toHaveText("Hello, world!");

  // Protected procedure: the auth middleware rejects an anonymous caller.
  await expect(page.getByTestId("me-error")).toContainText("UNAUTHORIZED");

  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByTestId("email").fill(TEST_USER.email);
  await page.getByTestId("password").fill(TEST_USER.password);
  await page.getByTestId("sign-in").click();

  // The tRPC link now sends a Firebase ID token, which the server verifies.
  await expect(page.getByTestId("me")).toContainText(TEST_USER.email);

  // Protected procedure backed by Firestore.
  await page.getByRole("link", { name: "Notes" }).click();
  await page.getByTestId("note-text").fill("first note");
  await page.getByTestId("add-note").click();
  await expect(page.getByTestId("notes")).toContainText("first note");

  await page.getByTestId("sign-out").click();
  await expect(page).toHaveURL(/\/$/);
});
