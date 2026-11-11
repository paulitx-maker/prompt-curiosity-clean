export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const mod: any = await import("@tanstack/react-start/server-entry");
    const handler = mod.default ?? mod;
    return handler.fetch(request, env, ctx);
  },
};