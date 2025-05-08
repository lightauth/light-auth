import { generateState, generateCodeVerifier, OAuth2Tokens, decodeIdToken } from "arctic";

import { LightAuthProvider } from "../models/light-auth-provider";
import { LightAuthUser, LightAuthSession } from "../models/light-auth-session";
import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseRequest, BaseResponse } from "../models/light-auth-base";
import { DEFAULT_SESSION_COOKIE_NAME, DEFAULT_SESSION_EXPIRATION } from "../constants";
import { decryptJwt, encryptJwt } from "./jwt";
import { buildFullUrl, buildSecret, getSessionExpirationMaxAge } from "./utils";


