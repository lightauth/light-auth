import type { APIRoute } from "astro";
import { handlers } from "@/lib/auth";
export const { GET, POST }: { GET: APIRoute; POST: APIRoute } = handlers;
