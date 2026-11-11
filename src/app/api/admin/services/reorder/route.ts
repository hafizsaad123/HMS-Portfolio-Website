import { makeReorderHandler } from "@/lib/admin/crud";

const handlers = makeReorderHandler("services");

export const PUT = handlers.PUT;
