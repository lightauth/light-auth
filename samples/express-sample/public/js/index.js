(function () {
    'use strict';

    /*! @light-auth/core v0.2.6 2025-06-04 */

    const DEFAULT_BASE_PATH = "/api/auth";

    /** Resolves the basePath, defaults to "/api/default" if not provided or falsy */
    function resolveBasePath(basePath, env) {
      let resolvedBasePath = basePath || env?.["LIGHT_AUTH_BASE_PATH"] || DEFAULT_BASE_PATH;
      if (!resolvedBasePath.startsWith("/")) resolvedBasePath = `/${resolvedBasePath}`;
      // Ensure the base path does not end with "/"
      if (resolvedBasePath.endsWith("/")) resolvedBasePath = resolvedBasePath.slice(0, -1);
      // Ensure the base path does not contain double slashes
      if (resolvedBasePath.includes("//")) resolvedBasePath = resolvedBasePath.replace(/\/\//g, "/");
      return resolvedBasePath;
    }

    /**
     * this function is used to make a request to the light auth server
     * it can be done from the server side or the client side
     *
     * it will use the router to get the url and the headers (if server side)
     */
    async function internalFetch(args) {
      const {
        config,
        body,
        method = "GET",
        headers
      } = args;
      const {
        router
      } = config;
      const env = config.env;
      const basePath = resolveBasePath(config.basePath, env);
      // check if we are on the server side or client side
      // if we are on the server side, we need to use the router to get the url and headers
      // if we are on the client side, we can use the window object to get the url and headers
      const isServerSide = typeof window === "undefined";
      const bodyBytes = body ? new TextEncoder().encode(body.toString()) : undefined;
      // get all the headers from the request
      let requestHeaders = headers ?? null;
      if (router && isServerSide) requestHeaders = await router.getHeaders({
        env,
        basePath,
        ...args
      });
      // get the full url from the router if available
      let url = args.endpoint;
      if (router && isServerSide) url = await router.getUrl({
        env,
        basePath,
        ...args
      });
      const request = bodyBytes ? new Request(url.toString(), {
        method: method,
        headers: requestHeaders ?? new Headers(),
        body: bodyBytes
      }) : new Request(url.toString(), {
        method: method,
        headers: requestHeaders ?? new Headers()
      });
      let response = null;
      try {
        response = await fetch(request);
      } catch (error) {
        console.error("Error:", error);
        throw new Error(`light-auth: Request failed with error ${error}`);
      }
      if (!response || !response.ok) {
        throw new Error(`light-auth: Request failed with status ${response?.status}`);
      }
      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
        const formResponse = await response.text();
        const formData = new URLSearchParams(formResponse);
        const result = {};
        for (const [key, value] of formData.entries()) {
          result[key] = value;
        }
        return result;
      }
      if (contentType && (contentType.includes("application/json") || contentType.includes("text/plain"))) {
        const jsonResponse = await response.json();
        return jsonResponse;
      }
      if (contentType && contentType.includes("application/octet-stream")) {
        const blobResponse = await response.blob();
        return blobResponse;
      }
      return null;
    }
    async function getCsrfToken(args) {
      const isServerSide = typeof window === "undefined";
      if (isServerSide) return;
      const {
        config
      } = args;
      // Get a csrf token from the server
      const endpoint = `${config.basePath}/csrf`;
      const csrfToken = await internalFetch({
        endpoint,
        method: "POST",
        ...args
      });
      if (!csrfToken) throw new Error("light-auth: Failed to get csrf token");
      // Check if the csrf token cookie, called light_auth_csrf_token exist
      const csrfTokenCookie = document.cookie.split("; ").find(row => row.startsWith("light_auth_csrf_token="));
      if (csrfTokenCookie) window.document.cookie = `light_auth_csrf_token=; path=/; max-age=0;`;
      // Set the csrf token in the cookie store
      window.document.cookie = `light_auth_csrf_token=${csrfToken.csrfTokenHash}.${csrfToken.csrfToken}; path=/; secure=true}`;
    }
    function createSigninClientFunction(config) {
      return async (args = {}) => {
        const {
          providerName,
          callbackUrl = "/"
        } = args;
        // check if we are on the server side or client side
        const isServerSide = typeof window === "undefined";
        if (isServerSide) throw new Error("light-auth-client: signin function should not be called on the server side");
        // Get a csrf token from the server and set it in the cookie store
        await getCsrfToken({
          config,
          ...args
        });
        window.location.href = `${config.basePath}/login/${providerName}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      };
    }
    function createSignoutClientFunction(config) {
      return async (args = {}) => {
        const {
          revokeToken = true,
          callbackUrl = "/"
        } = args;
        const isServerSide = typeof window === "undefined";
        if (isServerSide) throw new Error("light-auth-client: signout function should not be called on the server side");
        // Get a csrf token from the server and set it in the cookie store
        await getCsrfToken({
          config,
          ...args
        });
        window.location.href = `${config.basePath}/logout?revokeToken=${revokeToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
      };
    }
    function createFetchSessionClientFunction(config) {
      return async args => {
        try {
          const isServerSide = typeof window === "undefined";
          if (isServerSide) throw new Error("light-auth-client: fetchSession function should not be called on the server side");
          // get the session from the server using the api endpoint
          const session = await internalFetch({
            config,
            method: "POST",
            endpoint: `${config.basePath}/session`,
            ...args
          });
          return session ?? null;
        } catch (error) {
          console.error("Error:", error);
          return null;
        }
      };
    }
    function createSetSessionClientFunction(config) {
      return async (session, args) => {
        try {
          const isServerSide = typeof window === "undefined";
          if (isServerSide) throw new Error("light-auth-client: setSession function should not be called on the server side");
          // get the session from the server using the api endpoint
          const updatedSession = await internalFetch({
            config,
            method: "POST",
            body: JSON.stringify(session),
            endpoint: `${config.basePath}/set_session`,
            ...args
          });
          return updatedSession ?? null;
        } catch (error) {
          console.error("Error:", error);
          return null;
        }
      };
    }
    function createFetchUserClientFunction(config) {
      return async args => {
        try {
          const isServerSide = typeof window === "undefined";
          if (isServerSide) throw new Error("light-auth-client: getUser function should not be called on the server side");
          const endpoint = args?.userId ? `${config.basePath}/user/${args.userId}` : `${config.basePath}/user`;
          // get the user from the user adapter
          const user = await internalFetch({
            config,
            method: "POST",
            endpoint,
            ...args
          });
          if (!user) return null;
          return user;
        } catch (error) {
          console.error("light-auth: Error in createLightAuthUserFunction:", error);
          return null;
        }
      };
    }
    function createSetUserClientFunction(config) {
      return async (user, args) => {
        try {
          const isServerSide = typeof window === "undefined";
          if (isServerSide) throw new Error("light-auth-client: setUser function should not be called on the server side");
          const updatedUser = await internalFetch({
            config,
            method: "POST",
            body: JSON.stringify(user),
            endpoint: `${config.basePath}/set_user`,
            ...args
          });
          return updatedUser ?? null;
        } catch (error) {
          console.error("Error:", error);
          return null;
        }
      };
    }

    /*! @light-auth/express v0.2.6 2025-06-04 */
    const createGetAuthSession = config => {
      const getSession = createFetchSessionClientFunction(config);
      return async () => await getSession();
    };
    const createSetAuthSession = config => {
      const setSession = createSetSessionClientFunction(config);
      return async session => await setSession(session, config);
    };
    const createGetUser = config => {
      const getUser = createFetchUserClientFunction(config);
      return async () => await getUser();
    };
    const createSetUser = config => {
      const setUser = createSetUserClientFunction(config);
      return async user => await setUser(user, config);
    };
    function createSignin(config) {
      const signInFunction = createSigninClientFunction(config);
      return async (providerName, callbackUrl = "/") => await signInFunction({
        providerName,
        callbackUrl
      });
    }
    function createSignout(config) {
      const signOutFunction = createSignoutClientFunction(config);
      return async (revokeToken = false, callbackUrl = "/") => await signOutFunction({
        revokeToken,
        callbackUrl
      });
    }
    function CreateLightAuthClient(config = {}) {
      // @ts-ignore
      config.env = config.env || ({ url: (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT' && document.currentScript.src || new URL('index.js', document.baseURI).href) });
      config.basePath = resolveBasePath(config.basePath, config.env);
      return {
        basePath: config.basePath,
        getAuthSession: createGetAuthSession(config),
        setAuthSession: createSetAuthSession(config),
        getUser: createGetUser(config),
        setUser: createSetUser(config),
        signIn: createSignin(config),
        signOut: createSignout(config)
      };
    }

    const { getAuthSession, getUser, signIn, signOut } = CreateLightAuthClient({
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
        const btnRefreshSession = document.getElementById("btnRefreshSession");
        if (btnRefreshSession) {
            btnRefreshSession.addEventListener("click", async (event) => {
                event.preventDefault();
                const session = await getAuthSession();
                console.log("Session refreshed:", session);
            });
        }
    });

})();
//# sourceMappingURL=index.js.map
