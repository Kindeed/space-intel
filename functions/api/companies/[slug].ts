import { getCompanyBySlug } from '../../../src/db';
import { publicCompanyDetail } from '../_companies';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const company = await getCompanyBySlug(env.DB, slug ?? '');

    if (!company) {
      return publicError('公司档案不存在或已更新。', 404);
    }

    return Response.json(publicCompanyDetail(company));
  } catch (error) {
    logApiError('Failed to load company', error);
    return publicError();
  }
};
