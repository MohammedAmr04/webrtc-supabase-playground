import { supabase } from "./supabase";
import type {
  SignalType,
  SignalPayload,
  WebrtcSignalRow,
} from "@/src/lib/types/webrtc";

export function subscribeToRoom(
  roomId: string,
  cb: (signal: WebrtcSignalRow) => void,
) {
  return supabase
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "webrtc_signals",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        cb(payload.new as WebrtcSignalRow);
      },
    )
    .subscribe();
}

export async function sendSignal(
  roomId: string,
  sender: string,
  type: SignalType,
  payload: SignalPayload,
) {
  await supabase.from("webrtc_signals").insert({
    room_id: roomId,
    sender,
    type,
    payload,
  });
}
