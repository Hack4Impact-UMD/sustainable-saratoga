import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { deliverInvites, inviteLink } from "@backend/services/inviteDelivery.ts";

const messages = [
  { email: "a@example.com", token: "tokenA" },
  { email: "b@example.com", token: "tokenB" },
];
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("APP_URL", "https://app.test");
  vi.stubEnv("FUNCTIONS_EMULATOR", "");
  vi.stubEnv("RESEND_API_KEY", "key");
  vi.stubEnv("INVITE_FROM_EMAIL", "invites@sustainablesaratoga.org");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

it("prints links instead of sending on the emulator", async () => {
  vi.stubEnv("FUNCTIONS_EMULATOR", "true");
  await expect(deliverInvites(messages)).resolves.toEqual([]);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(console.log).toHaveBeenCalledWith(
    `[invite] a@example.com: ${inviteLink("tokenA")}`,
  );
  expect(console.log).toHaveBeenCalledTimes(2);
});

it("sends one email per invitee with the link", async () => {
  fetchMock.mockResolvedValue({ ok: true });
  await expect(deliverInvites(messages)).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe("https://api.resend.com/emails");
  expect(init.headers.Authorization).toBe("Bearer key");
  const body = JSON.parse(init.body);
  expect(body.to).toEqual(["a@example.com"]);
  expect(body.text).toContain("https://app.test/accept-invite?token=tokenA");
});

it("reports only the emails that failed", async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce({ ok: false, status: 422 });
  await expect(deliverInvites(messages)).resolves.toEqual([
    { email: "b@example.com", reason: "Delivery failed." },
  ]);
});

it("reports a network error as a failure instead of throwing", async () => {
  fetchMock.mockRejectedValue(new Error("offline"));
  const failures = await deliverInvites(messages);
  expect(failures.map((f) => f.email)).toEqual(["a@example.com", "b@example.com"]);
});

it("fails every email when the provider is not configured", async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  const failures = await deliverInvites(messages);
  expect(failures).toHaveLength(2);
  expect(fetchMock).not.toHaveBeenCalled();
});