import { EncryptJWT, jwtDecrypt, JWTPayload, jwtVerify, SignJWT } from "jose";
import { ENCRYPT_SECRET_VALUE } from "../constants";

const SECRET = new TextEncoder().encode(ENCRYPT_SECRET_VALUE);

// export async function createJwt(payload: JWTPayload): Promise<JWTPayload> {
//   const token = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30 days").setIssuedAt().sign(SECRET);

//   const jwt = await parseJwt(token);
//   return jwt;
// }

// export async function stringifyJwt(payload: JWTPayload): Promise<string> {
//   const token = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30 days").setIssuedAt().sign(SECRET);

//   return token;
// }

// export async function parseJwt(token: string): Promise<JWTPayload> {
//   const { payload } = await jwtVerify(token, SECRET);
//   return payload;
// }

export async function encryptJwt(payload: JWTPayload) {
  const token = await new EncryptJWT(payload).setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" }).encrypt(SECRET);
  return token;
}

export async function decryptJwt(token: string): Promise<JWTPayload> {
  const { payload } = await jwtDecrypt(token, SECRET);
  return payload;
}
