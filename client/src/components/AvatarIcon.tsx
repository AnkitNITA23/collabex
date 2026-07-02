import React from 'react';

export interface AvatarDef {
  id: string;
  label: string;
}

export const AVATAR_LIST: AvatarDef[] = [
  { id: 'robot',      label: 'Robot'      },
  { id: 'cat',        label: 'Cat'        },
  { id: 'alien',      label: 'Alien'      },
  { id: 'ghost',      label: 'Ghost'      },
  { id: 'ninja',      label: 'Ninja'      },
  { id: 'wizard',     label: 'Wizard'     },
  { id: 'fox',        label: 'Fox'        },
  { id: 'astronaut',  label: 'Astronaut'  },
  { id: 'dragon',     label: 'Dragon'     },
  { id: 'coder',      label: 'Coder'      },
];

interface AvatarIconProps {
  id: string;
  color: string;
  size?: number;
}

export const AvatarIcon: React.FC<AvatarIconProps> = ({ id, color, size = 36 }) => {
  const light = `${color}33`; // ~20% opacity tint

  const icons: Record<string, React.ReactNode> = {
    robot: (
      <>
        {/* Head */}
        <rect x="8" y="10" width="24" height="18" rx="3" fill={color} />
        {/* Antenna */}
        <line x1="20" y1="5" x2="20" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="4" r="2" fill={color} />
        {/* Eyes */}
        <rect x="12" y="15" width="5" height="4" rx="1" fill="#0b0c10" />
        <rect x="23" y="15" width="5" height="4" rx="1" fill="#0b0c10" />
        {/* Mouth */}
        <rect x="13" y="22" width="14" height="3" rx="1.5" fill="#0b0c10" />
        {/* Ear bolts */}
        <rect x="4"  y="16" width="4" height="6" rx="1" fill={color} />
        <rect x="32" y="16" width="4" height="6" rx="1" fill={color} />
      </>
    ),

    cat: (
      <>
        {/* Head */}
        <circle cx="20" cy="22" r="12" fill={color} />
        {/* Ears */}
        <polygon points="10,14 7,5 16,12" fill={color} />
        <polygon points="30,14 33,5 24,12" fill={color} />
        {/* Inner ears */}
        <polygon points="10,13 8,7 15,12" fill={light} />
        <polygon points="30,13 32,7 25,12" fill={light} />
        {/* Eyes */}
        <ellipse cx="15" cy="20" rx="2.5" ry="3" fill="#0b0c10" />
        <ellipse cx="25" cy="20" rx="2.5" ry="3" fill="#0b0c10" />
        {/* Nose */}
        <polygon points="20,24 18.5,26.5 21.5,26.5" fill="#0b0c10" />
        {/* Whiskers */}
        <line x1="8" y1="25" x2="16" y2="26" stroke="#0b0c10" strokeWidth="1" />
        <line x1="24" y1="26" x2="32" y2="25" stroke="#0b0c10" strokeWidth="1" />
      </>
    ),

    alien: (
      <>
        {/* Big oval head */}
        <ellipse cx="20" cy="20" rx="13" ry="15" fill={color} />
        {/* Big eyes */}
        <ellipse cx="15" cy="18" rx="4" ry="5" fill="#0b0c10" />
        <ellipse cx="25" cy="18" rx="4" ry="5" fill="#0b0c10" />
        {/* Eye shine */}
        <ellipse cx="14" cy="16" rx="1.5" ry="2" fill={light} />
        <ellipse cx="24" cy="16" rx="1.5" ry="2" fill={light} />
        {/* Smile */}
        <path d="M14 27 Q20 31 26 27" stroke="#0b0c10" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Antennae */}
        <line x1="14" y1="6" x2="11" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="6" x2="29" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="1" r="2" fill={color} />
        <circle cx="29" cy="1" r="2" fill={color} />
      </>
    ),

    ghost: (
      <>
        {/* Body */}
        <path d="M8 30 L8 16 Q8 5 20 5 Q32 5 32 16 L32 30 L28 26 L24 30 L20 26 L16 30 L12 26 Z" fill={color} />
        {/* Eyes */}
        <circle cx="15" cy="17" r="3" fill="#0b0c10" />
        <circle cx="25" cy="17" r="3" fill="#0b0c10" />
        {/* Eye shine */}
        <circle cx="14" cy="16" r="1" fill={light} />
        <circle cx="24" cy="16" r="1" fill={light} />
      </>
    ),

    ninja: (
      <>
        {/* Head */}
        <circle cx="20" cy="20" r="13" fill={color} />
        {/* Mask band */}
        <rect x="7" y="17" width="26" height="6" rx="1" fill="#0b0c10" />
        {/* Eyes in mask */}
        <ellipse cx="15" cy="20" rx="2.5" ry="2" fill={color} />
        <ellipse cx="25" cy="20" rx="2.5" ry="2" fill={color} />
        {/* Headband knot */}
        <line x1="20" y1="7" x2="20" y2="11" stroke="#0b0c10" strokeWidth="3" strokeLinecap="round" />
      </>
    ),

    wizard: (
      <>
        {/* Hat */}
        <polygon points="20,2 10,20 30,20" fill={color} />
        {/* Hat brim */}
        <rect x="7" y="20" width="26" height="4" rx="2" fill={color} />
        {/* Star on hat */}
        <polygon points="20,8 21,11 24,11 22,13 23,16 20,14 17,16 18,13 16,11 19,11" fill={light} />
        {/* Face */}
        <circle cx="20" cy="30" r="7" fill={color} />
        {/* Eyes */}
        <circle cx="17" cy="29" r="1.5" fill="#0b0c10" />
        <circle cx="23" cy="29" r="1.5" fill="#0b0c10" />
        {/* Beard */}
        <path d="M15 33 Q20 37 25 33" stroke="#0b0c10" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    ),

    fox: (
      <>
        {/* Ears */}
        <polygon points="12,16 6,4 18,13" fill={color} />
        <polygon points="28,16 34,4 22,13" fill={color} />
        <polygon points="12,15 8,7 16,13" fill={light} />
        <polygon points="28,15 32,7 24,13" fill={light} />
        {/* Head */}
        <circle cx="20" cy="22" r="12" fill={color} />
        {/* Snout */}
        <ellipse cx="20" cy="27" rx="5" ry="4" fill={light} />
        {/* Eyes */}
        <ellipse cx="15" cy="20" rx="2.5" ry="2.5" fill="#0b0c10" />
        <ellipse cx="25" cy="20" rx="2.5" ry="2.5" fill="#0b0c10" />
        {/* Nose */}
        <ellipse cx="20" cy="26" rx="2" ry="1.5" fill="#0b0c10" />
      </>
    ),

    astronaut: (
      <>
        {/* Helmet outer */}
        <circle cx="20" cy="20" r="14" fill={color} />
        {/* Visor */}
        <ellipse cx="20" cy="21" rx="9" ry="8" fill="#0b0c10" />
        {/* Visor shine */}
        <ellipse cx="17" cy="17" rx="3" ry="4" fill={light} />
        {/* Helmet side details */}
        <rect x="6" y="22" width="4" height="3" rx="1" fill={light} />
        <rect x="30" y="22" width="4" height="3" rx="1" fill={light} />
        {/* Top vent */}
        <rect x="17" y="6" width="6" height="3" rx="1.5" fill={light} />
      </>
    ),

    dragon: (
      <>
        {/* Head */}
        <ellipse cx="20" cy="22" rx="12" ry="11" fill={color} />
        {/* Snout */}
        <ellipse cx="20" cy="29" rx="6" ry="4" fill={light} />
        {/* Eye ridge / horns */}
        <polygon points="14,14 11,5 18,13" fill={color} />
        <polygon points="26,14 29,5 22,13" fill={color} />
        {/* Eyes */}
        <ellipse cx="15" cy="19" rx="2.5" ry="3" fill="#0b0c10" />
        <ellipse cx="25" cy="19" rx="2.5" ry="3" fill="#0b0c10" />
        {/* Vertical pupils */}
        <ellipse cx="15" cy="19" rx="1" ry="2.5" fill={color} />
        <ellipse cx="25" cy="19" rx="1" ry="2.5" fill={color} />
        {/* Nostrils */}
        <circle cx="18" cy="29" r="1" fill="#0b0c10" />
        <circle cx="22" cy="29" r="1" fill="#0b0c10" />
      </>
    ),

    coder: (
      <>
        {/* Screen */}
        <rect x="6" y="8" width="28" height="20" rx="3" fill={color} />
        <rect x="8" y="10" width="24" height="16" rx="1.5" fill="#0b0c10" />
        {/* Code brackets */}
        <path d="M13 18 L11 20 L13 22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M27 18 L29 20 L27 22" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Slash */}
        <line x1="22" y1="16" x2="18" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Stand */}
        <rect x="16" y="28" width="8" height="3" rx="1" fill={color} />
        <rect x="12" y="30" width="16" height="2" rx="1" fill={color} />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {icons[id] ?? icons['coder']}
    </svg>
  );
};
