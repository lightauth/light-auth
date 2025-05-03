import { ArticProvider } from "./artic-provider";

export interface LightAuthProvider {
  providerName: string;
  artic: ArticProvider;
  scopes?: string[];
  searchParams?: Map<string, string>;
  headers?: Map<string, string>;
}
