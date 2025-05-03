export type BaseResponse = any;
export type BaseRequest = any;

export type Scope = "openid" | "profile" | "email" | (string & {});

export function test() {
  const scopes: Scope[] = ["openid", "profile"];



  scopes.push("email");

  
}
