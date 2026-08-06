import React from "react";

export const LiveSignalIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4 text-blue-500" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="19" r="1.5" fill="currentColor" />
    <path d="M5 13.5a5.5 5.5 0 0 1 5.5 5.5" />
    <path d="M5 8.5a10.5 10.5 0 0 1 10.5 10.5" />
    <path d="M5 3.5a15.5 15.5 0 0 1 15.5 15.5" />
  </svg>
);
