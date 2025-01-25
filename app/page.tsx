"use client";
import { useState, useEffect, useRef } from "react";
import AudioRecorderButton from "@/components/AudioRecorderButton";
import Chat from "@/components/Chat";

export default function Home() {
  const [chat, setChat] = useState<
    { user: "A" | "B"; message: string }[]
  >([]);
  const [recording, setRecording] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  console.log(chat.length)
  const handleAudioProcessing = async (audioBlob: Blob) => {
    try {
      const convertedBlob = await convertAudioToMono(audioBlob);

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
        { user: "A", message: data.transcription },
        { user: "B", message: data.translation },
      ]);
    } catch (error) {
      console.error("Error processing audio:", error);
      // Consider adding error state handling here
    }
  };

    // Check if the chat container is overflowing
    const checkOverflow = () => {
      if (chatContainerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setIsOverflowing(scrollHeight > clientHeight);
      }
    };
  
    // Scroll to the bottom of the chat
    const scrollToBottom = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    };
  
    // Attach a scroll event listener to check for overflow
    useEffect(() => {
      const chatContainer = chatContainerRef.current;
      console.log(isOverflowing)
      if (chatContainer) {
        chatContainer.addEventListener("scroll", checkOverflow);
        window.addEventListener("resize", checkOverflow);
        checkOverflow(); // Initial check
      }
  
      return () => {
        if (chatContainer) {
          chatContainer.removeEventListener("scroll", checkOverflow);
          window.removeEventListener("resize", checkOverflow);
        }
      };
    }, [chat]);
  
  return (
    <div className="flex flex-col h-screen ">
      <header className="flex justify-center pt-3 pb-3 shadow-lg">
        <p className="text-4xl font-bold text-gray-800">
          Talk 
          <span className="bg-gradient-to-r from-red-500  to-blue-500 bg-clip-text text-transparent ">
            Joe
          </span>
        </p>
      </header>
      <main className="flex-1 p-4 overflow-y-auto" ref={chatContainerRef}>
        <Chat chat={chat} />
      </main>
      <footer className="p-4 pb-8">
        {isOverflowing && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-32 left-1/2 transform -translate-x-1/2  pl-1 pr-1 pb-1 bg-gray-500 bg-opacity-50 text-white rounded-full shadow-lg transition-colors"
          >
            ↓
          </button>
        )}
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