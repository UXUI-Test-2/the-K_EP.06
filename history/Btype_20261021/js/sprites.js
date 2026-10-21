/* 8비트 스프라이트 데이터 — Figma 디자인(도트 아이콘)을 그대로 옮긴 것.
   문자 한 칸 = 한 픽셀. '.' 은 투명. */
(function () {

  const NOTE_ROWS = ['..NNNNNNNNN.', '..NNNNNNNNN.', '..NN.....NN.', '..NN.....NN.', '..NN.....NN.', '..NN.....NN.', '..NN.....NN.', 'NNNN...NNNN.', 'NNNN...NNNN.', '.NN.....NN..'];
  const CLOSE_ROWS = ['NN......NN', 'NNN....NNN', '.NNN..NNN.', '..NNNNNN..', '...NNNN...', '...NNNN...', '..NNNNNN..', '.NNN..NNN.', 'NNN....NNN', 'NN......NN'];
  const GAMEPAD_ROWS = ['..NNNNNNNNNNNN..', '.NWWWWWWWWWWWWN.', 'NWWNWWWWWWWPWWWN', 'NWNNNWWWWWPWPWWN', 'NWWNWWWWWWWPWWWN', 'NWWWWNNNNNNWWWWN', '.NNNN......NNNN.', '..NNN......NNN..'];
  const PLAY_ROWS = ['N', 'NN', 'NNN', 'NNNN', 'NNN', 'NN', 'N'];
  const GIFT_ROWS = ['..NNN..NNN..', '.NRRRNNRRRN.', '.NRRRRRRRRN.', '..NNNRRNNN..', 'NNNNNRRNNNNN', 'NYYYYRRYYYYN', 'NYYYYRRYYYYN', 'NNNNNRRNNNNN', '.NYYYRRYYYN.', '.NYYYRRYYYN.', '.NYYYRRYYYN.', '.NNNNNNNNNN.'];
  const BOMB_ROWS = ['..........S.', '.........SFS', '........NN..', '.......NN...', '...NNNNNN...', '..NBBBBBBN..', '.NBHHBBBBBN.', '.NBHBBBBBBN.', '.NBBBBBBBBN.', '.NBBBBBBBBN.', '..NBBBBBBN..', '...NNNNNN...'];
  const ITEM_PAL = { N: '#0a0d18', R: '#ff1744', Y: '#ffd700', B: '#4a5c88', H: '#cfd8e8', S: '#ff9100', F: '#ffd700' };

  // 덕헤이: Figma 컴포넌트(204×260)의 사각형을 그대로 그린다 (js/duck-data.js)
  const DUCK_W = 204, DUCK_H = 260;
  const DUCK_RECTS = (function () {
    const list = [];
    (window.DUCK_RECT_CHUNKS || []).forEach(chunk => chunk.split(';').forEach(rec => {
      if (!rec) return;
      const f = rec.split(',');
      list.push([+f[0], +f[1], +f[2], +f[3], '#' + f[4]]);
    }));
    list.splice(53, 0, [60, 44, 52, 4, '#fffaf6']);   // 벡터로 들어 있던 흰색 가로 막대 (그리는 순서 유지)
    return list;
  })();
  function drawDuck(ctx, x, y, scale) {
    for (const [rx, ry, rw, rh, color] of DUCK_RECTS) {
      ctx.fillStyle = color;
      ctx.fillRect(x + rx * scale, y + ry * scale, rw * scale, rh * scale);
    }
  }
  function duckCanvasAt(scale) {
    const c = document.createElement('canvas');
    c.width = Math.round(DUCK_W * scale); c.height = Math.round(DUCK_H * scale);
    drawDuck(c.getContext('2d'), 0, 0, scale);
    return c;
  }

  /** 문자 격자 → 1칸=1px 캔버스 (CSS에서 image-rendering: pixelated 로 확대) */
  function rowsToCanvas(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c;
  }
  const url = (rows, pal) => rowsToCanvas(rows, pal).toDataURL('image/png');
  const mono = (hex) => ({ N: hex });

  window.SPRITES = {
    GIFT_ROWS, BOMB_ROWS, ITEM_PAL,
    duckURL: duckCanvasAt(0.5).toDataURL('image/png'),
    drawDuck,
    noteOnURL: url(NOTE_ROWS, mono('#00e5ff')),
    noteOffURL: url(NOTE_ROWS, mono('#6b6a9a')),
    closeURL: url(CLOSE_ROWS, mono('#aab4cc')),
    gamepadURL: url(GAMEPAD_ROWS, { N: '#0a1a6b', W: '#f4f0ff', P: '#ff4fd8' }),
    playURL: url(PLAY_ROWS, mono('#ff4fd8')),
    giftCanvas: rowsToCanvas(GIFT_ROWS, ITEM_PAL),
    bombCanvas: rowsToCanvas(BOMB_ROWS, ITEM_PAL)
  };
})();
