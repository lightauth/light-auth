import { handlers } from '$lib/server/auth';
import { redirect, type RequestEvent } from '@sveltejs/kit';


const handlersSvelteKit = {
	GET: async (event?: RequestEvent) => {
		try {
			return await handlers.GET(event);
		} catch (error) {
			const redirectError = error as { status: number; location: string };
			if (redirectError && redirectError?.status === 302) redirect(redirectError.status, redirectError.location);
		}
	},
	POST: async (event?: RequestEvent) => {
		try {
			return await handlers.POST(event);
		} catch (error) {
			const redirectError = error as { status: number; location: string };
			if (redirectError && redirectError?.status === 302) redirect(redirectError.status, redirectError.location);
		}
	}
};

export const { GET, POST } = handlersSvelteKit;
