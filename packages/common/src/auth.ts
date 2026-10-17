import { type } from "arktype"

export const loginInput = type({
    email: "string.email",
    password: "string >= 8"
});

export const signUpInput = type({
    firstName: "string > 0",
    lastName: "string > 0",
    email: "string.email",
    // regex to require at least 8 characters, one letter, and one number
    password: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
    confirmPassword: "string >= 8",
}).narrow((data) => data.password === data.confirmPassword);

export const createUserInput = type({
    firstName: "string > 0",
    lastName: "string > 0",
});





export type LoginInput = typeof loginInput.infer;
export type SignUpInput = typeof signUpInput.infer;
export type CreateUserInput = typeof createUserInput.infer;

