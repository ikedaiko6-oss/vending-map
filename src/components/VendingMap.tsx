"use client";

import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useState, useCallback, useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import AddMachineModal from "./AddMachineModal";
import EditMachineModal from "./EditMachineModal";

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
  isLoggedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  onAdd: (lat: number, lng: number, name: string, note: string, items: string, imageFile: File | null) => Promise<void>;
  onUpdate: (id: string, name: string, note: string, items: string, imageFile: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function MachineMarker({
  machine,
  canManage,
  onUpdate,
  onDelete,
}: {
  machine: VendingMachine;
  canManage: boolean;
  onUpdate: (id: string, name: string, note: string, items: string, imageFile: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!marker?.element) return;

    const strip = (e: HTMLElement | null) => {
      if (!e) return;
      e.style.setProperty('background', 'none', 'important');
      e.style.setProperty('background-color', 'transparent', 'important');
      e.style.setProperty('box-shadow', 'none', 'important');
      e.style.setProperty('border', 'none', 'important');
      e.style.setProperty('padding', '0', 'important');
      e.style.setProperty('outline', 'none', 'important');
    };

    const apply = () => {
      const el = marker.element as HTMLElement;
      strip(el);
      Array.from(el.children).forEach(c => strip(c as HTMLElement));
      let parent: HTMLElement | null = el.parentElement;
      let depth = 0;
      while (parent && depth < 6) {
        strip(parent);
        parent = parent.parentElement;
        depth += 1;
      }
    };

    apply();
    const t = setTimeout(apply, 300);
    return () => clearTimeout(t);
  }, [marker]);

  const handleDelete = async () => {
    if (!confirm("この自販機を削除しますか？")) return;
    setDeleting(true);
    await onDelete(machine.id);
    setDeleting(false);
    setOpen(false);
  };

  const handleEditSave = async (id: string, name: string, note: string, items: string, imageFile: File | null) => {
    await onUpdate(id, name, note, items, imageFile);
    setEditing(false);
    setOpen(false);
  };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: machine.lat, lng: machine.lng }}
        onClick={() => setOpen(true)}
        className="vending-advanced-marker"
        style={{ background: "none", backgroundColor: "transparent", border: "none", boxShadow: "none", padding: 0 }}
      >
        <img
          src="/marker-vending.svg"
          alt="自販機"
          className="w-10 h-10 drop-shadow cursor-pointer select-none"
          style={{ display: "block", background: "transparent" }}
        />
      </AdvancedMarker>

      {open && (
        <InfoWindow anchor={marker} onClose={() => setOpen(false)}>
          <div className="p-1 w-[200px]">
            {machine.imageUrl && (
              <>
                <img
                  src={machine.imageUrl}
                  alt={machine.name}
                  className="w-full h-28 object-cover rounded-lg mb-1 cursor-zoom-in"
                  onClick={() => setFullscreen(true)}
                />
                {machine.photoUploadedAt && (
                  <p className="text-xs text-gray-400 mb-2">
                    📅 {new Date(machine.photoUploadedAt).toLocaleDateString("ja-JP")}
                  </p>
                )}
              </>
            )}
            <p className="font-bold text-sm text-gray-800">{machine.name}</p>
            {machine.note && (
              <p className="text-xs text-gray-500 mt-1">📌 {machine.note}</p>
            )}
            {machine.items && (
              <p className="text-xs text-gray-600 mt-1">📝 {machine.items}</p>
            )}
            {canManage && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => { setOpen(false); setEditing(true); }}
                  className="text-xs text-blue-500 hover:text-blue-700 transition"
                >
                  ✏️ 編集
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-500 hover:text-red-700 transition disabled:opacity-50"
                >
                  {deleting ? "削除中..." : "🗑️ 削除"}
                </button>
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {editing && (
        <EditMachineModal
          machine={machine}
          onClose={() => setEditing(false)}
          onSave={handleEditSave}
        />
      )}

      {fullscreen && machine.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={machine.imageUrl}
            alt={machine.name}
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none"
            onClick={() => setFullscreen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

function CurrentLocationButton({ onLocate }: { onLocate: (pos: { lat: number; lng: number }) => void }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map?.panTo({ lat, lng });
        map?.setZoom(17);
        onLocate({ lat, lng });
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-8 right-4 z-10 bg-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-xl hover:bg-gray-50 transition"
      title="現在地"
    >
      {locating ? "⏳" : "📍"}
    </button>
  );
}

export default function VendingMap({ machines, isLoggedIn, currentUserId, isAdmin, onAdd, onUpdate, onDelete }: Props) {
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!isLoggedIn || !e.detail.latLng) return;
      setPendingPos({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
    },
    [isLoggedIn]
  );

  const handleSave = async (name: string, note: string, items: string, imageFile: File | null) => {
    if (!pendingPos) return;
    await onAdd(pendingPos.lat, pendingPos.lng, name, note, items, imageFile);
    setPendingPos(null);
  };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} language="ja" region="JP">
      <Map
        mapId="vending-map"
        defaultCenter={{ lat: 35.6812, lng: 139.7671 }}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="w-full h-full"
        onClick={handleMapClick}
      >
        {machines.map((m) => (
          <MachineMarker
            key={m.id}
            machine={m}
            canManage={isAdmin || (!!currentUserId && m.userId === currentUserId)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
        {currentPos && (
          <AdvancedMarker position={currentPos}>
            <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg" />
          </AdvancedMarker>
        )}
        <CurrentLocationButton onLocate={setCurrentPos} />
      </Map>

      {pendingPos && (
        <AddMachineModal
          lat={pendingPos.lat}
          lng={pendingPos.lng}
          onClose={() => setPendingPos(null)}
          onSave={handleSave}
        />
      )}
    </APIProvider>
  );
}
