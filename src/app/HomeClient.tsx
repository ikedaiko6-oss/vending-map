"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

const VendingMap = dynamic(() => import("@/components/VendingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-400">地図を読み込み中...</p>
    </div>
  ),
});

interface VendingMachine {
  id: string;
  name: string;
  lat: number;
  lng: number;
  note?: string;
  items?: string;
}

interface Props {
  machines: VendingMachine[];
  user: User | null;
}

export default function HomeClient({ machines: initialMachines, user }: Props) {
  const [machines, setMachines] = useState(initialMachines);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = useCallback(
    async (lat: number, lng: number, name: string, note: string, items: string) => {
      const { data, error } = await supabase
        .from("vending_machines")
        .insert({ latitude: lat, longitude: lng, address: name, maker: note, items, user_id: user?.id })
        .select("id, address, latitude, longitude, maker, items")
        .single();

      if (error) {
        showToast("登録に失敗しました: " + error.message);
        return;
      }
      if (data) {
        const d = data as unknown as Record<string, unknown>;
        setMachines((prev) => [
          { id: d.id as string, name: d["address"] as string, lat: d["latitude"] as number, lng: d["longitude"] as number, note: d["maker"] as string, items: d["items"] as string },
          ...prev,
        ]);
        showToast("自販機を登録しました！");
      }
    },
    [supabase, user]
  );

  const handleUpdate = useCallback(
    async (id: string, name: string, note: string, items: string) => {
      const { data, error } = await supabase
        .from("vending_machines")
        .update({ address: name, maker: note, items })
        .eq("id", id)
        .select("id, address, latitude, longitude, maker, items")
        .single();

      if (error) {
        showToast("更新に失敗しました: " + error.message);
        return;
      }
      if (data) {
        const d = data as unknown as Record<string, unknown>;
        setMachines((prev) =>
          prev.map((m) =>
            m.id === id
              ? { id: d.id as string, name: d["address"] as string, lat: d["latitude"] as number, lng: d["longitude"] as number, note: d["maker"] as string, items: d["items"] as string }
              : m
          )
        );
        showToast("更新しました！");
      }
    },
    [supabase]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("vending_machines").delete().eq("id", id);
      if (error) {
        showToast("削除に失敗しました: " + error.message);
        return;
      }
      setMachines((prev) => prev.filter((m) => m.id !== id));
      showToast("削除しました");
    },
    [supabase]
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥤</span>
          <h1 className="font-bold text-gray-800 text-lg">自販機マップ</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {machines.length}件
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-xs text-gray-500 hidden sm:block">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
              >
                ログアウト
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition font-medium"
            >
              ログインして登録
            </button>
          )}
        </div>
      </header>

      {/* 操作ガイド */}
      {user && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 text-xs text-blue-600 text-center">
          地図をタップ・クリックして自販機を登録できます
        </div>
      )}

      {/* 地図 */}
      <div className="flex-1 relative">
        <VendingMap
          machines={machines}
          isLoggedIn={!!user}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />

      </div>

      {/* フッター */}
      <footer className="text-center py-2 text-xs text-gray-400 bg-white border-t">
        <a href="/privacy" className="hover:underline">プライバシーポリシー</a>
      </footer>

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
