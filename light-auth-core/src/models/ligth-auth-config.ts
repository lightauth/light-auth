import { NavigatoreStore } from "../stores/navigatore-store";
import { SessionStore } from "../stores/session-store";
import { LightAuthProvider } from "./light-auth-provider";
import { LightAuthSession } from "./light-auth-session";

export interface LightAuthConfig {
  providers: LightAuthProvider[];
  onSessionSaving?: (session: LightAuthSession) => LightAuthSession | null | Promise<LightAuthSession | null>;
  onSessionSaved?: (session: LightAuthSession) => void | Promise<void>;
  basePath?: string;
  sessionStore?: SessionStore;
  navigatoreStore?: NavigatoreStore;
}
