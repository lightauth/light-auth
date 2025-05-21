import { signIn } from "./auth-client";

document.addEventListener("DOMContentLoaded", function () {
  const btnLogin = document.getElementById("btnLogin");
  if (btnLogin) {
    btnLogin.addEventListener("click", function (event) {
      event.preventDefault();
      console.log("btnLogin clicked");
      signIn("google");
    });
  }
});
