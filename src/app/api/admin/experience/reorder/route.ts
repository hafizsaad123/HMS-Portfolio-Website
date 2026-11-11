import { makeReorderHandler } from "@/lib/admin/crud";

const handlers = makeReorderHandler("experience");

export const PUT = handlers.PUT;
