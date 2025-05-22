import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  login: defineAction({
    accept: "form",
    input: z.object({ providerName: z.string(), callbackUrl: z.string() }),
    handler(input, context) {
      return { providerName: input.providerName, callbackUrl: input.callbackUrl };
    },
  }),
};
