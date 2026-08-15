// Use Deno's npm import syntax for external packages
import * as BunnySDK from 'npm:@bunny.net/edgescript-sdk';
import * as BunnyStorageSDK from 'npm:@bunny.net/storage-sdk';
import process from 'node:process';
import { Server } from './index.js';
import { manifest } from './manifest.js';

const REGION_FROM_HOST = {
	'storage.bunnycdn.com': 'de',
	'de.storage.bunnycdn.com': 'de',
	'uk.storage.bunnycdn.com': 'uk',
	'ny.storage.bunnycdn.com': 'ny',
	'la.storage.bunnycdn.com': 'la',
	'sg.storage.bunnycdn.com': 'sg',
	'se.storage.bunnycdn.com': 'se',
	'br.storage.bunnycdn.com': 'br',
	'jh.storage.bunnycdn.com': 'jh',
	'syd.storage.bunnycdn.com': 'syd'
};

const MIME = {
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon'
};

function resolveRegion(value) {
	if (!value) return 'de';
	const cleaned = String(value).trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
	if (REGION_FROM_HOST[cleaned]) return REGION_FROM_HOST[cleaned];
	if (cleaned.includes('.')) {
		const match = cleaned.match(/^([a-z]+)\.storage\.bunnycdn\.com$/i);
		if (match) return match[1].toLowerCase();
	}
	return cleaned.toLowerCase();
}

function storagePath(prefix, file) {
	const p = String(prefix ?? '')
		.trim()
		.replace(/^\/+|\/+$/g, '');
	const f = String(file).replace(/^\/+/, '');
	return p ? `/${p}/${f}` : `/${f}`;
}

function contentType(file) {
	const dot = file.lastIndexOf('.');
	if (dot === -1) return 'application/octet-stream';
	return MIME[file.slice(dot).toLowerCase()] ?? 'application/octet-stream';
}

function isAssetPath(pathname) {
	return (
		pathname.startsWith('/_app/') ||
		pathname === '/robots.txt' ||
		pathname === '/favicon.png' ||
		pathname === '/favicon.ico' ||
		pathname.startsWith('/favicon.')
	);
}

const server = new Server(manifest);

const prefix = process.env.BUNNY_ASSETS_PREFIX;
const region = resolveRegion(process.env.BUNNY_ASSETS_REGION);
const zone = process.env.BUNNY_ASSETS_ZONE;
const key = process.env.BUNNY_ASSETS_KEY;

const storage = BunnyStorageSDK.zone.connect_with_accesskey(region, zone, key);

async function readFromStorage(file) {
	try {
		const downloaded = await BunnyStorageSDK.file.download(
			storage,
			storagePath(prefix, file)
		);
		return downloaded.stream;
	} catch (error) {
		console.error('[assets] read failed', file, error);
		return null;
	}
}

const initPromise = server.init({
	env: {},
	read: readFromStorage
});

export default BunnySDK.net.http.serve(async (req) => {
	try {
		await initPromise;

		const url = new URL(req.url);
		if (isAssetPath(url.pathname)) {
			const file = url.pathname.replace(/^\/+/, '');
			const stream = await readFromStorage(file);
			if (!stream) {
				return new Response('Not found', { status: 404 });
			}

			const immutable = file.includes('/immutable/');
			return new Response(stream, {
				headers: {
					'content-type': contentType(file),
					'cache-control': immutable
						? 'public,max-age=31536000,immutable'
						: 'public,max-age=0,must-revalidate'
				}
			});
		}

		return await server.respond(req);
	} catch (error) {
		console.error('Server error:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
});
