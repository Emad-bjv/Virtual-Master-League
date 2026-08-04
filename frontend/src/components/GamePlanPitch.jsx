import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// A simple draggable player marker
function DraggablePlayer({ player }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: player.id.toString(),
    data: { player }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: `${player.x_coord}%`,
    top: `${player.y_coord}%`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="absolute w-10 h-10 -ml-5 -mt-5 bg-blue-600 rounded-full border-2 border-white flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-10 hover:z-20 transition-colors"
    >
      <span className="text-white text-xs font-bold leading-none">{player.position}</span>
      <span className="text-white text-[9px] truncate w-full text-center px-1 leading-none bg-black/40 rounded-b-full">{player.name.substring(0, 5)}</span>
    </div>
  );
}

// The pitch container (droppable)
export default function GamePlanPitch({ players, onPlayerMove }) {
  const { setNodeRef } = useDroppable({
    id: 'pitch-droppable',
  });

  const handleDragEnd = (event) => {
    const { active, delta } = event;
    if (active && delta) {
      onPlayerMove(active.id, delta.x, delta.y);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="relative w-full aspect-[2/3] md:aspect-[4/3] bg-green-700 rounded-lg overflow-hidden border-4 border-slate-700 shadow-2xl">
        {/* Pitch Lines (Simple CSS approximation) */}
        <div className="absolute inset-4 border-2 border-white/40"></div>
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40 -ml-px"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full border-2 border-white/40 -mt-12 -ml-12"></div>
        
        {/* Penalty Areas */}
        <div className="absolute top-1/2 left-4 w-32 h-64 border-2 border-white/40 -mt-32 border-l-0"></div>
        <div className="absolute top-1/2 right-4 w-32 h-64 border-2 border-white/40 -mt-32 border-r-0"></div>

        {/* Players Area */}
        <div ref={setNodeRef} className="absolute inset-0">
          {players.map((player) => (
            <DraggablePlayer key={player.id} player={player} />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
