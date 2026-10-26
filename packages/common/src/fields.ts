import { type } from "arktype";

// trim first so whitespace-only names count as empty
export const nonEmptyTrimmed = type("string.trim").to("string > 0");
