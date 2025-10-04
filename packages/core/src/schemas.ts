/**
 * Zod schemas for validation
 */

import { z } from "zod";

export const PlatformSchema = z.enum(["mac", "win", "linux"]);

export const ScanOptionsSchema = z.object({
  excludeDirs: z.array(z.string()).optional(),
  excludeExtensions: z.array(z.string()).optional(),
  followSymlinks: z.boolean().optional(),
});

export const DownloadEventSchema = z.object({
  platform: PlatformSchema,
  version: z.string(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  userAgent: z.string().optional(),
  referrer: z.string().optional(),
  ipHash: z.string(),
  releaseChannel: z.string().optional(),
  source: z.string().optional(),
});

export const AssetManifestSchema = z.object({
  version: z.string(),
  releaseDate: z.string(),
  assets: z.object({
    mac: z
      .object({
        dmg: z.string(),
        sha256: z.string(),
      })
      .optional(),
    win: z
      .object({
        msi: z.string(),
        exe: z.string().optional(),
        sha256: z.string(),
      })
      .optional(),
    linux: z
      .object({
        appImage: z.string(),
        deb: z.string().optional(),
        sha256: z.string(),
      })
      .optional(),
  }),
});
