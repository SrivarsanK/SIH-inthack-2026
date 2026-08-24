import json
import html

with open('assets/Untitled-2026-08-16-1912.excalidraw', 'r', encoding='utf-8') as f:
    data = json.load(f)

elements = data['elements']

# Compute bounding box
min_x = min(el['x'] for el in elements) - 50
min_y = min(el['y'] for el in elements) - 50
max_x = max(el['x'] + el.get('width', 0) for el in elements) + 50
max_y = max(el['y'] + el.get('height', 0) for el in elements) + 50

width = max_x - min_x
height = max_y - min_y

# Custom color mappings for tiers and nodes
TIER_COLORS = {
    'NaXPkObtXjUzmv7SCy4eh': {'bg': '#fff7ed', 'border': '#fdba74', 'header': '#c2410c'}, # Sim (Orange)
    'MjjSz9tkoixa637YE6zzp': {'bg': '#eff6ff', 'border': '#93c5fd', 'header': '#1d4ed8'}, # Broker (Blue)
    '0sVZRG4cukUHV5MQBnw0j': {'bg': '#f5f3ff', 'border': '#c4b5fd', 'header': '#6d28d9'}, # Fusion (Purple)
    'J-VlIkR2qZHcPGB7bpIzS': {'bg': '#fefce8', 'border': '#fde047', 'header': '#a16207'}, # Presentation (Amber/Yellow)
}

NODE_COLORS = {
    'D4e-_XA-yuiP5lN8ac2S9': {'bg': '#ffedd5', 'border': '#f97316', 'title': '#9a3412'}, # Sim
    'ojuwazZtu3vznz3zr0XVl': {'bg': '#fee2e2', 'border': '#ef4444', 'title': '#b91c1c'}, # Fault API
    '40ukfBKq7Ss9C5km1W13c': {'bg': '#dbeafe', 'border': '#3b82f6', 'title': '#1e40af'}, # MQTT
    '5AUK1Ru2dACM120HNdxFb': {'bg': '#ede9fe', 'border': '#8b5cf6', 'title': '#5b21b6'}, # Kalman
    'C0SuldaVP-ELWpXF4MKS6': {'bg': '#dcfce7', 'border': '#22c55e', 'title': '#15803d'}, # ETA
    'sajH4DdIvi3kgjB0pRGoI': {'bg': '#fee2e2', 'border': '#f87171', 'title': '#991b1b'}, # Judge panel
    'LISxffo9-gOD1MwgSDKcn': {'bg': '#fef9c3', 'border': '#eab308', 'title': '#854d0e'}, # Passenger app
}

svg = []
svg.append(f'<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"{min_x} {min_y} {width} {height}\" width=\"100%\" style=\"background:#ffffff; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;\">')
svg.append('''<defs>
  <marker id=\"arrowhead\" markerWidth=\"8\" markerHeight=\"6\" refX=\"7\" refY=\"3\" orient=\"auto\">
    <polygon points=\"0 0, 8 3, 0 6\" fill=\"#334155\" />
  </marker>
  <filter id=\"shadow\" x=\"-5%\" y=\"-5%\" width=\"110%\" height=\"110%\">
    <feDropShadow dx=\"0\" dy=\"4\" stdDeviation=\"6\" flood-color=\"#0f172a\" flood-opacity=\"0.06\"/>
  </filter>
</defs>''')

# Draw Tiers first
for el in elements:
    eid = el.get('id')
    if eid in TIER_COLORS:
        c = TIER_COLORS[eid]
        x, y, w, h = el['x'], el['y'], el['width'], el['height']
        svg.append(f'<rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"20\" fill=\"{c[\"bg\"]}\" stroke=\"{c[\"border\"]}\" stroke-width=\"1.5\" stroke-dasharray=\"6 4\"/>')

# Draw Nodes
for el in elements:
    eid = el.get('id')
    if eid in NODE_COLORS:
        c = NODE_COLORS[eid]
        x, y, w, h = el['x'], el['y'], el['width'], el['height']
        svg.append(f'<rect x=\"{x}\" y=\"{y}\" width=\"{w}\" height=\"{h}\" rx=\"14\" fill=\"{c[\"bg\"]}\" stroke=\"{c[\"border\"]}\" stroke-width=\"2\" filter=\"url(#shadow)\"/>')

# Draw Arrows
for el in elements:
    if el.get('type') in ('arrow', 'line'):
        x, y = el['x'], el['y']
        pts = el.get('points', [])
        if pts:
            d = ' '.join([f'{\"M\" if i==0 else \"L\"} {x+p[0]} {y+p[1]}' for i, p in enumerate(pts)])
            is_dashed = el.get('strokeStyle') == 'dashed'
            dash = 'stroke-dasharray=\"6 4\"' if is_dashed else ''
            svg.append(f'<path d=\"{d}\" fill=\"none\" stroke=\"#334155\" stroke-width=\"2\" {dash} marker-end=\"url(#arrowhead)\"/>')

# Draw Text Labels
for el in elements:
    if el.get('type') == 'text':
        x, y = el['x'], el['y']
        txt = el.get('text', '')
        font_size = el.get('fontSize', 14)
        lines = txt.split('\n')
        
        # Check if tier header
        is_tier_hdr = any(k in txt for k in ['Tier', 'Broker Tier'])
        
        if is_tier_hdr:
            svg.append(f'<text x=\"{x}\" y=\"{y+font_size+2}\" font-size=\"18px\" font-weight=\"800\" fill=\"#0f172a\" letter-spacing=\"0.5px\">{html.escape(txt)}</text>')
        else:
            t_spans = []
            lh = font_size * 1.35
            for i, line in enumerate(lines):
                safe = html.escape(line.strip())
                if not safe:
                    continue
                is_bold = (i == 0 and len(lines) > 1 and not safe.startswith('-'))
                lw = '700' if is_bold else '500'
                lf = '#0f172a' if is_bold else '#334155'
                fs = f'{font_size+1}px' if is_bold else f'{font_size}px'
                line_y = y + font_size + i * lh
                t_spans.append(f'<tspan x=\"{x}\" y=\"{line_y}\" font-size=\"{fs}\" font-weight=\"{lw}\" fill=\"{lf}\">{safe}</tspan>')
            svg.append(f'<text x=\"{x}\" y=\"{y}\">' + ''.join(t_spans) + '</text>')

svg.append('</svg>')

with open('assets/interaction_overview_diagram.svg', 'w', encoding='utf-8') as f:
    f.write('\n'.join(svg))

print('Refined assets/interaction_overview_diagram.svg generated successfully!')
