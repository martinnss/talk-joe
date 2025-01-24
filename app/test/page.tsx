"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioURL, setAudioURL] = useState<string>('');
  const [timer, setTimer] = useState<string>('00:00');
  const [status, setStatus] = useState<string>('Click to start recording');
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioPlayer = useRef<HTMLAudioElement | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const updateTimer = () => {
    if (startTime.current) {
      const elapsed = Date.now() - startTime.current;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setTimer(
        `${minutes.toString().padStart(2, '0')}:${remainingSeconds
          .toString()
          .padStart(2, '0')}`
      );
    }
  };

  const startRecording = async () => {
    try {
      setAudioURL('');
      audioChunks.current = [];
      setIsPlaying(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setStatus('Recording saved');
      };

      mediaRecorder.current.start();
      startTime.current = Date.now();
      timerInterval.current = setInterval(updateTimer, 1000);
      setIsRecording(true);
      setStatus('Recording...');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setStatus('Error accessing microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handlePlayback = () => {
    if (audioPlayer.current) {
      if (isPlaying) {
        audioPlayer.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayer.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <div className="text-3xl font-bold mb-4">Audio Recorder</div>
      
      <div className="text-2xl font-mono mb-4">{timer}</div>
      
      <div className="text-sm text-gray-600 mb-4">{status}</div>
      
      <div className="flex gap-4 mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Square className="w-5 h-5" />
            Stop Recording
          </button>
        )}
        
        {audioURL && !isRecording && (
          <button
            onClick={handlePlayback}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Play
              </>
            )}
          </button>
        )}
      </div>
      
      {audioURL && (
        <audio 
          ref={audioPlayer}
          src={audioURL}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}
    </div>
  );
}