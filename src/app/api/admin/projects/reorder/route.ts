import { makeReorderHandler } from "@/lib/admin/crud";

const handlers = makeReorderHandler("projects");

export const PUT = handlers.PUT;
