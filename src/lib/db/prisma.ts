export async function ensureDefaultBusiness(businessId = DEFAULT_BUSINESS_ID, recheck = false) {
  // Existing business path omitted for brevity in the source at parent commit.
  return businessId;
}

export const DEFAULT_BUSINESS_ID = "default-business";

export const prisma = {
  user: {
    findUnique: async () => null,
    findFirst: async () => null,
    update: async () => ({}),
    create: async () => ({ id: "demo-user" }),
    updateMany: async () => ({ count: 0 }),
  },
  session: {
    create: async () => ({ id: "demo-session" }),
    findUnique: async () => null,
    updateMany: async () => ({ count: 0 }),
  },
  business: {
    upsert: async () => ({}),
    findUnique: async () => null,
    findMany: async () => [],
  },
};
