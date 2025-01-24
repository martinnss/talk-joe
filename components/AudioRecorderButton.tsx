"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square } from "lucide-react";

interface AudioRecorderButtonProps {
  recording: boolean;
  setRecording: (recording: boolean) => void;
  onProcessAudio: (audioBlob: Blob) => Promise<void>;
}

const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({
  recording,
  setRecording,
  onProcessAudio,
}) => {
  const [timer, setTimer] = useState<string>("00:00");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      mediaRecorder.current?.stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (recording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [recording]);

  const updateTimer = () => {
    if (startTime.current) {
      const elapsed = Date.now() - startTime.current;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      setTimer(
        `${minutes.toString().padStart(2, "0")}:${(seconds % 60)
          .toString()
          .padStart(2, "0")}`
      );
    }
  };

  const startRecording = async () => {
    try {
      audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const mimeType = mediaRecorder.current?.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        await onProcessAudio(audioBlob);
        cleanup();
      };

      mediaRecorder.current.start();
      startTime.current = Date.now();
      timerInterval.current = setInterval(updateTimer, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
    cleanup();
  };

  const cleanup = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setTimer("00:00");
    startTime.current = null;
  };

  return (
    <button
      onClick={() => setRecording(!recording)}
      className={`w-full py-4 rounded-full ${
        recording ? "bg-red-500" : "bg-blue-500"
      } text-white flex items-center justify-center gap-2 transition-all`}
    >
      {recording ? (
        <>
          <Square className="w-5 h-5" />
          <span>Stop Recording ({timer})</span>
        </>
      ) : (
        <>
          <Mic className="w-5 h-5" />
          <span>Start Recording</span>
        </>
      )}
    </button>
  );
};

export default AudioRecorderButton;