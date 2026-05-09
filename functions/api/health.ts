export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return Response.json({
    ok: true,
    service: 'space-intel',
    bindings: {
      d1: Boolean(env.DB),
      r2: Boolean(env.R2_ASSETS),
    },
  });
};

type Env = {
  DB: D1Database;
  R2_ASSETS?: R2Bucket;
};
