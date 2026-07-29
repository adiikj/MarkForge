import { useState } from "react";

const templates = [
  { id: "simple", name: "Simple", content: "# Simple README\nThis is a simple template." },
  { id: "detailed", name: "Detailed", content: "# Detailed README\n## Features\n- Item 1\n- Item 2" },
  { id: "modern", name: "Modern", content: "# Modern README\n**Sleek and clean design!**" },
];

const TemplatePicker = ({ onTemplateSelect }: { onTemplateSelect: (content: string) => void }) => {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
      <h2 className="text-white text-lg font-semibold">Choose a Template</h2>
      <div className="flex gap-4 mt-4">
        {templates.map((template) => (
          <div
            key={template.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("template", template.content);
              setDragging(true);
            }}
            onDragEnd={() => setDragging(false)}
            onClick={() => onTemplateSelect(template.content)}
            className={`p-4 border rounded-lg cursor-pointer ${
              dragging ? "bg-gray-700" : "bg-gray-800"
            } hover:bg-gray-700 transition`}
          >
            {template.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatePicker;
