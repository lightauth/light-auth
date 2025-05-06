import type { APIRoute } from "astro";
import { handlers } from "@/lib/auth";


export const {GET, POST} : {GET: APIRoute, POST: APIRoute} = handlers;

// export const GET: APIRoute = async ({ params, request,  }) => {

//   console.log("import.meta.env.LIGHT_AUTH_BASE_PATH", import.meta.env.LIGHT_AUTH_BASE_PATH);
//   const res = new Response();
//   const url = new URL(request.url);

//   const response = await handlers(request, res);
//   return response;

//   // return new Response(
//   //   JSON.stringify({
//   //     params: params,
//   //     name: "Astro",
//   //     url: "https://astro.build/",
//   //   })
//   // );
// };
