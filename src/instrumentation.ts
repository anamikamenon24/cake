export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabaseInitialized } = await import("./db/init");
    await ensureDatabaseInitialized();
  }
}
