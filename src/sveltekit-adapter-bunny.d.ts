declare module 'sveltekit-adapter-bunny' {
	import type { Adapter } from '@sveltejs/kit';

	type AdapterOptions = {
		minify?: boolean;
		externals?: Array<string | RegExp>;
		assets?: {
			prefix?: string;
			region?: string;
			zone?: string;
			token?: string;
		};
	};

	export default function adapter(options?: AdapterOptions): Adapter;
}
