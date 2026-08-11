// Runs once when the Next.js server (Node.js runtime) starts.
// On this machine, all outbound network access must go through the corporate
// proxy. Node's built-in fetch (undici) does not read HTTP_PROXY/HTTPS_PROXY
// env vars automatically, so we register a global dispatcher that does.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
}
