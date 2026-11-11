import { makeCollectionHandlers } from "@/lib/admin/crud";

const handlers = makeCollectionHandlers("socials");

export const GET = handlers.GET;
export const POST = handlers.POST;
