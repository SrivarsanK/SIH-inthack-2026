import React from 'react';

interface YaraAnimatedLogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
  animate?: boolean;
}

export const YaraAnimatedLogo: React.FC<YaraAnimatedLogoProps> = ({
  className = '',
  height = 44,
  width = 'auto',
  animate = true,
}) => {
  return (
    <div
      className={elative inline-flex items-center justify-center select-none group }
      style={{ height, width }}
    >
      <img
        src=\"/yara_animated_logo.svg\"
        alt=\"Yara Transit Intelligence\"
        className=\"h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105\"
      />
    </div>
  );
};
