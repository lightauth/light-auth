import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import {} from "astro:transitions";
import { navigate } from "astro:transitions/client";
export const server = {
  signIn: defineAction({
    input: z.string(),
    handler: async (input, ctx) => {
      // This is a server action that will be called when the form is submitted
      // You can use this to handle the form submission and return a response
      console.log("Server action called with input:", input);
      ctx.cookies.set("test-light-auth-session", input, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
      ctx.rewrite("/Login");
      console.log("Session cookie set for user:", input);
      return new Response("Redirecting...", {
        status: 302,
        headers: {
          Location: "/Login",
        },
      });
    },
  }),
};
