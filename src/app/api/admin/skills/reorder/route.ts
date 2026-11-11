import { makeReorderHandler } from "@/lib/admin/crud";

const handlers = makeReorderHandler("skills");

export const PUT = handlers.PUT;
