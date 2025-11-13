import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";
import { ClientLoginButton } from "@/components/client/client-login-button";
import googleSvg from "@/public/google.svg";
import Image from "next/image";
import { ClientLoginActionButton } from "@/components/client/client-login-action-button";
import { CredentialsLoginForm } from "@/components/credentials-login-form";
import { CredentialsRegisterForm } from "@/components/credentials-register-form";

export default function LoginPage() {
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
            <CardDescription>Choose your preferred login method</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="credentials" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="oauth">OAuth</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="credentials" className="space-y-4">
                <CredentialsLoginForm />
              </TabsContent>

              <TabsContent value="oauth" className="space-y-2">
                <form
                  action={async () => {
                    "use server";
                    await signIn("google", "/profile");
                  }}
                >
                  <Button type="submit" variant="outline" className="w-full">
                    <Image src={googleSvg} alt="Google" width={18} height={18} />
                    Login with Google
                  </Button>
                </form>

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

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">Alternative OAuth login methods:</p>
                  <ClientLoginActionButton providerName="google" callbackUrl="/profile">
                    Google (POST endpoint)
                  </ClientLoginActionButton>
                  <ClientLoginButton providerName="google" callbackUrl="/profile">
                    Google (Client action)
                  </ClientLoginButton>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <CredentialsRegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <p className="text-center text-sm text-gray-600 w-full">
              Protected by Light Auth with credentials and OAuth
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
