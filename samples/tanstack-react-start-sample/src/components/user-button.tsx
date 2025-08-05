import { getUser, signOut } from "@/lib/auth";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "./ui/dropdown-menu";

import { ClientLogoutButton } from "./client/client-logout-button";
import { Link } from "@tanstack/react-router";
import { MyLightAuthUser } from "@/lib/auth-session-user";
import { createServerFn } from "@tanstack/react-start";

export const actionSignOut = createServerFn().handler(() => signOut(false, "/login"));

export default function UserButton({ user }: { user: MyLightAuthUser | null }) {

  if (!user)
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800">
          Login
        </Link>
      </div>
    );
  return (
    <div className="flex items-center gap-2 ">
      <span className="hidden text-sm sm:inline-flex">{user.email}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user.picture ?? `https://api.dicebear.com/9.x/thumbs/svg?seed=${Math.floor(Math.random() * 100000) + 1}&randomizeIds=true`}
                alt={user.name ?? ""}
              />
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-90" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuItem>
            <form action={actionSignOut.url} method="POST">
              <Button type="submit" className="w-full">
                Logout with POST Action and redirect login
              </Button>
            </form>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ClientLogoutButton />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
