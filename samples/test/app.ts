export type Scope = "openid" | "profile" | "email" | (string & {});
import { resolve, join } from "node:path";

async function main() {

  const base = "./drivers/"

  const resolved = resolve(".", base);
  console.log("Resolved path:", resolved);

}
main();
