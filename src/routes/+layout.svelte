<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import '../app.css';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/about', label: 'About' },
		{ href: '/contact', label: 'Contact' }
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SvelteKit Bunny Demo</title>
</svelte:head>

<header>
	<a class="brand" href="/">SvelteKit Bunny</a>
	{#each links as link}
		<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>
			{link.label}
		</a>
	{/each}
</header>

<main>
	{@render children()}
</main>
