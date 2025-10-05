import React from "react";

export default function Spinner({ size = 40, borderWidth = 6  }) {
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: `${borderWidth}px solid transparent`,
        borderTopColor: "red",
        borderRightColor: "blue",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent",
        animation: "spin 1s linear infinite",
        boxSizing: "border-box",
      }}
    ></div>
    
  );
}
