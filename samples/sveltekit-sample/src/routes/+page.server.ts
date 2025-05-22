import { signIn } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async (event) => {
		const data = await event.request.formData();

		const providerName = data.get('providerName');
		const callbackUrl = data.get('callbackUrl');
		if (typeof providerName !== 'string') throw new Error('Invalid provider');
		if (typeof callbackUrl !== 'string') throw new Error('Invalid callback URL');

		const response = new Response(undefined, {
			status: 302,
			headers: new Headers({
				Location: `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=442419569317-a9omu0h6jv5cjise82copskbc6vo3v54.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fapi%2Fauth%2Fcallback%2Fgoogle&state=ENuSW2Xc-pHwxs5pL1bn6Ze9llfx7pZj2wtakdpclqo&code_challenge_method=S256&code_challenge=AChGp4I67HpY18vEJxrHBXj2Le0ylorqeTm7JtLbYIg&scope=openid+profile+email&access_type=offline`
			})
		});
		return response;

		// return redirect(
		// 	302,
		// 	'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=442419569317-a9omu0h6jv5cjise82copskbc6vo3v54.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fapi%2Fauth%2Fcallback%2Fgoogle&state=ENuSW2Xc-pHwxs5pL1bn6Ze9llfx7pZj2wtakdpclqo&code_challenge_method=S256&code_challenge=AChGp4I67HpY18vEJxrHBXj2Le0ylorqeTm7JtLbYIg&scope=openid+profile+email&access_type=offline'
		// );

		// return await signIn(providerName, callbackUrl, event);
	}
} satisfies Actions;
