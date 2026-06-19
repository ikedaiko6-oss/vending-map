"use client";

import { useState, useRef } from "react";
import {
  MACHINE_TAG_OPTIONS,
  formatMachineItems,
  parseMachineItems,
  type MachineTagId,
} from "@/lib/machineTags";
import PhotoBlurEditor from "./PhotoBlurEditor";

interface VendingMachine {
  id: string;
  name: string;
  lat: number;
  lng: number;
  note?: string;
  items?: string;
  imageUrl?: string;
}

interface Props {
  machine: VendingMachine;
  onClose: () => void;
  onSave: (id: string, name: string, note: string, items: string, imageFile: File | null) => Promise<void>;
}

export default function EditMachineModal({ machine, onClose, onSave }: Props) {
  const parsedItems = parseMachineItems(machine.items);
  const [name, setName] = useState(machine.name);
  const [note, setNote] = useState(machine.note ?? "");
  const [items, setItems] = useState(parsedItems.memo);
  const [tagIds, setTagIds] = useState<MachineTagId[]>(parsedItems.tagIds);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(machine.imageUrl ?? null);
  const [blurEditorOpen, setBlurEditorOpen] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
    setPrivacyChecked(false);
    setImageError(null);
  };

  const handleBlurApply = (file: File, previewUrl: string) => {
    setImageFile(file);
    setPreview(previewUrl);
    setPrivacyChecked(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startBlurEditor = async () => {
    if (imageFile) {
      setBlurEditorOpen(true);
      return;
    }

    if (!machine.imageUrl) return;

    setImageLoading(true);
    setImageError(null);
    try {
      const response = await fetch(machine.imageUrl, { mode: "cors" });
      if (!response.ok) throw new Error("画像を取得できませんでした");
      const blob = await response.blob();
      const type = blob.type || "image/jpeg";
      const extension = type === "image/png" ? "png" : "jpg";
      const file = new File([blob], `current-photo.${extension}`, { type });
      const previewUrl = URL.createObjectURL(file);
      setImageFile(file);
      setPreview(previewUrl);
      setPrivacyChecked(false);
      setBlurEditorOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setImageError("この写真を直接編集できませんでした。写真を選び直してからモザイクしてください。");
    } finally {
      setImageLoading(false);
    }
  };

  const toggleTag = (id: MachineTagId) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (imageFile && !privacyChecked) return;
    setSaving(true);
    await onSave(machine.id, name.trim(), note.trim(), formatMachineItems(tagIds, items), imageFile);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">自販機を編集</h2>
        <p className="text-xs text-gray-400 mb-4">
          📍 {machine.lat.toFixed(5)}, {machine.lng.toFixed(5)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              住所・場所の特徴 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：渋谷区道玄坂1-1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              場所の特徴（任意）
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：コインランドリー隣り、駐車場の角"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支払い・特徴（任意）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MACHINE_TAG_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={tagIds.includes(option.id)}
                    onChange={() => toggleTag(option.id)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自由メモ（任意）
            </label>
            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="例：100円商品あり、冬はホット多め"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              写真（任意）
            </label>
            {preview ? (
              <div className="space-y-2">
                <div className="relative">
                  <img src={preview} alt="プレビュー" className="w-full h-36 object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreview(null);
                      setPrivacyChecked(false);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
                  >
                    ✕
                  </button>
                </div>
                {(imageFile || machine.imageUrl) && (
                  <button
                    type="button"
                    onClick={startBlurEditor}
                    disabled={imageLoading}
                    className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {imageLoading ? "写真を準備中..." : "この写真をモザイク編集"}
                  </button>
                )}
                {imageError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {imageError}
                  </p>
                )}
                {imageFile && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">
                      保存前に必ず確認してください
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      車のナンバー、人の顔、住所表札などが写っている場合は「写真の一部を隠す」でモザイクしてください。
                    </p>
                    <label className="mt-2 flex items-start gap-2 text-sm text-amber-950">
                      <input
                        type="checkbox"
                        checked={privacyChecked}
                        onChange={(e) => setPrivacyChecked(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-amber-600"
                      />
                      <span>写り込みを確認しました。必要な部分は隠しました。</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <label className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-400 transition flex items-center justify-center gap-2 cursor-pointer">
                📷 写真を追加
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || (!!imageFile && !privacyChecked)}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
      </div>
      {blurEditorOpen && imageFile && preview && (
        <PhotoBlurEditor
          file={imageFile}
          previewUrl={preview}
          onApply={handleBlurApply}
          onClose={() => setBlurEditorOpen(false)}
        />
      )}
    </div>
  );
}
