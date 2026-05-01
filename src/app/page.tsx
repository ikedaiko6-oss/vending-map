import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("vending_machines")
    .select("id, address, latitude, longitude, maker, items")
    .order("created_at", { ascending: false });

  const machines = (rows as unknown as Record<string, unknown>[] ?? []).map((r) => ({
    id: r["id"] as string,
    name: (r["address"] as string) ?? "",
    lat: r["latitude"] as number,
    lng: r["longitude"] as number,
    note: (r["maker"] as string) ?? "",
    items: (r["items"] as string) ?? "",
  }));

  return <HomeClient machines={machines} user={user} />;
}
