import { EncryptJWT, jwtDecrypt, JWTPayload, jwtVerify, SignJWT } from "jose";


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

export async function encryptJwt(payload: JWTPayload, secret: string): Promise<string> {
  const token = await new EncryptJWT(payload).setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" }).encrypt(new TextEncoder().encode(secret));
  return token;
}

export async function decryptJwt(token: string, secret: string): Promise<JWTPayload> {
  const { payload } = await jwtDecrypt(token, new TextEncoder().encode(secret));
  return payload;
}
