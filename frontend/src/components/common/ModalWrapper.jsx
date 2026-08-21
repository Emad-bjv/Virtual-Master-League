import React from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function ModalWrapper({ isOpen, onClose, children, className = "" }) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className={`max-h-[90vh] overflow-y-auto custom-scrollbar my-auto ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
