import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { signIn } from "@/lib/auth";
import { ClientLoginButton } from "@/components/client/client-login-button";
import googleSvg from "@/public/google.svg";
import Image from "next/image";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex flex-col items-center justify-center p-4 ">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Invoice Manager</h1>
          <p className="text-gray-600">Login to your account</p>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <div className="mt-4 flex flex-col space-y-2">
                <form
                  action={async () => {
                    "use server";
                    await signIn("google", "/profile");
                  }}
                >
                  <Button type="submit" variant="outline" className="w-full">
                    <Image src={googleSvg} alt="Google" width={18} height={18} />
                    Login with Google with POST action
                  </Button>
                </form>

                <Link href="/api/auth/login/google?callbackUrl=/profile" className={buttonVariants({ variant: "outline" })}>
                  <Image src={googleSvg} alt="Google" width={18} height={18} />
                  Login with Google direct link
                </Link>

                <ClientLoginButton />

                <form
                  action={async () => {
                    "use server";
                    await signIn("microsoft", "/profile");
                  }}
                >
                  <Button type="submit" variant="outline" className="w-full">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23">
                      <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                    Microsoft
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-center text-sm text-gray-600 w-full">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
