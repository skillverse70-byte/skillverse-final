import React from "react";

export default function BrandLogo({
  className = "",
  imageClassName = "",
  alt = "Skill Verse logo",
  surface = "brand",
}) {
  const surfaceClass =
    surface === "none"
      ? ""
      : surface === "brand"
        ? "bg-gradient-to-r from-[#3262AE] to-[#1D3D6B] shadow-lg shadow-[#1D3D6B]/20 ring-1 ring-white/10"
      : surface === "soft"
        ? "bg-[#1D3D6B] shadow-lg shadow-[#1D3D6B]/10 ring-1 ring-white/10"
        : "bg-[#102746] shadow-lg shadow-black/15";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl px-3 py-2 ${surfaceClass} ${className}`}
    >
      <img
        src="/logo/logo1.png"
        alt={alt}
        className={`h-11 w-auto object-contain ${imageClassName}`}
      />
    </div>
  );
}
