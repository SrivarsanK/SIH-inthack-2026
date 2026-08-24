import base64

with open('assets/logo/logo_cropped.png', 'rb') as f:
    b64_logo = base64.b64encode(f.read()).decode('utf-8')

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 950 420" width="100%" height="100%">
  <defs>
    <!-- Headlight Cone Gradient -->
    <linearGradient id="headlightBeam" x1="100%" y1="50%" x2="0%" y2="50%">
      <stop offset="0%" stop-color="#fde047" stop-opacity="0.7" />
      <stop offset="30%" stop-color="#facc15" stop-opacity="0.4" />
      <stop offset="70%" stop-color="#fef08a" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- Windshield Glass Shimmer Gradient -->
    <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.6" />
      <stop offset="60%" stop-color="#bae6fd" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- Windshield Clip Path -->
    <clipPath id="windshieldClip">
      <polygon points="95,85 170,185 140,240 68,230 78,110" />
    </clipPath>

    <!-- Glow Filter -->
    <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <style>
    @keyframes busSuspension {{
      0%, 100% {{ transform: translateY(0px) rotate(0deg); }}
      25% {{ transform: translateY(-3px) rotate(0.4deg); }}
      50% {{ transform: translateY(2px) rotate(-0.3deg); }}
      75% {{ transform: translateY(-1.5px) rotate(0.2deg); }}
    }}
    
    @keyframes wheelRotate {{
      0% {{ transform: rotate(0deg); }}
      100% {{ transform: rotate(360deg); }}
    }}

    @keyframes beamPulse {{
      0%, 100% {{ opacity: 0.7; transform: scale(1); }}
      50% {{ opacity: 1; transform: scale(1.08) scaleY(1.05); }}
    }}

    @keyframes beaconFlash {{
      0%, 100% {{ opacity: 0.5; filter: drop-shadow(0 0 2px #f59e0b); }}
      50% {{ opacity: 1; filter: drop-shadow(0 0 10px #fbbf24); }}
    }}

    @keyframes glassSweep {{
      0% {{ transform: translateX(-120px) translateY(-80px); opacity: 0; }}
      20% {{ opacity: 0.8; }}
      50% {{ transform: translateX(120px) translateY(80px); opacity: 0; }}
      100% {{ transform: translateX(120px) translateY(80px); opacity: 0; }}
    }}

    @keyframes roadMove {{
      0% {{ stroke-dashoffset: 0; }}
      100% {{ stroke-dashoffset: -100; }}
    }}

    @keyframes exhaustPuff {{
      0% {{ transform: translate(880px, 320px) scale(0.4); opacity: 0.7; }}
      50% {{ transform: translate(910px, 310px) scale(0.9); opacity: 0.4; }}
      100% {{ transform: translate(940px, 300px) scale(1.3); opacity: 0; }}
    }}

    .bus-container {{
      animation: busSuspension 2s ease-in-out infinite;
      transform-origin: 430px 340px;
    }}

    .wheel-front {{
      animation: wheelRotate 1.2s linear infinite;
      transform-origin: 220px 294px;
    }}

    .wheel-rear {{
      animation: wheelRotate 1.2s linear infinite;
      transform-origin: 651px 296px;
    }}

    .headlight-glow {{
      animation: beamPulse 2.4s ease-in-out infinite;
      transform-origin: 60px 270px;
    }}

    .roof-beacon {{
      animation: beaconFlash 1.6s ease-in-out infinite;
    }}

    .glass-shimmer {{
      animation: glassSweep 3.2s ease-in-out infinite;
    }}

    .road-track {{
      stroke-dasharray: 40 25;
      animation: roadMove 0.9s linear infinite;
    }}

    .exhaust-1 {{
      animation: exhaustPuff 1.8s ease-out infinite;
    }}
    .exhaust-2 {{
      animation: exhaustPuff 1.8s ease-out infinite 0.9s;
    }}

    /* Interactive hover state */
    svg:hover .bus-container {{
      animation-duration: 0.9s;
    }}
    svg:hover .wheel-front,
    svg:hover .wheel-rear {{
      animation-duration: 0.5s;
    }}
    svg:hover .road-track {{
      animation-duration: 0.4s;
    }}
  </style>

  <!-- Speed Road Dashes Beneath Wheels -->
  <g opacity="0.45">
    <line x1="20" y1="395" x2="930" y2="395" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" class="road-track" />
    <line x1="60" y1="405" x2="890" y2="405" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="15 15" stroke-linecap="round" />
  </g>

  <!-- Exhaust Particles -->
  <g fill="#94a3b8">
    <circle cx="0" cy="0" r="8" class="exhaust-1" />
    <circle cx="0" cy="0" r="6" class="exhaust-2" />
  </g>

  <!-- Headlight Light Beam Cone -->
  <g class="headlight-glow" style="mix-blend-mode: screen;">
    <polygon points="60,265 -20,210 -20,330 60,285" fill="url(#headlightBeam)" />
    <circle cx="60" cy="275" r="16" fill="#fef08a" opacity="0.85" filter="url(#glowFilter)" />
  </g>

  <!-- Main Animated Bus Body (Suspension Bobbing) -->
  <g class="bus-container" transform="translate(40, 30)">
    
    <!-- Base Logo Image -->
    <image href="data:image/png;base64,{b64_logo}" x="0" y="0" width="863" height="366" />

    <!-- Windshield Shimmer Overlay -->
    <g clip-path="url(#windshieldClip)">
      <rect x="-50" y="40" width="40" height="250" fill="url(#shimmerGrad)" class="glass-shimmer" />
    </g>

    <!-- Roof Marker Beacons Glowing Overlay -->
    <g class="roof-beacon">
      <rect x="305" y="6" width="92" height="22" rx="11" fill="#fbbf24" opacity="0.75" />
      <rect x="662" y="6" width="94" height="22" rx="11" fill="#fbbf24" opacity="0.75" />
    </g>

    <!-- Front Wheel Rotating Dynamic Spoke Rim Overlay -->
    <g class="wheel-front" opacity="0.85">
      <circle cx="220" cy="294" r="42" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="12 12" opacity="0.6" />
      <circle cx="220" cy="294" r="26" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="8 8" />
      <line x1="220" y1="256" x2="220" y2="332" stroke="#ffffff" stroke-width="1" opacity="0.5" />
      <line x1="182" y1="294" x2="258" y2="294" stroke="#ffffff" stroke-width="1" opacity="0.5" />
    </g>

    <!-- Rear Wheel Rotating Dynamic Spoke Rim Overlay -->
    <g class="wheel-rear" opacity="0.85">
      <circle cx="651" cy="296" r="42" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="12 12" opacity="0.6" />
      <circle cx="651" cy="296" r="26" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="8 8" />
      <line x1="651" y1="258" x2="651" y2="334" stroke="#ffffff" stroke-width="1" opacity="0.5" />
      <line x1="613" y1="296" x2="689" y2="296" stroke="#ffffff" stroke-width="1" opacity="0.5" />
    </g>

    <!-- Red Taillight Pulsing Glow -->
    <rect x="834" y="226" width="12" height="48" rx="4" fill="#ef4444" opacity="0.85" filter="url(#glowFilter)" />
  </g>
</svg>'''

with open('assets/logo/yara_animated_logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

with open('dashboard/public/yara_animated_logo.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

print('Animated SVG successfully written to assets/logo/ and dashboard/public/!')
