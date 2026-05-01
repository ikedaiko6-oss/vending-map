"use client";

import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useState, useCallback } from "react";
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
}

interface Props {
  machines: VendingMachine[];
  isLoggedIn: boolean;
  onAdd: (lat: number, lng: number, name: string, note: string, items: string) => Promise<void>;
  onUpdate: (id: string, name: string, note: string, items: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function MachineMarker({
  machine,
  isLoggedIn,
  onUpdate,
  onDelete,
}: {
  machine: VendingMachine;
  isLoggedIn: boolean;
  onUpdate: (id: string, name: string, note: string, items: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("この自販機を削除しますか？")) return;
    setDeleting(true);
    await onDelete(machine.id);
    setDeleting(false);
    setOpen(false);
  };

  const handleEditSave = async (id: string, name: string, note: string, items: string) => {
    await onUpdate(id, name, note, items);
    setEditing(false);
    setOpen(false);
  };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: machine.lat, lng: machine.lng }}
        onClick={() => setOpen(true)}
      >
        <div className="text-2xl drop-shadow cursor-pointer select-none">🥤</div>
      </AdvancedMarker>

      {open && (
        <InfoWindow anchor={marker} onClose={() => setOpen(false)}>
          <div className="p-1 max-w-[220px]">
            <p className="font-bold text-sm text-gray-800">{machine.name}</p>
            {machine.note && (
              <p className="text-xs text-gray-500 mt-1">🏭 {machine.note}</p>
            )}
            {machine.items ? (
              <p className="text-xs text-gray-600 mt-1">🛒 {machine.items}</p>
            ) : (
              <p className="text-xs text-gray-400 mt-1 italic">商品未登録</p>
            )}
            {isLoggedIn && (
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

export default function VendingMap({ machines, isLoggedIn, onAdd, onUpdate, onDelete }: Props) {
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!isLoggedIn || !e.detail.latLng) return;
      setPendingPos({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
    },
    [isLoggedIn]
  );

  const handleSave = async (name: string, note: string, items: string) => {
    if (!pendingPos) return;
    await onAdd(pendingPos.lat, pendingPos.lng, name, note, items);
    setPendingPos(null);
  };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
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
            isLoggedIn={isLoggedIn}
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
