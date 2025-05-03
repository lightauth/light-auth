import { Cookie, defaultNavigatorStore, NavigatoreStore } from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";

/**
 * Encodes an object as url-encoded string.
 */
const encodeUrlEncoded = (object: Record<string, any> = {}) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(object)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.append(key, value);
    }
  }

  return params.toString();
};

/**
 * Encodes an object as JSON
 */
const encodeJson = (obj: Record<string, any>) => {
  return JSON.stringify(obj);
};

/**
 * Encodes an Express Request body based on the content type header.
 */
const encodeRequestBody = (req: ExpressRequest) => {
  const contentType = req.headers["content-type"];

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return encodeUrlEncoded(req.body);
  }

  if (contentType?.includes("application/json")) {
    return encodeJson(req.body);
  }

  return req.body;
};

const toWebRequest = async (req: ExpressRequest) => {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;

  const headers = new Headers();

  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => v && headers.append(key, v));
      return;
    }

    if (value) {
      headers.append(key, value);
    }
  });

  // GET and HEAD not allowed to receive body
  const body = /GET|HEAD/.test(req.method) ? undefined : encodeRequestBody(req);

  const request = new Request(url, {
    method: req.method,
    headers,
    body,
  });

  return request;
};

const toExpressResponse = async function (response: Response, res: ExpressResponse) {
  response.headers.forEach((value, key) => {
    if (value) {
      res.append(key, value);
    }
  });

  // Explicitly write the headers for content-type
  // https://stackoverflow.com/a/59449326/13944042
  res.writeHead(response.status, response.statusText, {
    "Content-Type": response.headers.get("content-type") || "",
  });

  res.write(await response.text());
  res.end();
};

// export const expressNavigatoreStore: NavigatoreStore = {
//   ...defaultNavigatorStore,
//   createEngineResponseFromRespoçnse: async (res) => {
//     const request = await toExpressResponse(res);
//     const response = await defaultNavigatorStore.createEngineResponseFromResponse(request, res);

//     // Convert the response to Express response
//     await toExpressResponse(response, res);

//     return response;
//   },
// };
