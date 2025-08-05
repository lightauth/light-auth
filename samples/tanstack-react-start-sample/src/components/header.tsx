
import { Link } from "@tanstack/react-router";
import UserButton from "./user-button";
import { MyLightAuthUser } from "@/lib/auth-session-user";

export default function Header({ user }: { user: MyLightAuthUser | null }) {

  return (
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-gray-800">
        Auth Test
      </Link>

      <UserButton user={user} />
    </div>
  );
}
