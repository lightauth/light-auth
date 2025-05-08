import { BaseResponse } from "./light-auth-base";

export interface LightAuthRouter {
  redirectTo: (args: { url: string; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: (args: { search?: string | RegExp; [key: string]: unknown }) => Headers | Promise<Headers>;
  setHeaders: (args: { headers: Map<string, string>; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getUrl: (args: { endpoint?: string; [key: string]: unknown }) => string | Promise<string>;
  writeJson: (args: { data: {} | null; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
}
