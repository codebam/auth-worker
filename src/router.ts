import { Router } from 'itty-router';

const newUser = async (env: Env, username: string, password: string) => {
	await env.DB.prepare('INSERT INTO Users VALUES (?, ?)').bind(username, password).all().catch(console.error);
};

const checkUser = async (env: Env, username: string, password: string) => {
	const { results } = await env.DB.prepare('SELECT * FROM Users WHERE username=? AND password=?').bind(username, password).all();
	if (results.length > 0) return true;
	return false;
};

const router = Router();

router.post('/auth/register', async (request, env, _ctx) => {
	const content = await request.json();
	const username = content.username;
	const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(content.password));
	await newUser(
		env,
		username,
		Array.from(new Uint8Array(hash))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
	);
});

router.post('/auth/login', async (request, _env, _ctx) => {
	const content = await request.json();
	const username = content.username;
	const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(content.password));
	let password = Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return new Response('ok', {
		headers: { 'Set-Cookie': `username=${username}; password=${password}` },
	});
});

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
