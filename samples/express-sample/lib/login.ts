import { signIn, getAuthSession } from "./auth-client";

document.addEventListener("DOMContentLoaded", function () {
  const btnLogin = document.getElementById("btnLogin");
  if (btnLogin) {
    btnLogin.addEventListener("click", function (event) {
      event.preventDefault();
      console.log("btnLogin clicked");
      signIn("google");
    });
  }

  const btnRefreshSession = document.getElementById("btnRefreshSession");
  if (btnRefreshSession) {
    btnRefreshSession.addEventListener("click", async (event) => {
      event.preventDefault();
      const session = await getAuthSession();
      console.log("Session refreshed:", session);
    });
  }
});
