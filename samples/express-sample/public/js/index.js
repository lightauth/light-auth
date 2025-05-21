import { CreateLightAuthClient } from '@light-auth/express/client';

const { getSession, getUser, signIn, signOut } = CreateLightAuthClient({
    basePath: "/api/auth",
});
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

export { getSession, getUser, signIn, signOut };
//# sourceMappingURL=index.js.map
