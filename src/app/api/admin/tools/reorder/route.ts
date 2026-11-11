import { makeReorderHandler } from "@/lib/admin/crud";

const handlers = makeReorderHandler("tools");

export const PUT = handlers.PUT;
