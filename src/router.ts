import { Router } from 'itty-router';
import { parse } from 'cookie';

const newUser = async (env: Env, username: string, password: string) => {
	await env.DB.prepare('INSERT INTO Users VALUES (?, ?)').bind(username, password).all().catch(console.error);
};

const checkUser = async (env: Env, username: string, password: string) => {
	const { results } = await env.DB.prepare('SELECT username FROM Users WHERE username=? AND password=?').bind(username, password).all();
	if (results.length > 0) return true;
	return false;
};

const userExists = async (env: Env, username: string) => {
	const { results } = await env.DB.prepare('SELECT username FROM Users WHERE username=?').bind(username).all();
	if (results.length > 0) return true;
	return false;
};

const router = Router();

const withAuthenticatedUser = async (request: any, env: Env) => {
	const cookie = parse(request.headers.get('Cookie') || '');
	const { username, password } = JSON.parse(cookie.session);
	if (!(await checkUser(env, username, password))) {
		return new Response('invalid login');
	}
};

const authForm = `<form method="POST" enctype="application/x-www-form-urlencoded">
			<input type="text" name="username">
			<input type="password" name="password">
			<button type="submit">submit</button>
		</form>`;

router.post('/auth/register', async (request, env, _ctx) => {
	const form = await request.formData();
	const username = form.get('username');
	if (!(await userExists(env, username))) {
		const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(form.get('password')));
		let password = Array.from(new Uint8Array(hash))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
		await newUser(env, username, password);
		return new Response('ok', {
			headers: {
				'Set-Cookie': `session=${JSON.stringify({ username, password })}`,
			},
		});
	}
	return new Response('user exists');
});

router.get('/auth/login/cookie', async (request, env, _ctx) => {
	const cookie = parse(request.headers.get('Cookie') || '');
	const { username, password } = JSON.parse(cookie.session);
	if (await checkUser(env, username, password)) {
		return new Response('logged in');
	}
	return new Response('invalid login');
});

router.post('/auth/login', async (request, env, _ctx) => {
	const form = await request.formData();
	const username = form.get('username');
	const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(form.get('password')));
	let password = Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	if (await checkUser(env, username, password)) {
		return new Response('ok', {
			headers: { 'Set-Cookie': `session=${JSON.stringify({ username, password })}` },
		});
	}
	return new Response('invalid login');
});

router.get('/auth/register', async (_request, _env, _ctx) => {
	return new Response(authForm, {
		headers: { 'Content-type': 'text/html' },
	});
});

router.get('/auth/login', async (_request, _env, _ctx) => {
	return new Response(authForm, {
		headers: { 'Content-type': 'text/html' },
	});
});

router.all('*', withAuthenticatedUser).get('/auth/info', async (_request, _env, _ctx) => {
	return new Response('ok');
});

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
