import { createGoogleProvider, createMicrosoftEntraIdProvider } from '@light-auth/core';
import { CreateLightAuth } from '@light-auth/sveltekit';
import { env } from '$env/dynamic/private';
import type { MyLightAuthSession, MyLightAuthUser } from '$lib/auth-client';

const googleProvider = createGoogleProvider({
	clientId: env.GOOGLE_CLIENT_ID || '',
	clientSecret: env.GOOGLE_CLIENT_SECRET || '',
	redirectUri: 'http://localhost:5173/api/auth/callback/google',
	accessType: 'offline'
});

const microsoftProvider = createMicrosoftEntraIdProvider({
	tenant: env.MICROSOFT_ENTRA_ID_TENANT_ID || undefined,
	clientId: env.MICROSOFT_ENTRA_ID_CLIENT_ID || '',
	clientSecret: env.MICROSOFT_ENTRA_ID_CLIENT_SECRET || '',
	redirectUri: 'http://localhost:5173/api/auth/callback/microsoft',
	scopes: ['offline_access']
});

export const { providers, handlers, signIn, signOut, getAuthSession, getUser } = CreateLightAuth<MyLightAuthSession, MyLightAuthUser>({
	providers: [googleProvider, microsoftProvider],
	env: env,

	onSessionSaving: async (session, tokens) => {
		const idToken = tokens?.idTokenClaims;
		if (!idToken) return session;

		// optional: Add custom claims to the user
		// This example adds the first and last name from the validated id_token claims
		if ('given_name' in idToken && typeof idToken.given_name === 'string') session.firstName = idToken.given_name;
		if ('family_name' in idToken && typeof idToken.family_name === 'string') session.lastName = idToken.family_name;

		return session;
	},

	onUserSaving: async (user, tokens) => {
		const idToken = tokens?.idTokenClaims;
		if (!idToken) return user;

		// optional: Add custom claims to the user
		// This example adds the first and last name from the validated id_token claims
		if ('iss' in idToken && typeof idToken.iss === 'string') user.iss = idToken.iss;
		if ('email_verified' in idToken && typeof idToken.email_verified === 'boolean') user.email_verified = idToken.email_verified;
		if ('sub' in idToken && typeof idToken.sub === 'string') user.sub = idToken.sub;

		return user;
	}
});
