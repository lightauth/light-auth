<script lang="ts">
	import google from '../assets/google.svg';
	import { signIn } from '$lib/auth-client';

	let { data } = $props();

	const handleClick = () => signIn('google', '/');
</script>

<div class="m-2 mx-auto max-w-md rounded-lg p-8 shadow-md">
	{#if data.session}
		<p>You are logged in as {data.session.email}</p>
	{:else}
		<div class="space-y-4">
			<h2 class="mb-6 text-center text-2xl font-bold text-gray-800">Login</h2>
			<p class="mb-6 text-center text-gray-600">Please sign in using one of the following providers:</p>

			<form method="POST">
				<input type="hidden" name="providerName" value="google" />
				<input type="hidden" name="callbackUrl" value="/" />
				<button
					type="submit"
					class="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
				>
					<img src={google} alt="Google logo" class="mr-2 h-4 w-4" />
					Sign in with Google using POST action
				</button>
			</form>

			<button
				onclick={handleClick}
				type="button"
				class="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
			>
				<img src={google} alt="Google logo" class="mr-2 h-4 w-4" />
				Sign in with Google from client-side
			</button>
		</div>
	{/if}
</div>
