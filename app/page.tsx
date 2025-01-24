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

  const handleAudioProcessing = async (audioBlob: Blob) => {
    try {
      // Create a new blob with explicit type
      const audioFile = new Blob([audioBlob], { type: "audio/webm" });
      setAudioUrl(URL.createObjectURL(audioFile));
      setAudioFormat(audioFile.type.split("/")[1]); // Extract format (e.g., "webm")

      const formData = new FormData();
      formData.append("audioData", audioFile, "audio.webm");

      console.log("Sending audio file:", audioFile);

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
      // You might want to show an error message to the user here
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
