import { makeCollectionHandlers } from "@/lib/admin/crud";

const handlers = makeCollectionHandlers("skills");

export const GET = handlers.GET;
export const POST = handlers.POST;
