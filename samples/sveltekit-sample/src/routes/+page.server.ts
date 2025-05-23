import { signIn, getSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const load = async (event) => {
	const session = await getSession(event);
	return { session };
};

export const actions = {
	default: async (event) => {
		try {
			const data = await event.request.formData();

			const providerName = data.get('providerName');
			const callbackUrl = data.get('callbackUrl');
			if (typeof providerName !== 'string') throw new Error('Invalid provider');
			if (typeof callbackUrl !== 'string') throw new Error('Invalid callback URL');

			await signIn(providerName, callbackUrl, event);
		} catch (error) {
			const r = error as { status: number; location: string };
			if (r?.status === 302) redirect(r.status, r.location);
		}
	}
} satisfies Actions;
