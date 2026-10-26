import { type } from "arktype";
import { nonEmptyTrimmed } from "@common/fields.ts";
import { volunteerRole } from "@common/user.ts";

export const loginInput = type({
  email: "string.email",
  // no strength rules on login: a short password should read as "wrong password", so Firebase decides
  password: "string > 0",
});

export const signUpPasswordRequirements = [
  {
    label: "At least 8 characters",
    test: (password: string) => password.length >= 8,
  },
  {
    label: "At least 1 letter",
    test: (password: string) => /[A-Za-z]/.test(password),
  },
  {
    label: "At least 1 number",
    test: (password: string) => /\d/.test(password),
  },
] as const;

// The shared checks drive both the schema and the live client-side checklist.
const strongPassword = type("string")
  .narrow((password) =>
    signUpPasswordRequirements.every(({ test }) => test(password)),
  )
  .configure({
  message:
    "Password must be at least 8 characters and include a letter and a number",
  });

// name and role fields shared by the sign-up and create-user schemas
const profileFields = {
  firstName: nonEmptyTrimmed,
  lastName: nonEmptyTrimmed,
  role: volunteerRole,
};

export const signUpInput = type({
  ...profileFields,
  email: "string.email",
  password: strongPassword,
  confirmPassword: "string >= 8",
}).narrow(
  (data, ctx) =>
    data.password === data.confirmPassword ||
    // attach the error to confirmPassword so validateForm reports it on that field
    ctx.reject({
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
);

export const createUserInput = type({
  ...profileFields,
});

export type LoginInput = typeof loginInput.infer;
export type SignUpInput = typeof signUpInput.infer;
export type CreateUserInput = typeof createUserInput.infer;
