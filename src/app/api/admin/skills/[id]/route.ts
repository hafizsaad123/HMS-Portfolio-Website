import { makeItemHandlers } from "@/lib/admin/crud";

const handlers = makeItemHandlers("skills");

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
