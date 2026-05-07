"use client";

import { useState, useRef } from "react";

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
  const [name, setName] = useState(machine.name);
  const [note, setNote] = useState(machine.note ?? "");
  const [items, setItems] = useState(machine.items ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(machine.imageUrl ?? null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave(machine.id, name.trim(), note.trim(), items.trim(), imageFile);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
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
              メーカー（任意）
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：アサヒ、コカ・コーラ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考（任意）
            </label>
            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder="例：24時間営業、現金のみ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              写真（任意）
            </label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="プレビュー" className="w-full h-36 object-cover rounded-lg border border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
                >
                  ✕
                </button>
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
              disabled={saving || !name.trim()}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
