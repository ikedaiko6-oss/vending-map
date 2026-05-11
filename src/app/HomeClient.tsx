"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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
  imageUrl?: string;
  photoUploadedAt?: string;
  userId?: string;
}

interface Props {
  machines: VendingMachine[];
  user: User | null;
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export default function HomeClient({ machines: initialMachines, user }: Props) {
  const [machines, setMachines] = useState(initialMachines);
  const [toast, setToast] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(user?.id ?? null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const adminEmails = useMemo(
    () => parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS),
    []
  );
  const adminUserIds = useMemo(
    () => parseCsv(process.env.NEXT_PUBLIC_ADMIN_USER_IDS),
    []
  );
  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase() ?? "";
    const userId = user?.id?.toLowerCase() ?? "";
    return adminEmails.includes(email) || adminUserIds.includes(userId);
  }, [adminEmails, adminUserIds, user]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      showToast("ログインが必要です");
      return null;
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${authUser.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("vending-machine-photos")
      .upload(path, file);
    if (error) {
      showToast("画像のアップロードに失敗しました: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("vending-machine-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAdd = useCallback(
    async (lat: number, lng: number, name: string, note: string, items: string, imageFile: File | null) => {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) return;
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("vending_machines")
        .insert({ latitude: lat, longitude: lng, address: name, maker: note, items, user_id: user?.id, image_url: imageUrl, ...(imageUrl ? { photo_uploaded_at: now } : {}) })
        .select("id, address, latitude, longitude, maker, items, user_id, image_url")
        .single();

      if (error) {
        showToast("登録に失敗しました: " + error.message);
        return;
      }
      if (data) {
        const d = data as unknown as Record<string, unknown>;
        setMachines((prev) => [
          {
            id: d.id as string,
            name: d["address"] as string,
            lat: d["latitude"] as number,
            lng: d["longitude"] as number,
            note: d["maker"] as string,
            items: d["items"] as string,
            imageUrl: (d["image_url"] as string) ?? undefined,
            photoUploadedAt: imageUrl ? now : undefined,
            userId: d["user_id"] as string,
          },
          ...prev,
        ]);
        showToast("自販機を登録しました！");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase, user]
  );

  const handleUpdate = useCallback(
    async (id: string, name: string, note: string, items: string, imageFile: File | null) => {
      let imageUrl: string | undefined;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (!uploaded) return;
        imageUrl = uploaded;
      }

      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = { address: name, maker: note, items };
      if (imageUrl) {
        updatePayload.image_url = imageUrl;
        updatePayload.photo_uploaded_at = now;
      }

      const { data, error } = await supabase
        .from("vending_machines")
        .update(updatePayload)
        .eq("id", id)
        .select("id, address, latitude, longitude, maker, items, image_url")
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
              ? {
                  id: d.id as string,
                  name: d["address"] as string,
                  lat: d["latitude"] as number,
                  lng: d["longitude"] as number,
                  note: d["maker"] as string,
                  items: d["items"] as string,
                  imageUrl: (d["image_url"] as string) ?? undefined,
                  photoUploadedAt: imageUrl ? now : m.photoUploadedAt,
                }
              : m
          )
        );
        showToast("更新しました！");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="flex flex-col h-dvh">
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
              {isAdmin && (
                <span className="text-[10px] text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-2 py-0.5">
                  管理者
                </span>
              )}
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
          currentUserId={currentUserId}
          isAdmin={isAdmin}
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
