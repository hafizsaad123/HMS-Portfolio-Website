import { makeCollectionHandlers } from "@/lib/admin/crud";

const handlers = makeCollectionHandlers("experience");

export const GET = handlers.GET;
export const POST = handlers.POST;
