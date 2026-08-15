import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const message = String(data.get('message') ?? '').trim();

		if (!name || !message) {
			return fail(400, {
				name,
				message,
				error: 'Vul naam en bericht in.'
			});
		}

		return {
			success: true,
			name,
			message
		};
	}
} satisfies Actions;
