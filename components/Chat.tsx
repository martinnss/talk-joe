"use client";
import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface ChatProps {
    chat: { user: "A" | "B"; message: string; language: string }[];
  }
  
  const Chat: React.FC<ChatProps> = ({ chat })  => {
    const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);

  const handleSpeak = async (text: string, messageId: number) => {
    try {
      // If there's already a message playing, stop it
      if (playingMessageId !== null) {
        setPlayingMessageId(null);
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          // Use different voices for different languages
          voice: 'nova' // You can customize this based on preference
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Set up audio event handlers
      audio.onplay = () => setPlayingMessageId(messageId);
      audio.onended = () => {
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingMessageId(null);
    }
  };


  return (
    <div className="space-y-4">
      {chat.map((entry, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg ${
            entry.user === "A" ? "bg-gray-200" : "bg-blue-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm text-gray-600">{entry.language}</p>
            <button
              onClick={() => handleSpeak(entry.message, index)}
              className="p-1 hover:bg-black/10 rounded transition-colors"
              aria-label={playingMessageId === index ? "Stop speaking" : "Speak message"}
            >
              {playingMessageId === index ? (
                <VolumeX className="w-4 h-4 text-gray-600" />
              ) : (
                <Volume2 className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
          <p className="text-black mt-1">{entry.message}</p>
        </div>
      ))}
    </div>
  );
  };
  
  export default Chat;
  