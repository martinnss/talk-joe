import { useState } from "react";

interface RecordButtonProps {
  recording: boolean;
  setRecording: (recording: boolean) => void;
  onProcessAudio: (audioBlob: Blob) => Promise<void>;
}

const RecordButton: React.FC<RecordButtonProps> = ({
  recording,
  setRecording,
  onProcessAudio,
}) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );

  const handleClick = async () => {
    if (!recording) {
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.start();

      recorder.ondataavailable = (event) => {
        onProcessAudio(event.data);
      };

      setMediaRecorder(recorder);
    } else {
      // Stop recording
      mediaRecorder?.stop();
      setMediaRecorder(null);
    }
    setRecording(!recording);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full py-4 rounded-full ${
        recording ? "bg-red-500" : "bg-blue-500"
      } text-white`}
    >
      {recording ? "Stop" : "Start"}
    </button>
  );
};

export default RecordButton;
