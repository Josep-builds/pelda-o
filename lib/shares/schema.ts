import { z } from "zod";

export const SHARE_EXPIRY_HOURS = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as const;

export const createShareLinkSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(1).max(50),
  expiry: z.enum(["24h", "7d", "30d"]),
});
