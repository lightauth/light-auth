// src/routes/__root.tsx
/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'

import globalsCss from "./globals.css?url"
import { getWebRequest } from '@tanstack/react-start/server'
import Header from '@/components/header'
import { getAuthSession as laGetAuthSession, getUser as laGetUser } from "@/lib/auth";
import { createServerFn } from '@tanstack/react-start'


const getAuthSession = createServerFn({
  method: 'GET',
}).handler(() => {
  return laGetAuthSession()
})
const getUser = createServerFn({ method: 'GET' })
  .validator((userId: string | undefined) => userId)
  .handler(async (ctx) => laGetUser(ctx.data));


export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: globalsCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: ({ data }) => {
    return <p>Not found!</p>
  },
  loader: async () => {
    const user = await getUser();
    return { user };
  }
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const state = Route.useLoaderData()
  const user = state.user;
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <Header user={user} />

        {children}
        <Scripts />
      </body>
    </html>
  )
}