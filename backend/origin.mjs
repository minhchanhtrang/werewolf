export function allowedOrigin(request) {
  const configured = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
  const expected = configured ? new URL(configured).origin : `http://${request.headers.host}`;
  return request.headers.origin === expected;
}
