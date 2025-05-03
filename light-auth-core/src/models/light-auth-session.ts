export interface LightAuthSession {
  id: string;
  user_id: string | number;
  email: string;
  name: string;
  picture?: string;
  expires_at: Date;
  access_token?: string;
  refresh_token?: string;
  // additional properties depending on the provider
  providerName: string;
  // additional properties
  [key: string]: any;
}
