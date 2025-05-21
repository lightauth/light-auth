import {
	buildSecret,
	decryptJwt,
	DEFAULT_SESSION_NAME,
	encryptJwt,
	getSessionExpirationMaxAge,
	type LightAuthConfig,
	type LightAuthCookie,
	type LightAuthSession,
	type LightAuthSessionStore,
	type LightAuthUser
} from '@light-auth/core';
import * as cookieParser from 'cookie';
import type { RequestEvent } from '../../routes/api/auth/[...lightauth]/$types';

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const sveltekitLightAuthSessionStore: LightAuthSessionStore = {
	async getSession<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
		config?: LightAuthConfig<Session, User>;
		event?: RequestEvent;
	}): Promise<Session | null> {
		const { config, event } = args;

		if (!config) throw new Error('light-auth: Config is required in getSession of sveltekitLightAuthSessionStore');
		if (!event) throw new Error('light-auth: Request is required in getSession of sveltekitLightAuthSessionStore');

		const sessionCookie = event.cookies.get(DEFAULT_SESSION_NAME);
		if (!sessionCookie) return null;

		try {
			const decryptedSession = await decryptJwt(sessionCookie, buildSecret(config.env));
			return decryptedSession as Session;
		} catch (error) {
			console.error('Failed to decrypt session cookie:', error);
			return null;
		}
	},

	async deleteSession<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
		config?: LightAuthConfig<Session, User>;
		event?: RequestEvent;
	}): Promise<void> {
		const { config, event } = args;
		if (!config) throw new Error('light-auth: Config is required in deleteSession of sveltekitLightAuthSessionStore');
		if (!event) throw new Error('light-auth: Request is required in deleteSession of sveltekitLightAuthSessionStore');

		event.cookies.set(DEFAULT_SESSION_NAME, '', {
			maxAge: 0,
			path: '/'
		});
	},

	async setSession<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
		config: LightAuthConfig<Session, User>;
		session: Session;
		event?: RequestEvent;
	}): Promise<void> {
		const { config, session, event } = args;
		if (!config) throw new Error('light-auth: Config is required in deleteSession of sveltekitLightAuthSessionStore');
		if (!event) throw new Error('light-auth: Request is required in deleteSession of sveltekitLightAuthSessionStore');

		const value = await encryptJwt(session, buildSecret(config.env));

		// Check the size of the cookie value in bytes
		const encoder = new TextEncoder();
		const valueBytes = encoder.encode(value);

		if (valueBytes.length > 4096) throw new Error('light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.');

		// get the cookie expiration time
		const maxAge = getSessionExpirationMaxAge(); // 30 days if no env var is set

		// maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
		event.cookies.set(DEFAULT_SESSION_NAME, value, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
			maxAge: maxAge
		});
	},
	generateSessionId(): string {
		return Math.random().toString(36).slice(2);
	}
};
