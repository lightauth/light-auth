export interface Cookie {
  /**
   * The name of the cookie
   */
  name: string;
  /**
   * The value of the cookie
   */
  value: string;
  /**
   * The expiration date of the cookie
   */
  expires?: Date;
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
