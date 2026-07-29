import { useState } from "react";
import { Pencil, Eye, Download } from "lucide-react";
import Preview from "./Preview";
import Editor from "./Editor";

const defaultProfileReadme = `# 🚀 Welcome to My GitHub Profile!

## 📝 About Me
- 🔭 I’m currently working on **cool projects**
- 🌱 I’m learning **JavaScript, React, and more**
- 💬 Ask me about **Web Development**
- 📫 How to reach me: [Your Email or Social Links]

## 📊 GitHub Stats
![GitHub Stats](https://github-readme-stats.vercel.app/api?username=yourusername&show_icons=true&theme=dark)

## 🛠 Skills
- **Languages:** JavaScript, TypeScript, C++
- **Frameworks:** React, Next.js, Node.js
- **Tools:** Git, VS Code, Docker
`;

const Main = () => {
  const [readmeContent, setReadmeContent] = useState(defaultProfileReadme);
  const [isEditing, setIsEditing] = useState(true); // Tracks edit or preview mode

  const downloadMarkdown = () => {
    const element = document.createElement("a");
    const file = new Blob([readmeContent], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = "profile-readme.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="p-0 md:p-8 bg-black text-white min-h-screen flex flex-col">
      <h1 className="text-2xl md:text-4xl font-bold text-center mt-4 mb-6">Profile README Generator</h1>

      {/* Mode Toggle & Download Buttons */}
      <div className="flex justify-center mb-4 space-x-4">
        <button
          className={`flex items-center md:text-md text-sm gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-md transition-all
            ${isEditing ? "bg-white text-black" : "bg-white/5 border text-white hover:bg-white/15"}`}
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="w-5 h-5" />
          Edit
        </button>

        <button
          className={`flex items-center md:text-md text-sm gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-md transition-all
            ${!isEditing ? "bg-white text-black" : "bg-white/5 border text-white hover:bg-white/15"}`}
          onClick={() => setIsEditing(false)}
        >
          <Eye className="w-5 h-5" />
          Preview
        </button>

        {/* Download Button */}
        <button
          onClick={downloadMarkdown}
          className="flex items-center md:text-md text-sm gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg border shadow-md bg-black hover:bg-white/20 text-white transition-all"
        >
          <Download className="w-5 h-5" />
          <span className="hidden md:inline">Download</span>
        </button>
      </div>

      {/* Editor & Preview Section */}
      <div className="bg-white/10 border-2 p-0 md:p-6 rounded-lg shadow-lg border-white flex-1 mx-6 md:mx-20 mt-4">
        {isEditing ? (
          <Editor content={readmeContent} onChange={setReadmeContent} />
        ) : (
          <Preview content={readmeContent} />
        )}
      </div>
    </div>
  );
};

export default Main;
