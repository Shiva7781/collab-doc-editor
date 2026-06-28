"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import type { DocumentMeta } from "@/types";

interface Props {
  document: DocumentMeta;
  onDelete: (id: string) => void;
  index: number;
}

export function SortableDocumentCard({ document, onDelete, index }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag handle — top-left, appears on hover */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 z-10 p-1 rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted opacity-0 group-hover/sortable:opacity-100 transition-all cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripVertical size={14} />
      </button>

      <DocumentCard document={document} onDelete={onDelete} index={index} />
    </div>
  );
}
