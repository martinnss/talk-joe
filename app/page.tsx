"use client"
import { useState } from "react";
import RecordButton from "@/components/RecordButton";
import Chat from "@/components/Chat";

export default function Home() {
  const [chat, setChat] = useState<
    { user: "A" | "B"; message: string; language: string }[]
  >([]);
  const [recording, setRecording] = useState(false);

  const handleAudioProcessing = async (audioBlob: Blob) => {
    try {
      // Create a new blob with explicit type
      const audioFile = new Blob([audioBlob], { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('audioData', audioFile, 'audio.webm');

      
      console.log('Sending audio file:', audioFile);
      
      const response = await fetch('/api/openai', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server response:', errorData);
        throw new Error(`Failed to process audio: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.transcription || !data.translation) {
        throw new Error('Invalid response format');
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
      </main>
      <footer className="p-4">
        <RecordButton
          recording={recording}
          setRecording={setRecording}
          onProcessAudio={handleAudioProcessing}
        />
      </footer>
    </div>
  );
}