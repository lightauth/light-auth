import { defineDriver } from "../fos";
import { Cookie } from "../models/cookie";

const ALLOWED_COOKIE_SIZE = 4096;
// Based on commented out section above
const ESTIMATED_EMPTY_COOKIE_SIZE = 160;
const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE;

export function splitCookieValue(value: string): Map<number, string> {
  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);

  if (chunkCount === 1) {
    return new Map<number, string>([[0, value]]);
  }

  const values = new Map<number, string>();
  for (let i = 0; i < chunkCount; i++) {
    const chunk = value.substring(i * CHUNK_SIZE, CHUNK_SIZE);
    values.set(i, chunk);
  }

  return values;
}
