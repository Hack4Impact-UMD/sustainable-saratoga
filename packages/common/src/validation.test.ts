import { type } from "arktype"
import { validateForm } from "./validation"

const testSchema = type({
  email: "string.email",
  password: "string > 0",
})

const valid = validateForm(testSchema, {
  email: "jane@example.com",
  password: "password123",
})

if (!valid.ok) throw new Error("Valid input failed")

const invalid = validateForm(testSchema, {
  email: "bad-email",
  password: "",
})

if (invalid.ok) throw new Error("Invalid input passed")