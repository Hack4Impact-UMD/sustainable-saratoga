import { type } from "arktype"
import { userRole, userProfile, getUserInput } from "./user"

if (userRole("admin") instanceof type.errors) {
  throw new Error("Valid role failed")
}

if (!(userRole("guest") instanceof type.errors)) {
  throw new Error("Invalid role")
}

if (userProfile({
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
}) instanceof type.errors) {
  throw new Error("Valid profile failed")
}

if (!(getUserInput({ uid: "" }) instanceof type.errors)) {
  throw new Error("Invalid uid passed")
}