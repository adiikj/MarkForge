"use client";

import { FC, useState } from "react";
import { GripVertical, Plus, Search, X } from "lucide-react";
import { BLOCK_CATEGORIES, blocks, type Block, type BlockContext } from "../../lib/blocks";

interface BlocksPanelProps {
  context: BlockContext;
  onInsert: (block: Block) => void;
  onClose: () => void;
}

const BlocksPanel: FC<BlocksPanelProps> = ({ context, onInsert, onClose }) => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q ? blocks.filter((b) => `${b.name} ${b.description}`.toLowerCase().includes(q)) : blocks;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#080808]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <p className="text-sm font-medium">Section blocks</p>
        <button onClick={onClose} aria-label="Close blocks" className="ml-auto rounded p-1 text-neutral-500 hover:bg-white/5 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="border-b border-white/10 p-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 focus-within:border-white/25">
          <Search className="h-3.5 w-3.5 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks"
            className="w-full bg-transparent text-xs outline-none placeholder:text-neutral-600"
          />
        </div>
        <p className="mt-2 px-1 text-[11px] leading-snug text-neutral-600">
          Click to insert at the cursor, or drag into the editor.
          {context.repo ? ` Filled in from ${context.repo}.` : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {BLOCK_CATEGORIES.map((cat) => {
          const items = visible.filter((b) => b.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat} className="mb-3">
              <p className="px-1.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-neutral-600">{cat}</p>
              {items.map((b) => (
                <button
                  key={b.id}
                  draggable
                  onDragStart={(e) => {
                    // Textareas accept text/plain drops natively at the drop position.
                    e.dataTransfer.setData("text/plain", `\n${b.build(context).trim()}\n\n`);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onInsert(b)}
                  className="group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-700 group-hover:text-neutral-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-neutral-200">{b.name}</span>
                    <span className="block text-[11px] leading-snug text-neutral-500">{b.description}</span>
                  </span>
                  <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-600 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          );
        })}
        {!visible.length && <p className="px-2 py-4 text-xs text-neutral-600">No blocks match “{query}”.</p>}
      </div>
    </div>
  );
};

export default BlocksPanel;
