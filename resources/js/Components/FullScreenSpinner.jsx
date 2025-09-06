import React from "react";

export default function FullScreenSpinner({ size = 80, borderWidth = 8 }) {

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          border: `${borderWidth}px solid transparent`,
          borderTopColor: "red",
          borderRightColor: "blue",
          borderBottomColor: "transparent", // roxo claro
          borderLeftColor: "transparent",
          animation: "spin 1s linear infinite",
          boxSizing: "border-box",
        }}
      ></div>
    </div>
  );
}
