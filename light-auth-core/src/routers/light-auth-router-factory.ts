import { LightAuthRouter } from "../models/light-auth-router";
import { buildFullUrl } from "../services/utils";

export const createLightAuthRouter = (): LightAuthRouter => {
  return {
    redirectTo({ url }: { url: string }) {
      const res = new Response("Redirecting...", {
        status: 302,
        headers: {
          Location: url,
        },
      });
      return res;
    },

    writeJson({ res, data }: { res?: Response; data: any }) {
      if (!res) throw new Error("light-auth: Response object is required to write JSON.");
      const json = JSON.stringify(data);
      const response = new Response(json, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(json).toString(),
        },
      });
      return response;
    },

    getHeaders({ req, search }: { req?: Request; search?: string | RegExp }): Headers {
      const headers = req?.headers;
      if (!headers) return new Headers();

      const result = new Headers();
      const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

      for (const [key, value] of headers.entries()) {
        if (!search || !searchRegex) result.set(key, value);
        else if (searchRegex.test(key)) result.set(key, value);
      }
      return result;
    },

    setHeaders({ headers, res }: { headers?: Headers; res?: Response }) {
      if (!res) throw new Error("light-auth: Response object is required to set headers.");

      if (!headers || headers.entries().next().done) {
        return res;
      }

      for (const [key, value] of headers.entries()) {
        res.headers.set(key, value);
      }
      return res;
    },

    getUrl({ endpoint, req }: { endpoint?: string; req?: Request }) {
      if (!req) throw new Error("light-auth: Request object is required to get URL.");
      const url = endpoint ?? req.url;

      if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of nextJsLightAuthRouter.");

      if (url.startsWith("http")) return url;

      const fullUrl = buildFullUrl({ url, incomingHeaders: req.headers });
      return fullUrl.toString();
    },
  };
};
