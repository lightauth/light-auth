import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import {} from "astro:transitions";
import { navigate } from "astro:transitions/client";
export const server = {
  signIn: defineAction({
    input: z.string(),
    handler: async (input, ctx) => navigate("/api/auth/login"),
  }),
};
