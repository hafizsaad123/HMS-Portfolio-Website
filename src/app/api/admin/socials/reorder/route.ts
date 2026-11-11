import { makeReorderHandler } from "@/lib/admin/crud";

const handlers = makeReorderHandler("socials");

export const PUT = handlers.PUT;
