import { getCompanyBySlug } from '../../../src/db';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const company = await getCompanyBySlug(env.DB, slug ?? '');

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    return Response.json(company);
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to load company',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
