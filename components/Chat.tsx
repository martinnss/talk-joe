"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import {  Volume2, VolumeX } from 'lucide-react';

interface ChatProps {
  chat: { user: "A" | "B"; message: string }[];
}

// Add proper types for WebKit AudioContext
interface WebKitWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

const Chat: React.FC<ChatProps> = ({ chat }) => {
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const prevChatLength = useRef(chat.length);

  // Audio context initialization with silent warm-up
  useEffect(() => {
    const initAudio = async () => {
      const AudioContextConstructor = 
        window.AudioContext || (window as unknown as WebKitWindow).webkitAudioContext;
      audioContext.current = new AudioContextConstructor();
      
      // Create silent oscillator to unlock audio
      const oscillator = audioContext.current.createOscillator();
      const gainNode = audioContext.current.createGain();
      gainNode.gain.value = 0;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.current.destination);
      oscillator.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      oscillator.stop();
      
      setAudioReady(true);
    };

    const handleFirstInteraction = async () => {
      if (!audioContext.current) {
        await initAudio();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      }
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Automatic speech handling
  useEffect(() => {
    if (!audioReady) return;

    const newMessages = chat.slice(prevChatLength.current);
    const lastBMessage = newMessages.reverse().find(m => m.user === 'B');

    if (lastBMessage) {
      const messageIndex = chat.indexOf(lastBMessage);
      handleSpeak(lastBMessage.message, messageIndex);
    }

    prevChatLength.current = chat.length;
  }, [chat, audioReady]);

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingMessageId(null);
    }
  }, []);

  const handleSpeak = useCallback(async (text: string, messageId: number) => {
    try {
      stopCurrentAudio();

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setPlayingMessageId(messageId);
      audio.onended = () => {
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };

      // Critical iOS audio play fix
      if (audioContext.current?.state === 'suspended') {
        await audioContext.current.resume();
      }
      
      // Force play through user gesture
      await audio.play().catch(async (error) => {
        if (error.name === 'NotAllowedError') {
          await audioContext.current?.resume();
          await audio.play();
        }
      });
    } catch (error) {
      console.error('Playback failed:', error);
      setPlayingMessageId(null);
    }
  }, [stopCurrentAudio]);

  return (
    <div className="space-y-4  min-h-full">

      {chat.map((entry, index) => (
        <div
          key={index}
          className={`p-4 rounded-2xl px-4 py-2 shadow-md ${
            entry.user === "A" ? "bg-gray-100 ml-14" : "bg-gradient-to-r from-red-200 to-blue-200 mr-14"
          }`}
        >
          <div className="flex justify-between items-start">
            <button
              onClick={() => handleSpeak(entry.message, index)}
              className="p-1 hover:bg-black/10 rounded transition-colors"
              aria-label={playingMessageId === index ? "Stop speaking" : "Speak message"}
            >
              {playingMessageId === index ? (
                <VolumeX className="w-4 h-4 text-gray-700" />
              ) : (
                <Volume2 className="w-4 h-4 text-gray-700" />
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