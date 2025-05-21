import { redirect, type Redirect, type RequestEvent } from '@sveltejs/kit';
import { signIn } from '$lib/server/auth';

export const actions = {
	default: async (event) => {
		const data = await event.request.formData();

		const providerName = data.get('providerName');
		const callbackUrl = data.get('callbackUrl');
		if (typeof providerName !== 'string') throw new Error('Invalid provider');
		if (typeof callbackUrl !== 'string') throw new Error('Invalid callback URL');

		signIn(providerName, callbackUrl, event);
	}
};

export const load = async (event: RequestEvent) => {
	// const sec = LIGHT_AUTH_SECRET_VALUE;
	// console.log('Secret value:', sec);
	// const sec = env.LIGHT_AUTH_SECRET_VALUE;
	// console.log('Secret value:', sec);
};
