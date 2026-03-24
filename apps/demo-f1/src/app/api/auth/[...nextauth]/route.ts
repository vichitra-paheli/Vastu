/**
 * next-auth v5 catch-all route handler for demo-f1.
 * Mounts GET and POST handlers from the central auth configuration.
 */
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
