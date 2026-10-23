/**
 * The different validation error types
 */
export type AuthErrorVariant = "error" | "warning" | "offline";

/**
 * Props that follow the design's validation errors
 */
export interface AuthErrorContent {
  variant: AuthErrorVariant; // red | yellow | gray banner
  title?: string; // optional - "incorrect email or password" has no title
  message: string;
  canRetry: boolean; // show the "Try again" button
}

/**
 * Possible auth methods: (1) password (2) Google sign-in
 */
export type AuthMethod = "password" | "google";

// Inline field errors (V1)
export const EMAIL_REQUIRED_MESSAGE = "Enter your email address.";
export const EMAIL_INVALID_MESSAGE =
  "Enter a full email address, like name@example.org.";
export const PASSWORD_REQUIRED_MESSAGE = "Enter your password.";

/**
 * Checks whether an email is formatted correctly
 * @param email
 * @returns Error message if email is formatted incorreclty, undefined if correct
 */
export function emailFieldError(email: string): string | undefined {
  const value = email.trim();
  if (!value) return EMAIL_REQUIRED_MESSAGE;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return EMAIL_INVALID_MESSAGE;
  return undefined;
}

/**
 * Checks if a password has been entered
 * @param password
 * @returns PASSWORD_REQUIRED_MESSAGE if not entered, undefined if entered
 */
export function passwordFieldError(password: string): string | undefined {
  return password ? undefined : PASSWORD_REQUIRED_MESSAGE;
}

// Banner messages for each error type
const OFFLINE: AuthErrorContent = {
  variant: "offline",
  title: "You're offline",
  message: "Connect to Wi-Fi or mobile data, then try again.",
  canRetry: true,
};

const SIGN_IN_FAILED: AuthErrorContent = {
  variant: "warning",
  title: "We couldn’t complete sign-in",
  message: "Your details are still filled in.",
  canRetry: true,
};

const GOOGLE_FAILED: AuthErrorContent = {
  variant: "error",
  title: "Google sign-in didn’t work",
  message: "Try again, or use your email and password.",
  canRetry: true,
};

/**
 * Converts Firebase Authentication errors into user-facing banner messages.
 * @returns null when no error should be shown (e.g. user closed the Google popup).
 */
export function authErrorMessage(
  error: unknown,
  method: AuthMethod = "password",
): AuthErrorContent | null {
  const code = getAuthErrorCode(error);

  // User backed out of the Google pop: not an error
  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return null;
  }

  // Offline takes priority for either method (V5).
  if (code === "auth/network-request-failed" && isOffline()) {
    return OFFLINE;
  }

  if (method === "google") {
    return GOOGLE_FAILED;
  }

  switch (code) {
    case "auth/invalid-email":
      return {
        variant: "error",
        message: EMAIL_INVALID_MESSAGE,
        canRetry: false,
      };
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return {
        variant: "error",
        message: "Email or password is incorrect. Please try again.",
        canRetry: false,
      };
    case "auth/too-many-requests":
      return {
        variant: "error",
        message: "Too many attempts. Please try again later.",
        canRetry: false,
      };
    default:
      // Online network failures, timeouts, internal errors, unknown codes (V4)
      return SIGN_IN_FAILED;
  }
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function getAuthErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}
