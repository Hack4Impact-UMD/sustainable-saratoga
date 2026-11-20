import type { QueryClient } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { auth } from "@frontend/lib/firebase.ts";

let generation = 0;

export function sessionGeneration() {
  return generation;
}

export function clearSessionQueries(client: QueryClient) {
  generation += 1;
  void client.cancelQueries();
  client.removeQueries();
}

export async function signOutAndClear(client: QueryClient) {
  clearSessionQueries(client);
  await signOut(auth);
}
