import express, { NextFunction, type Request, type Response } from "express";
import { getAuthSession, getUser, handlers, middleware, signIn, signOut } from "../lib/auth";
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
app.use(express.static(path.join(import.meta.dirname, "..", "public", "js")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// handlers for everything related to light-auth
app.use("/api/auth/", handlers);

// Middleware to set the session and user in res.locals
app.use(middleware);

app.get("/login", async (req: Request, res: Response) => {
  res.render("login");
});

app.post("/login", async (req: Request, res: Response) => {
  const providerName = req.body.providerName;
  await signIn(req, res, providerName, "/");
});

app.get("/logout", async (req: Request, res: Response) => {
  await signOut(req, res, false, "/");
});

// Routes
app.get("/protected", async (_req: Request, res: Response) => {
  res.render("protected", { session: res.locals.session });
});

app.get("/", async (req: Request, res: Response) => {
  const user = await getUser(req, res);
  res.render("index", {
    title: "Express Auth Example",
    session: res.locals.session,
    user,
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
