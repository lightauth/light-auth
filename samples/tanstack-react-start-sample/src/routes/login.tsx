import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientLoginButton } from "@/components/client/client-login-button";
import { createServerFn } from '@tanstack/react-start';
import { signIn } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import googleSvg from "@/assets/google.svg";

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

export const actionSignIn = createServerFn().handler(() => signIn("google", "/profile"));


function RouteComponent() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex flex-col items-center justify-center p-4 ">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Login Page</h1>
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
                <ClientLoginButton providerName="google" callbackUrl="/profile">
                  Login with Google with Client action
                </ClientLoginButton>
              </div>
              <div className="mt-4 flex flex-col space-y-2">

                <form action={actionSignIn.url} method="POST">
                  <Button type="submit" variant={'outline'} className="w-full">
                    <img src={googleSvg} alt="Google" width={18} height={18} />

                    Login with POST Action and redirect to profile
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-center text-sm text-gray-600 w-full">
              Don&apos;t have an account?{" "}
              {/* <Link to="/auth/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign up
              </Link> */}
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
