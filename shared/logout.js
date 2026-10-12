// Local credentials must be cleared even if refresh, registration deletion or server logout fails.
export async function logoutSession(client, clearLocal, unregister = async () => {}) {
  let incomplete = false;
  try {
    await unregister();
  } catch {
    incomplete = true;
  }
  try {
    const { error } = await client.auth.signOut({ scope: "local" });
    incomplete ||= Boolean(error);
  } catch {
    incomplete = true;
  } finally {
    await clearLocal();
  }
  return incomplete
    ? "Signed out locally. The server could not complete every cleanup request."
    : "Signed out.";
}
