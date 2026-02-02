"use client";

import { createPeerConnection } from "@/src/lib/webrtc";
import { useEffect, useRef } from "react";
import { sendSignal, subscribeToRoom } from "@/src/lib/signaling";
import { useParams } from "next/navigation";
import type {
  WebrtcSignalRow,
  IceCandidatePayload,
  SdpPayload,
} from "@/src/lib/types/webrtc";

export default function Room() {
  const params = useParams();
  const id = params?.id as string;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const userId = useRef(Math.random().toString(36).substring(7)).current;

  useEffect(() => {
    if (!id) return;

    const pc = createPeerConnection();
    pcRef.current = pc;

    // 1️⃣ Local Media
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    // 2️⃣ Remote Stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = event.streams[0];
    };

    // 3️⃣ ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidatePayload =
          event.candidate.toJSON() as IceCandidatePayload;
        sendSignal(id, userId, "ice", candidatePayload);
      }
    };

    // 4️⃣ Subscribe for incoming signals
    const sub = subscribeToRoom(id, async (msg: WebrtcSignalRow) => {
      if (!pcRef.current) return;
      if (msg.sender === userId) return; // Ignore own messages

      try {
        switch (msg.type) {
          case "offer":
            const offerPayload = msg.payload as SdpPayload;
            if (pcRef.current.signalingState !== "stable") {
              await Promise.all([
                pcRef.current.setLocalDescription({ type: "rollback" }),
                pcRef.current.setRemoteDescription(offerPayload),
              ]).catch(() => pcRef.current?.setRemoteDescription(offerPayload));
            } else {
              await pcRef.current.setRemoteDescription(offerPayload);
            }

            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            sendSignal(id, userId, "answer", {
              type: "answer",
              sdp: answer.sdp!,
            });
            break;
          case "answer":
            const answerPayload = msg.payload as SdpPayload;
            await pcRef.current.setRemoteDescription(answerPayload);
            break;
          case "ice":
            const icePayload = msg.payload as IceCandidatePayload;
            await pcRef.current
              .addIceCandidate(icePayload)
              .catch((e) =>
                console.warn("ICE Candidate error (ignorable if partial):", e),
              );
            break;
        }
      } catch (err) {
        console.error("Signaling processing error:", err);
      }
    });

    return () => {
      pc.close();
      sub.unsubscribe();
    };
  }, [id, userId]);

  const startCall = async () => {
    if (!pcRef.current || !id) return;
    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      sendSignal(id, userId, "offer", { type: "offer", sdp: offer.sdp! });
    } catch (err) {
      console.error("Error starting call:", err);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-8 items-center">
      <h1 className="text-2xl font-bold">Room: {id}</h1>
      <div className="flex gap-4 w-full max-w-4xl">
        <div className="flex-1">
          <h2 className="mb-2 font-semibold text-center">Local</h2>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full border bg-gray-900 rounded-lg aspect-video object-cover"
          />
        </div>
        <div className="flex-1">
          <h2 className=" mb-2 font-semibold text-center">Remote</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full border bg-gray-900 rounded-lg aspect-video object-cover"
          />
        </div>
      </div>
      <button
        onClick={startCall}
        className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg"
      >
        Start Call
      </button>
    </div>
  );
}
