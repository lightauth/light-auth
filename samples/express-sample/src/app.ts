import express, { NextFunction, type Request, type Response } from "express";
import { getSession, getUser, handlers, signIn, signOut } from "./auth";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config();

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

// handlers for everything related to light-auth
app.use("/api/auth/", async (req, res, next) => await handlers(req, res, next));

// Middleware to set the session and user in res.locals
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const session = await getSession(req, res);
  res.locals.session = session;
  const user = await getUser(req, res);
  res.locals.user = user;

  console.log(process.env.NODE_ENV);
  // Set the session and user in the response locals
  return next();
});

app.get("/login", async (req: Request, res: Response) => {
  res.render("login");
});

app.post("/login", async (req: Request, res: Response) => {
  const providerName = req.body.providerName;
  await signIn(req, res, providerName);
});

app.get("/logout", async (req: Request, res: Response) => {
  await signOut(req, res);
  res.redirect("/");
});

// Routes
app.get("/protected", async (_req: Request, res: Response) => {
  res.render("protected", { session: res.locals.session });
});

app.get("/", async (_req: Request, res: Response) => {
  console.log("Session:", res.locals.session);
  console.log("user:", res.locals.user);
  res.render("index", {
    title: "Express Auth Example",
    session: res.locals.session,
    user: res.locals.user,
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
