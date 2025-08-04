import { createServerFileRoute } from '@tanstack/react-start/server';
import { handlers } from "@/lib/auth";

export const ServerRoute = createServerFileRoute('/api/auth/$').methods(handlers)

