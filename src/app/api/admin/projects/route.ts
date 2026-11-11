import { makeCollectionHandlers } from "@/lib/admin/crud";

const handlers = makeCollectionHandlers("projects");

export const GET = handlers.GET;
export const POST = handlers.POST;
