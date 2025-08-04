// src/routes/index.tsx
import * as fs from 'node:fs'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getAuthSession as laGetAuthSession, getUser as laGetUser } from "@/lib/auth";
import { ClientFetchSessionButton } from '@/components/client-fetch-session-button';
// import { Button } from '@/components/ui/button';


const getAuthSession = createServerFn({
    method: 'GET',
}).handler(() => {
    return laGetAuthSession()
})
const getUser = createServerFn({
    method: 'GET',
}).handler(async () => {
    const session = await laGetAuthSession();
    return laGetUser(session?.providerUserId.toString());
});


export const Route = createFileRoute('/')({
    component: Home,
    loader: async () => {
        const session = await getAuthSession();
        const user = await getUser();
        return { session, user };
    },
})

function Home() {
    const router = useRouter()
    const state = Route.useLoaderData()
    const session = state.session;
    const user = state.user;

    // Check if user is logged in from cookies


    return (
        <div className="min-h-screen flex flex-col container mx-auto p-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>

            <div className="flex flex-col items-center justify-center p-4 ">
                <ClientFetchSessionButton />
            </div>
            <div className="flex flex-col items-center justify-center p-4 ">
                {/* <ClientSetSessionButton /> */}
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Login Status</h2>

                {session != null ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 text-green-700 rounded-md">
                            <p className="font-medium">✅ You are logged in!</p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-medium">Session:</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <pre className="whitespace-pre-wrap text-sm break-all ">{JSON.stringify(session, null, 2)}</pre>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-medium">User:</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <pre className="whitespace-pre-wrap text-sm break-all ">{JSON.stringify(user, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
                            <p className="font-medium">⚠️ You are not logged in</p>
                        </div>

                        <div className="mt-4">
                            <Link to="/login" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                Go to Login Page
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

}