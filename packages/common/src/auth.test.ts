import { type } from "arktype"
import {
  loginInput,
  signUpInput,
  createUserInput,
} from "./auth"


//test loginInput
if (loginInput({
    email: "jane@example.com",
    password: "password123",
  }) instanceof type.errors
) {
  throw new Error("Successful login")
}

if (
  !(loginInput({
    email: "jane@doe",
    password: "",
  }) instanceof type.errors)
) {
  throw new Error("Invalid login")
}



//test signUpInput
if (signUpInput({
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    password: "password123",
    confirmPassword: "password123",
  }) instanceof type.errors
) {
  throw new Error("Successful sign up")
}

if (!(signUpInput({
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    password: "password123",
    confirmPassword: "123password",
  }) instanceof type.errors)
) {
  throw new Error("Invalid sign up")
}

// test user creation
if (createUserInput({
    firstName: "Jane",
    lastName: "Doe",
  }) instanceof type.errors
) {
  throw new Error("Valid user input")
}

if (!(createUserInput({
    firstName: "",
    lastName: "Doe",
  }) instanceof type.errors)
) {
  throw new Error("Invalid user input")
}