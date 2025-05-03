import Link from "next/link";

import UserButton from "./user-button";

export default async function Header() {
  return (
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold text-gray-800">
        Auth Test
      </Link>

      <UserButton />
    </div>
  );
}
