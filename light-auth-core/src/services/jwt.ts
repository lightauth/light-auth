import { EncryptJWT, errors, jwtDecrypt, type JWTPayload } from "jose";

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
  const jwt = new EncryptJWT(payload).setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" });

  // sessions carry an expiresAt: mirror it in the standard exp claim so that jwtDecrypt rejects expired tokens
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt as string | number | Date).getTime() : NaN;
  if (Number.isFinite(expiresAt)) jwt.setExpirationTime(Math.floor(expiresAt / 1000));

  return await jwt.encrypt(new TextEncoder().encode(secret));
}

export async function decryptJwt(token: string, secret: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtDecrypt(token, new TextEncoder().encode(secret));
    return payload;
  } catch (error) {
    // jose attaches the decrypted payload to claim errors: never let it reach the logs
    if (error instanceof errors.JWTExpired) throw new Error("light-auth: token expired");
    throw error;
  }
}
