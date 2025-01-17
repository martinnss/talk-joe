"use client";
import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface ChatProps {
  chat: { user: "A" | "B"; message: string; language: string }[];
}

// Add proper types for WebKit AudioContext
interface WebKitWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

const Chat: React.FC<ChatProps> = ({ chat }) => {
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContext.current) {
        const AudioContextConstructor = 
          window.AudioContext || (window as unknown as WebKitWindow).webkitAudioContext;
        audioContext.current = new AudioContextConstructor();
      }
      // Remove the event listeners after first interaction
      document.removeEventListener('touchstart', initAudioContext);
      document.removeEventListener('click', initAudioContext);
    };

    document.addEventListener('touchstart', initAudioContext);
    document.addEventListener('click', initAudioContext);

    return () => {
      document.removeEventListener('touchstart', initAudioContext);
      document.removeEventListener('click', initAudioContext);
    };
  }, []);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingMessageId(null);
    }
  };

  const handleSpeak = async (text: string, messageId: number) => {
    try {
      // If the same message is playing, stop it
      if (playingMessageId === messageId) {
        stopCurrentAudio();
        return;
      }

      // Stop any currently playing audio
      stopCurrentAudio();

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: 'nova'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Clean up previous audio element
      if (audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up audio event handlers
      audio.onplay = () => setPlayingMessageId(messageId);
      audio.onended = () => {
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
        console.error('Audio playback error');
      };

      // iOS requires user interaction to play audio
      try {
        // Resume AudioContext if it was suspended
        if (audioContext.current?.state === 'suspended') {
          await audioContext.current.resume();
        }
        await audio.play();
      } catch (playError) {
        console.error('Playback error:', playError);
        setPlayingMessageId(null);
      }
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