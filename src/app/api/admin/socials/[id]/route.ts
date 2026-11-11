import { makeItemHandlers } from "@/lib/admin/crud";

const handlers = makeItemHandlers("socials");

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
