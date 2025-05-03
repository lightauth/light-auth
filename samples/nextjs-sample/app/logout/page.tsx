import { redirect  } from "next/navigation";

export default async function LogoutPage() {
  redirect("/api/auth/logout/google?callbackUrl=/");
}
