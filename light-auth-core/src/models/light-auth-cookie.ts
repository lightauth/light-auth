/**
 * LightAuthCookie is an interface that represents a cookie used in the LightAuth library.
 * It includes properties for the cookie's name, value, max age, path, domain,
 * whether the cookie is secure, HttpOnly, and the SameSite attribute.
 */
export interface LightAuthCookie {
  /**
   * The name of the cookie
   */
  name: string;
  /**   * The value of the cookie
   */
  value: string;
  /**
   * The expiration date of the cookie
   * Intentionally commented out to avoid confusion with maxAge
   * and to prevent the use of both properties at the same time.
   * If you need to set an expiration date, use maxAge instead.
   */
  // expires?: Date;
  /**
   * The path of the cookie
   */
  path?: string;
  /**
   * The domain of the cookie
   */
  domain?: string;
  /**
   * Whether the cookie is secure
   */
  secure?: boolean;
  /**
   * Whether the cookie is HttpOnly
   */
  httpOnly?: boolean;
  /**
   * The SameSite attribute of the cookie
   */
  sameSite?: "lax" | "strict" | "none";
  /**
   * The max age of the cookie
   */
  maxAge?: number;

  /**
   * Additional properties for the cookie
   * This can include properties like `partitioned`, `priority`, etc.
   * These properties are not part of the standard cookie specification
   * but are used by some libraries or frameworks.
   * For example, `partitioned` is used in the Partitioned Cookies proposal.
   * See: https://wicg.github.io/cookie-store/#dictdef-cookielistitem
   */
  [key: string]: unknown;
}
