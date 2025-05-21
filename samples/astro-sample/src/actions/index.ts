import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  login: defineAction({
    accept: "form",
    input: z.object({
      providerName: z.string(),
      callbackUrl: z.string(),
    }),
    handler(input, context) {
      const { providerName, callbackUrl } = input;
      // Perform login logic here
      // For example, check credentials against a database
      return { providerName, callbackUrl };
    },
  }),
};
