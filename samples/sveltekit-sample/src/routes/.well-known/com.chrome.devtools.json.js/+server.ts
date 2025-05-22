// src/routes/.well-known/appspecific/com.chrome.devtools.json.js
export async function get() {
	return {
		status: 200,
		body: { message: 'File found' }
	};
}
