import { BaseRequest, BaseResponse } from "./models/light-auth-base";
import { buildFullUrl } from "./services/utils";

export interface LightAuthRouter {
  redirectTo: (args: { url: string; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: (args: { search?: string | RegExp; [key: string]: unknown }) => Headers | Promise<Headers>;
  setHeaders: (args: { headers: Map<string, string>; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getUrl: (args: { endpoint?: string; [key: string]: unknown }) => string | Promise<string>;
  writeJson: (args: { data: {} | null; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
}

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

    getHeaders({ req, res, search }: { req?: Request; res?: Response; search?: string | RegExp }): Headers {
      const headers = req?.headers || res?.headers;
      if (!headers) return new Headers();

      const result = new Headers();
      const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

      for (const [key, value] of headers.entries()) {
        if (!search || !searchRegex) result.set(key, value);
        else if (searchRegex.test(key)) {
          result.set(key, value);
        }
      }
      return result;
    },

    async setHeaders({ res, headers }: { res?: Response; headers: Map<string, string> }) {
      if (!res) throw new Error("light-auth: Response object is required to set headers.");

      for (const [key, value] of headers.entries()) {
        res.headers.set(key, value);
      }
      return res;
    },

    getUrl({ endpoint, req }: { endpoint?: string; req?: Request }) {
      if (!req) throw new Error("light-auth: Request object is required to get URL.");
      let url = endpoint;
      if (!url) url = req.url;

      if (!url) {
        throw new Error("light-auth: No url provided and no request object available in getUrl of nextJsLightAuthRouter.");
      }

      if (url.startsWith("http")) return url;

      const fullUrl = buildFullUrl({ endpoint, req });
      return fullUrl.toString();
    },
  };
};
