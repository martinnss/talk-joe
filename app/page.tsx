"use client";
import { useState } from "react";
import AudioRecorderButton from "@/components/AudioRecorderButton";
import Chat from "@/components/Chat";

export default function Home() {
  const [chat, setChat] = useState<
    { user: "A" | "B"; message: string; language: string }[]
  >([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFormat, setAudioFormat] = useState<string>("");
  const [dynamicp, setDynamicp] = useState<string | null>(null); 

  const handleAudioProcessing = async (audioBlob: Blob) => {
    try {
      const convertedBlob = await convertAudioToMono(audioBlob);
      // Use the original blob directly (already contains correct MIME type)
      setAudioUrl(URL.createObjectURL(audioBlob));
      setAudioFormat(audioBlob.type.split("/")[1]); // Extract actual format

      setDynamicp(convertedBlob.type)

      const formData = new FormData();
      // Use dynamic file extension based on actual MIME type
      //const extension = audioBlob.type.split("/")[1]?.split(";")[0] || 'webm';
      formData.append("audioData", convertedBlob, `audio.wav`);
  
      console.log("Sending audio file:", audioBlob);
  
      const response = await fetch("/api/openai", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server response:", errorData);
        throw new Error(`Failed to process audio: ${response.status}`);
      }
  
      const data = await response.json();
  
      if (!data.transcription || !data.translation) {
        throw new Error("Invalid response format");
      }
  
      setChat((prevChat) => [
        ...prevChat,
        { user: "A", message: data.transcription, language: "en" },
        { user: "B", message: data.translation, language: "es" },
      ]);
    } catch (error) {
      console.error("Error processing audio:", error);
      // Consider adding error state handling here
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 p-4 overflow-y-auto">
        <Chat chat={chat} />
        {audioUrl && (
          <div className="mt-4">
            <p>Audio Format: .{audioFormat}</p>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => {
                const audio = new Audio(audioUrl);
                audio.play();
              }}
            >
              Play Original Audio
            </button>
          </div>
        )}
      </main>
      <p>dinamyc p:{dynamicp}</p>
      <footer className="p-4">
        <AudioRecorderButton
          recording={recording}
          setRecording={setRecording}
          onProcessAudio={handleAudioProcessing}
        />
      </footer>
    </div>
  );
}




async function convertAudioToMono(file: File | Blob): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create offline context for processing
  const offlineContext = new OfflineAudioContext(1, audioBuffer.length, 16000);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  // Render audio
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV format
  const length = renderedBuffer.length * 2;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, length, true);

  // Write audio data
  const data = new Float32Array(renderedBuffer.getChannelData(0));
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}