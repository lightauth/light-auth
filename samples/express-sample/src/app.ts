import express, { type Request, type Response } from "express";
import { handlers, signIn } from "./auth";
import * as path from "node:path";

// import {
//   errorHandler,
//   errorNotFoundHandler,
// } from "./middleware/error.middleware.js"
// import {
//   authenticatedUser,
//   currentSession,
// } from "./middleware/auth.middleware.js"

import * as pug from "pug";

export const app = express();

app.set("port", process.env.PORT || 3000);

// app.engine("pug", pug.__express);
app.set("views", path.join(import.meta.dirname, "..", "views"));
app.set("view engine", "pug");

// Trust Proxy for Proxies (Heroku, Render.com, Docker behind Nginx, etc)
// https://stackoverflow.com/questions/40459511/in-express-js-req-protocol-is-not-picking-up-https-for-my-secure-link-it-alwa
app.set("trust proxy", true);

app.use(express.static(path.join(import.meta.dirname, "..", "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/auth/", async (req, res, next) => {
  await handlers(req, res);
  if (!res.headersSent) {
    next();
  }
});

app.post("/login", async (req: Request, res: Response) => {
  const providerName = req.body.providerName;
  console.log("Login with provider:", providerName);
  await signIn({ req, res, providerName });
});

// Routes
app.get("/protected", async (_req: Request, res: Response) => {
  res.render("protected", { session: res.locals.session });
});

// app.get(
//   "/api/protected",
//   authenticatedUser,
//   async (_req: Request, res: Response) => {
//     res.json(res.locals.session)
//   },
// )

app.get("/", async (_req: Request, res: Response) => {
  res.render("index", {
    title: "Express Auth Example",
    user: res.locals.session?.user,
  });
});

app.get("/login", async (_req: Request, res: Response) => {
  res.render("login", {
    title: "Express Auth Example",
    user: res.locals.session?.user,
  });
});

const port = app.get("port");

const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
  console.log(`Server running on http://localhost:${port}`);
});

// Error handlers
// app.use(errorNotFoundHandler)
// app.use(errorHandler)
