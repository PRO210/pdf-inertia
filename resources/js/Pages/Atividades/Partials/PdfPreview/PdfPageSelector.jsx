// File: components/PdfPageSelector.jsx
// A small, reusable modal component that shows thumbnails of PDF pages
// Props:
// - visible: boolean
// - thumbs: array of dataURL thumbnails
// - onSelect: (pageNumber) => void
// - onClose: () => void
// - slotIndex: number (optional, used for title)


import React from 'react';


export default function PdfPageSelector({ visible, thumbs = [], onSelect, onClose, slotIndex = null }) {

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />


      <div className="relative z-10 w-full max-w-4xl bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Escolha a página {slotIndex != null ? `para o slot ${slotIndex + 1}` : ''}</h3>
          <button className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={onClose}>Fechar</button>
        </div>


        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-auto">
          {thumbs && thumbs.length > 0 ? (
            thumbs.map((src, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(idx + 1)}
                className="flex flex-col items-center gap-2 p-1 border rounded hover:shadow-sm focus:outline-none"
                title={`Página ${idx + 1}`}
              >
                <img src={src} alt={`Página ${idx + 1}`} className="w-full h-[120px] object-contain" />
                <span className="text-xs">Página {idx + 1}</span>
              </button>
            ))
          ) : (
            <div className="col-span-full text-center text-sm text-gray-500">Nenhuma miniatura disponível</div>
          )}
        </div>
      </div>
    </div>
  );
}