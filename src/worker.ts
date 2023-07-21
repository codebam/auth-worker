import handleProxy from './proxy';
import handleRedirect from './redirect';
import router from './router';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		switch (url.pathname) {
			case '/redirect':
				return handleRedirect.fetch(request, env, ctx);

			case '/proxy':
				return handleProxy.fetch(request, env, ctx);
		}

		if (url.pathname.startsWith('/auth')) {
			return router.handle(request, env, ctx);
		}

		return new Response();
	},
};
