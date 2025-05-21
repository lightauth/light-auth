import { redirect, type RequestEvent } from '@sveltejs/kit';
import { signIn } from '$lib/auth';
import { LIGHT_AUTH_SECRET_VALUE } from '$env/static/private';
import { env } from '$env/dynamic/private';
// const sec = process.env['LIGHT_AUTH_SECRET_VALUE'];
// console.log('Secret value:', sec);

export const actions = {
	default: async (event) => {
		const data = await event.request.formData();

		const provider = data.get('provider');
		if (typeof provider !== 'string') throw new Error('Invalid provider');

		await signIn(provider, event);
	}
};

export const load = async (event: RequestEvent) => {
	// const sec = LIGHT_AUTH_SECRET_VALUE;
	// console.log('Secret value:', sec);
	// const sec = env.LIGHT_AUTH_SECRET_VALUE;
	// console.log('Secret value:', sec);
};
