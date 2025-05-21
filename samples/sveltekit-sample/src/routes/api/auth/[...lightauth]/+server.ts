import { json, type RequestEvent } from '@sveltejs/kit';
import { handlers } from '$lib/auth';
// const handler = async (event: RequestEvent) => {
// 	// ... endpoint logic
// 	console.log('Auth endpoint hit', event);
// 	return json({
// 		message: 'Hello from the auth endpoint !!!!!'
// 	});
// };
// const allHandlers = { GET: handler, POST: handler };
export const { GET, POST } = handlers;
