import test from "node:test";
import assert from "node:assert/strict";
import { logoutSession } from "../shared/logout.js";
test("offline logout clears credentials even when account cleanup and logout throw", async () => {
  let cleared = 0;
  const client = {
    auth: {
      signOut: async () => {
        throw new Error("Network unavailable");
      },
    },
  };
  const notice = await logoutSession(
    client,
    async () => {
      cleared++;
    },
    async () => {
      throw new Error("Token refresh unavailable");
    },
  );
  assert.equal(cleared, 1);
  assert.match(notice, /locally/);
});
test("logout API errors still clear local session", async () => {
  let cleared = false;
  const notice = await logoutSession(
    { auth: { signOut: async () => ({ error: new Error("Server unavailable") }) } },
    async () => {
      cleared = true;
    },
  );
  assert.equal(cleared, true);
  assert.match(notice, /locally/);
});
test("successful logout unregisters before clearing without a false failure notice", async () => {
  const events = [];
  const notice = await logoutSession(
    {
      auth: {
        signOut: async () => {
          events.push("logout");
          return { error: null };
        },
      },
    },
    async () => {
      events.push("clear");
    },
    async () => {
      events.push("unregister");
    },
  );
  assert.deepEqual(events, ["unregister", "logout", "clear"]);
  assert.equal(notice, "Signed out.");
});
