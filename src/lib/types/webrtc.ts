// نوع الرسالة
export type SignalType = "offer" | "answer" | "ice";

// Offer / Answer (SDP)
export type SdpPayload = {
  type: "offer" | "answer";
  sdp: string;
};

// ICE Candidate
export type IceCandidatePayload = {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

// Union Payload
export type SignalPayload = SdpPayload | IceCandidatePayload;

// Row جاي من Supabase
export type WebrtcSignalRow = {
  id: string;
  room_id: string;
  sender: string;
  type: SignalType;
  payload: SignalPayload;
  created_at: string;
};
