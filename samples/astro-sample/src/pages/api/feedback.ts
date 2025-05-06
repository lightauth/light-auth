export const prerender = false; // Not needed in 'server' mode
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const data = await request.formData();
  const name = data.get("name");
  const email = data.get("email");
  const message = data.get("message");
  // Validate the data - you'll probably want to do more than this
  // if (!name || !email || !message) {
  //   return new Response(
  //     JSON.stringify({
  //       message: "Missing required fields",
  //     }),
  //     { status: 400 }
  //   );
  // }
  return redirect("/Login");
  // Do something with the data, then return a success response
  // return new Response(
  //   JSON.stringify({
  //     message: "Success!",
  //   }),
  //   { status: 200 }
  // );
};

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  cookies.set("name", "John Doe", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  return redirect("/Login", 307);
};
