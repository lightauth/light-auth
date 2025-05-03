import { LightAuthRouter } from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";

export const expressLightAuthRouter: LightAuthRouter = {
  writeJson: function ({ res, data }: { res?: ExpressResponse; data: any }): ExpressResponse {
    if (!res) throw new Error("Response is required in writeJson function of expressLightAuthRouter");
    res.json(data);
    return res;
  },

  getUrl: function ({ req }: { req?: ExpressRequest }): URL {
    if (!req) throw new Error("Request is required in getUrl function of expressLightAuthRouter");

    const url = req?.protocol + "://" + req?.get("host") + req.originalUrl;
    const parsedUrl = new URL(url);
    const searchParams = new URLSearchParams(req?.query as any);
    parsedUrl.search = searchParams.toString();
    return parsedUrl;
  },

  getHeaders: function ({ req }: { req?: ExpressRequest }): Headers {
    if (!req) throw new Error("Request is required in getHeaders function of expressLightAuthRouter");

    const incomingHeadrs = req.headers;

    const headers = new Headers();
    if (incomingHeadrs) {
      for (const [key, value] of Object.entries(incomingHeadrs)) {
        if (value) {
          headers.set(key, value.toString());
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
