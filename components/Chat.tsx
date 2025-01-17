interface ChatProps {
    chat: { user: "A" | "B"; message: string; language: string }[];
  }
  
  const Chat: React.FC<ChatProps> = ({ chat }) => {
    return (
      <div className="space-y-4">
        {chat.map((entry, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              entry.user === "A" ? "bg-gray-200" : "bg-blue-200"
            }`}
          >
            <p className="text-sm text-gray-600">{entry.language}</p>
            <p>{entry.message}</p>
          </div>
        ))}
      </div>
    );
  };
  
  export default Chat;
  