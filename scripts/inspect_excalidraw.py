import json

with open('assets/Untitled-2026-08-16-1912.excalidraw', 'r', encoding='utf-8') as f:
    d = json.load(f)

els = d['elements']
print(f'Total elements: {len(els)}')
for i, el in enumerate(els):
    t = el.get('type')
    eid = el.get('id', '')
    x = el.get('x', 0)
    y = el.get('y', 0)
    w = el.get('width', 0)
    h = el.get('height', 0)
    txt = el.get('text', '').replace('\n', ' ')
    if len(txt) > 35:
        txt = txt[:35] + '...'
    pts = el.get('points', [])
    pts_str = f' pts={len(pts)}' if pts else ''
    print(f'{i:02d} | type={t:10} | id={eid:15} | x={x:7.1f} | y={y:7.1f} | w={w:7.1f} | h={h:7.1f} | {txt}{pts_str}')
