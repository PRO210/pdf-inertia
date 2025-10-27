import React from "react";

export default function Spinner({ size = 40, borderWidth = 6, texto = '' }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          border: `${borderWidth}px solid transparent`,
          borderTopColor: "#9333EA",
          borderRightColor: "#A855F7",
          animation: "spin 1s linear infinite",
        }}
      ></div>
      {texto && <span className="mt-1 text-sm">{texto}</span>}
    </div>
  );
}
// borderTopColor: "#9333EA",
// borderRightColor: "#A855F7",