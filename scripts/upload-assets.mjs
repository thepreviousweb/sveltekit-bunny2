import { readFile, readdir, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { constants } from 'node:fs';

const REGION_HOSTS = {
	de: 'storage.bunnycdn.com',
	frankfurt: 'storage.bunnycdn.com',
	uk: 'uk.storage.bunnycdn.com',
	london: 'uk.storage.bunnycdn.com',
	ny: 'ny.storage.bunnycdn.com',
	la: 'la.storage.bunnycdn.com',
	sg: 'sg.storage.bunnycdn.com',
	se: 'se.storage.bunnycdn.com',
	br: 'br.storage.bunnycdn.com',
	jh: 'jh.storage.bunnycdn.com',
	syd: 'syd.storage.bunnycdn.com'
};

function requireEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) {
		console.error(`Missing required env: ${name}`);
		process.exit(1);
	}
	return value;
}

function resolveHostname(region) {
	const cleaned = region.replace(/^https?:\/\//, '').replace(/\/+$/, '');
	if (cleaned.includes('.')) return cleaned;
	return REGION_HOSTS[cleaned.toLowerCase()] ?? `${cleaned}.storage.bunnycdn.com`;
}

const zone = requireEnv('BUNNY_ASSETS_ZONE');
const key = (process.env.BUNNY_ASSETS_UPLOAD_KEY || process.env.BUNNY_ASSETS_KEY || '').trim();
if (!key) {
	console.error('Missing required env: BUNNY_ASSETS_UPLOAD_KEY (or BUNNY_ASSETS_KEY)');
	process.exit(1);
}

const hostname = resolveHostname(requireEnv('BUNNY_ASSETS_REGION'));
const prefix = (process.env.BUNNY_ASSETS_PREFIX ?? '').trim().replace(/^\/+|\/+$/g, '');
const root = join(process.cwd(), '.svelte-kit/bunny.net/client');

try {
	await access(root, constants.R_OK);
} catch {
	console.error(`Client build folder not found: ${root}`);
	console.error('Run npm run build first.');
	process.exit(1);
}

async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await walk(full)));
		else files.push(full);
	}
	return files;
}

const files = await walk(root);
if (files.length === 0) {
	console.error(`No files found in ${root}`);
	process.exit(1);
}

console.log(`Uploading ${files.length} files`);
console.log(`Host: https://${hostname}`);
console.log(`Zone: ${zone}`);
console.log(`Prefix: ${prefix || '(root)'}`);

let ok = 0;
let fail = 0;

for (const file of files) {
	const rel = relative(root, file).split(/[/\\]/).join('/');
	const remotePath = prefix ? `${prefix}/${rel}` : rel;
	const url = `https://${hostname}/${zone}/${remotePath}`;
	const body = await readFile(file);

	const res = await fetch(url, {
		method: 'PUT',
		headers: {
			AccessKey: key,
			'Content-Type': 'application/octet-stream'
		},
		body
	});

	if (res.status === 201 || res.ok) {
		ok += 1;
		console.log(`OK  ${res.status} ${remotePath}`);
	} else {
		fail += 1;
		const text = await res.text().catch(() => '');
		console.error(`FAIL ${res.status} ${remotePath}`);
		console.error(`URL  ${url}`);
		if (text) console.error(`Body ${text.slice(0, 500)}`);
	}
}

console.log(`Done: ${ok} uploaded, ${fail} failed`);

if (fail > 0) process.exit(1);

// Verify: list the prefix/root in storage
const listUrl = `https://${hostname}/${zone}/${prefix ? `${prefix}/` : ''}`;
const listRes = await fetch(listUrl, {
	headers: { AccessKey: key, Accept: 'application/json' }
});

if (!listRes.ok) {
	console.error(`Upload seemed OK, but listing ${listUrl} failed: ${listRes.status}`);
	process.exit(1);
}

const listing = await listRes.json();
const count = Array.isArray(listing) ? listing.length : 0;
console.log(`Verified storage listing at ${prefix || '/'}: ${count} entries`);
if (count === 0) {
	console.error('Storage listing is empty after upload — check zone name / region hostname.');
	process.exit(1);
}
