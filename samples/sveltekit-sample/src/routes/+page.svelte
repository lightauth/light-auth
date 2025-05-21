<script lang="ts">
	import google from '../assets/google.svg';
	import { signIn } from '$lib/auth-client';

	const handleClick = () => {
		signIn('google', '/profile');
	};
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<form method="POST">
	<input type="hidden" name="providerName" value="google" />
	<input type="hidden" name="callbackUrl" value="/" />
	<button
		type="submit"
		class="w-120 flex items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
	>
		<img src={google} alt="Google logo" class="mr-2 h-4 w-4" />
		Sign in with Google using POST action
	</button>
</form>

<button
	on:click={handleClick}
	type="button"
	class="w-120 flex items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
>
	<img src={google} alt="Google logo" class="mr-2 h-4 w-4" />
	Sign in with Google from client-side
</button>
