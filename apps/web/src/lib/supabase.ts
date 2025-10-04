import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing env.SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface DownloadRecord {
  ip_hash: string;
  country?: string;
  region?: string;
  city?: string;
  user_agent?: string;
  referrer?: string;
  platform: string;
  version: string;
  release_channel?: string;
  source?: string;
  extra?: Record<string, any>;
}

export async function insertDownload(data: DownloadRecord) {
  const { error } = await supabase.from("downloads").insert({
    ...data,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to insert download record:", error);
    throw error;
  }
}

export async function getDownloadStats(
  startDate?: Date,
  endDate?: Date,
  platform?: string
) {
  let query = supabase
    .from("downloads")
    .select("*")
    .order("created_at", { ascending: false });

  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }
  if (endDate) {
    query = query.lte("created_at", endDate.toISOString());
  }
  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch download stats:", error);
    throw error;
  }

  return data;
}
