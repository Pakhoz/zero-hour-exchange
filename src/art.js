export function icon(kind, cls='') {
  const shapes={
    radio:'<rect x="8" y="16" width="48" height="34" rx="3"/><path d="M12 16V10h29M13 22h38v7H13zM14 36h17v9H14zM38 35h12v10H38z"/><circle cx="22" cy="40" r="5"/>',
    gear:'<path d="M26 7h12l2 9 8 4 8-2 6 10-7 7v9l-8 7-9-3-7 8-11-4 1-11-8-5 1-12 10-3z"/><circle cx="34" cy="32" r="10"/>',
    ticket:'<path d="M9 14h46v12a6 6 0 0 0 0 12v12H9V38a6 6 0 0 0 0-12z"/><path d="M39 19v26M17 24h14M17 31h9M17 39h14"/>',
    art:'<rect x="9" y="8" width="46" height="48"/><path d="M16 46l11-18 8 11 7-8 7 15zM16 15h33v34H16z"/><circle cx="39" cy="23" r="4"/>',
    orb:'<path d="M23 9h18v9l10 25-7 10H20l-7-10 10-25zM23 15h18M18 43h28"/><path d="M32 23l8 12-8 10-8-10z"/>',
    terminal:'<rect x="7" y="10" width="50" height="35" rx="3"/><path d="M12 16h40v23H12zM14 52h36M25 45v7M39 45v7M18 23l6 5-6 5M30 33h13"/>',
    coin:'<circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="18"/><path d="M39 22H25l-4 10 4 10h14M17 29h18M17 35h18"/>'
  };
  return `<svg class="item-icon ${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" aria-hidden="true">${shapes[kind]||shapes.terminal}</svg>`;
}
export function portrait(personality=0) {
  const colors=['#59e6d0','#da92ed','#d8a565','#e8c67e','#a696ff'];
  return `<svg class="portrait" viewBox="0 0 128 150" shape-rendering="crispEdges" role="img" aria-label="原创像素顾客形象"><path fill="#131c31" d="M24 150V99h15V82h50v17h15v51z"/><path fill="${colors[personality]}" d="M20 150v-38h18V96h16l10 24 10-24h16v16h18v38z"/><path fill="#1d2d42" d="M39 109h11l14 24 15-24h11v41H39z"/><path fill="#ae7d83" d="M53 75h24v30H53z"/><path fill="#d3a59b" d="M40 34h48v43H78v13H51V77H40z"/><path fill="#212339" d="M34 48V23h12V14h36v10h12v24H82V34H59v13z"/><path fill="#323550" d="M41 23h37v8H41z"/><path fill="#192638" d="M44 51h38v13H44z"/><path fill="${colors[personality]}" d="M46 53h34v5H46z"/><path fill="#76566c" d="M61 76h15v4H61z"/><path fill="#e2ac9d" d="M12 135h25v15H12zM91 135h25v15H91z"/><path fill="#f5e9bc" d="M83 115h5v13h-5z"/></svg>`;
}
