/**
 * Postgres throws on a malformed UUID before we even get a chance to return
 * notFound(), which turns garbage URLs (or the literal "{id}" string people
 * sometimes paste from documentation) into uncaught server errors. Validate
 * the shape first so an invalid id is just a 404.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | undefined | null): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}
