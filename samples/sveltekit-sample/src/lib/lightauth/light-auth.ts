import {
	DEFAULT_BASE_PATH,
	type LightAuthConfig,
	createHttpHandlerFunction,
	createFetchSessionFunction,
	createFetchUserFunction,
	createSigninFunction,
	createSignoutFunction,
	type LightAuthSession,
	type LightAuthUser,
	resolveBasePath
} from '@light-auth/core';
import type { RequestEvent } from '@sveltejs/kit';

export const createSvelteKitLightAuthSessionFunction = <
	Session extends LightAuthSession = LightAuthSession,
	User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
	config: LightAuthConfig<Session, User>
) => {
	const sessionFunction = createFetchSessionFunction(config);
	return async (event?: RequestEvent) => {
		return await sessionFunction({ event });
	};
};

export const createSvelteKitLightAuthUserFunction = <
	Session extends LightAuthSession = LightAuthSession,
	User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
	config: LightAuthConfig<Session, User>
) => {
	const userFunction = createFetchUserFunction(config);
	return async (event?: RequestEvent) => {
		return await userFunction({ event });
	};
};

export function createSvelteKitSigninFunction<
	Session extends LightAuthSession = LightAuthSession,
	User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>) {
	const signInFunction = createSigninFunction(config);
	return async (providerName: string, event?: RequestEvent) => {
		return await signInFunction({ providerName, event });
	};
}

export function createSvelteKitSignoutFunction<
	Session extends LightAuthSession = LightAuthSession,
	User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>) {
	const signOutFunction = createSignoutFunction(config);
	return async (event?: RequestEvent) => {
		return await signOutFunction({ event });
	};
}

export const createSvelteKitLightAuthHandlerFunction = <
	Session extends LightAuthSession = LightAuthSession,
	User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
	config: LightAuthConfig<Session, User>
) => {
	const lightAuthHandler = createHttpHandlerFunction(config);

	return {
		GET: async (event?: RequestEvent) => {
			const response = await lightAuthHandler({ event });
			return response;
		},
		POST: async (event?: RequestEvent) => {
			const response = await lightAuthHandler({ event });
			return response;
		}
	};
};

export function CreateLightAuth<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
	config: LightAuthConfig<Session, User>
) {
	if (!config.providers || config.providers.length === 0) throw new Error('At least one provider is required');

	// dynamic imports to avoid error if we are on the client side
	if (!config.userAdapter && typeof window === 'undefined') {
		import('@light-auth/core/adapters').then((module) => {
			config.userAdapter = module.createLightAuthUserAdapter({ base: './users_db', isEncrypted: false });
		});
	}

	if (!config.sessionStore && typeof window === 'undefined') {
		import('./sveltekit-light-auth-session-store').then((module) => {
			config.sessionStore = module.sveltekitLightAuthSessionStore;
		});
	}
	if (!config.router && typeof window === 'undefined') {
		import('./sveltekit-light-auth-router').then((module) => {
			config.router = module.sveltekitLightAuthRouter;
		});
	}

	config.env = config.env || import.meta.env;
	config.basePath = resolveBasePath(config);

	return {
		providers: config.providers,
		handlers: createSvelteKitLightAuthHandlerFunction(config),
		basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
		getSession: createSvelteKitLightAuthSessionFunction(config),
		getUser: createSvelteKitLightAuthUserFunction(config),
		signIn: createSvelteKitSigninFunction(config),
		signOut: createSvelteKitSignoutFunction(config)
	};
}
