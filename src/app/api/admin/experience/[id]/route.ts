import { makeItemHandlers } from "@/lib/admin/crud";

const handlers = makeItemHandlers("experience");

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
