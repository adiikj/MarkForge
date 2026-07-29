import { useState } from "react";

const Editor = ({ content, onChange }: { content: string; onChange: (text: string) => void }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className=" rounded-lg shadow-lg relative w-full max-w-7xl h-screen flex flex-col">
      <textarea
        className={`flex-1 w-full h-screen p-4 mt-4 bg-white/10 text-white rounded-lg resize-none outline-none 
        transition-all duration-300 overflow-auto
        ${
          isFocused ? " shadow-lg shadow-blue-500/20" : ""
        }`}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
};

export default Editor;
