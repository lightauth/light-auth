import { LightAuthRouter } from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";

export const expressLightAuthRouter: LightAuthRouter = {
  writeJson: function ({ res, data }: { res?: ExpressResponse; data: {} | null }): ExpressResponse {
    if (!res) throw new Error("Response is required in writeJson function of expressLightAuthRouter");
    res.json(data);
    return res;
  },

  getUrl: function ({ endpoint, req }: { endpoint?: string; req?: ExpressRequest }): string {
    if (!req) throw new Error("Request is required in getUrl function of expressLightAuthRouter");

    const url = req?.protocol + "://" + req?.get("host") + req.originalUrl;
    const parsedUrl = new URL(url);
    const searchParams = new URLSearchParams(req?.query as any);
    parsedUrl.search = searchParams.toString();
    return parsedUrl;
  },

  getHeaders: function ({ search, req }: { search?: string | RegExp; req?: ExpressRequest }): Headers {
    if (!req) throw new Error("Request is required in getHeaders function of expressLightAuthRouter");

    const incomingHeaders = req.headers;
    if (!incomingHeaders) return new Headers();

    const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

    incomingHeaders;
    const headers = new Headers();
    if (incomingHeaders) {
      for (const [key, value] of Object.entries(incomingHeaders)) {
        if (!value) continue;
        const vals = Array.isArray(value) ? value : [value];
        for (const val of vals) {
          if (!search || !searchRegex) headers.append(key, val);
          else if (searchRegex.test(key)) {
            headers.append(key, val);
          }
        }
      }
    }
    return headers;
  },
  setHeaders: function ({ res, headers }: { res?: ExpressResponse; headers: Map<string, string> | { [key: string]: string } }): ExpressResponse {
    if (!res) throw new Error("Response is required in setHeaders of expressLightAuthRouter");

    for (const [key, value] of headers instanceof Map ? headers : Object.entries(headers)) {
      if (res.headersSent) {
        res.setHeader(key, value);
      } else {
        res.append(key, value);
      }
    }
    return res;
  },
  redirectTo: function ({ req, res, url }: { req?: ExpressRequest; res?: ExpressResponse; url: string }): ExpressResponse {
    if (!res) throw new Error("Response is required in redirectTo of expressNavigatoreStore");

    res.redirect(302, url);
    return res;
  },
};
