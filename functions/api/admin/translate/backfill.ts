import { backfillArticleTranslations } from '../../../../src/translation/backfill';
import type { TranslationEnv } from '../../../../src/translation';

type Env = TranslationEnv & {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const expectedToken = env.ADMIN_TOKEN;
  const providedToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!expectedToken || providedToken !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const result = await backfillArticleTranslations(
    env.DB,
    env,
    {
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
    },
    parseLimit(url.searchParams.get('limit')),
  );

  return Response.json(result);
};
