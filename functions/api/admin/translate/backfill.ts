import { backfillArticleTranslations } from '../../../../src/translation/backfill';
import type { TranslationEnv } from '../../../../src/translation';
import { adminOperationFailureResponse, requireAdminRequest, type AdminEnv } from '../../_admin';
import { parseOptionalPositiveInteger } from '../../_request';

type Env = TranslationEnv & AdminEnv & {
  DB: D1Database;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const result = await backfillArticleTranslations(
      env.DB,
      env,
      {
        fetch: (input, init) => fetch(input, init),
        now: () => new Date(),
      },
      parseOptionalPositiveInteger(url.searchParams.get('limit')),
    );

    return Response.json(result);
  } catch (error) {
    return adminOperationFailureResponse('Failed to backfill article translations', error);
  }
};
