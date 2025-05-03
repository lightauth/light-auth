import { BaseRequest, BaseResponse } from "./models/light-auth-base";

export interface LightAuthRouter {
  redirectTo: ({ req, res, url }: { req?: BaseRequest; res?: BaseResponse; url: string }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: ({ req, res, search }: { req?: BaseRequest; res?: BaseResponse; search: string | RegExp }) => Headers | Promise<Headers>;
  setHeaders: ({ req, res, headers }: { req?: BaseRequest; res?: BaseResponse; headers: Map<string, string> }) => Promise<BaseResponse> | BaseResponse;
  getUrl: ({ req, res }: { req?: BaseRequest; res?: BaseResponse }) => URL | Promise<URL>;
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

    getHeaders({ req, res, search }: { req?: Request; res?: Response; search: string | RegExp }): Headers {
      const headers = req?.headers || res?.headers;
      if (!headers) return new Headers();

      const result = new Headers();
      const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

      for (const [key, value] of headers.entries()) {
        if (searchRegex.test(key)) {
          result.set(key, value);
        }
      }
      return result;
    },

    async setHeaders({ res, headers }: { res?: Response; headers: Map<string, string> }) {
      if (!res) throw new Error("Response object is required to set headers.");

      for (const [key, value] of headers.entries()) {
        res.headers.set(key, value);
      }
      return res;
    },

    getUrl({ req }: { req?: Request }) {
      if (req?.url) {
        return new URL(req.url, req.headers?.get("host") ? `https://${req.headers.get("host")}` : undefined);
      }
      throw new Error("Request object with URL is required.");
    },
  };
};
