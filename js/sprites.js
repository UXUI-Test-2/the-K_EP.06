/* 8비트 스프라이트 데이터 — Figma 디자인(도트 아이콘)을 그대로 옮긴 것.
   문자 한 칸 = 한 픽셀. '.' 은 투명. */
(function () {
  const DUCK_ROWS = [
'....................NNNN...........................',
'...................NNNNNN..........................',
'..................NNWWWWNN.NNNNNN..................',
'..................NNWWWWWWNNWWWWNN.................',
'..................NNSSWWWWNWWWWSNN.................',
'...................NNSWWWWSWWWWSNN.................',
'....................NNSWWWWWWSSNN..................',
'....................NNSWWWWWSSNN...................',
'..................NNNNNWWWWWSNNN...................',
'................NNNWWWWWWWWSSNNNNN.................',
'..............NNNWWWWWWWWWSSWWWWWSNNN..............',
'............NNNWWWWWWWWWWSSSWWWWWWWSNNN............',
'...........NNWWWWWWWWWWWSSWWWWWWWWWWSSNN...........',
'..........NNWWWWWWWWWWWWWWWWWWWWWWWWWSNNN..........',
'.........NNWWWWWWWWWWWWWWWWWWWWWWWWWWWSSNN.........',
'........NNWWWHHWWWWWWWWWWWWWWWWWWWWWWWWSSN.........',
'.......NNWWWWHHWWWWWWWWWWWWWWWWWWWWWWWWWSNN........',
'.......NWWWWWHHWWWWWWWWWWWWWWWWWWWWWWWWWSSNN.......',
'.......NWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSNNN......',
'......NWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSNN......',
'......NWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSNN......',
'.....NWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSN.....',
'.....NWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSN.....',
'.....NWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSN.....',
'.....NWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSN.....',
'....NNWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWSSSSN....',
'....NWWWWWWWWWNNNNWWWWWWWWWWWWWNNNNWWWWWWWWSSSN....',
'....NWWWWWWWWNNNNNNWWWWWWWWWWWNNHNNNNWWWWWWSSSN....',
'...NWWWWWWWWWNHHNNNWWWWWWWWWWWNNHNNNNWWWWWWWSSSN...',
'...NWWWWWWWWWNNNNNNWWWWWWWWWWWNNNNNNNWWWWWWWWSSN...',
'..NWWWWWWWWWWNNNNNNWWWWWWWWWWWNNNNNNNWCCCCWWWSSSNN.',
'.NNWWWWCCCCWWNNNNNNWWBBBBBBBWWNNNNNNWCCCCCCWWWSSNN.',
'NNWWWCCCCCCCWWNNNNWBBBCBBBBBBBWNNNNWCCCCCCCCWWSSSNN',
'NNWWWCcCCCCCCWWWWWBBCBBBBBBBBBBWWWWWCCCCCCCCCWSSSNN',
'NNWWCcCCCCCCCWWWWWBBBBBBBBBBBBBWWWWCCCCCCCCCCWSSSNN',
'NNWWCCCCCCCCCWWWWWWbbbbbbbbbbbWWWWWCCCCCCCCCCWSSSNN',
'NNWWCCCCCCCCCWWWWWWWSbbbbbbBSWWWWWWCCCCCCCCCCSSSSNN',
'.NNWWCCCCCCCCWWWWWWWWWSSSSSWWWWWWWWWCCCCCCCCWSSSNN.',
'.NNWWWCCCCCCWWWWWWWWWWWWWWWWWWWWWWWWCCCCCCCWSSSSNN.',
'..NNSWWCCCCWWWWWWWWWWWWWWWWWWWWWWWWWWWCCCCWSSSSNN..',
'...NSSWWWWWWWWWNNNNNWWWWWWWWWNNNNWWWWWWWWWSSSSSN...',
'...NNSSWWWWWWWNNGDDNNWWWWWWWNNGDDNWWWWWWSSSSSSN....',
'....NNSSSSSSSNNDDDDNNNNNNNNNNDDDDNNNSSSSSSSSNN.....',
'.....NNSSSSNNNSNNNNNWSSSSSSSNNNNNNNNNSSSSNNN.......',
'.......NNNNNWWWNNNNNGGGGGGGGNNNNNWSTNNNNNN.........',
'........NNNWWDNWWWWWGGGGGGGGGWWWWNNNNNNSNNN........',
'.......NNWWWWWWNNGGGGNNNNNNGGGGGNNWWWWNNWSNN.......',
'.......NWWWWWWWWNNGGGNNLLLNNGGGNWWWWWWWWWWSNN......',
'......NWWWWWWWWSNNGGGNNNNNNNGGGNWWWWWWWWWWSSNN.....',
'.....NNWWWWWWWWSNNGGGNNNNNNNGGGNSWWWWWWWWWWSSN.....',
'.....NNWWWWWWWWNNTTTNNSSSSSNTTTNNWWWWWWWWWWSSN.....',
'.....NNSWWWWWWSNNTTTNSSSWWSSNTTTNSWWWWWWWWWSNNN....',
'......NNSWWWWSNNTTNNSSWWWWWSSNNTTNNSWWWWWWSSNSSN...',
'......NNSSSSSNNNNNNSSWWWWWWWSSNNNNNNSSWWWSSSSSSN...',
'.......NNSSNNYYYyyNNWWWWWWWWWSNNYYYNNNSSSSSWWSSN...',
'........NNNNYYWYYYyNNSWWWWWWSNYYYWYYYNNNNWWWWSSN...',
'.........NYYYYYYYYYyNNWWWWWWNYYYYYYYYYYyNNWWSSNN...',
'.......NNYYYYYYYYYYYyNSSSSSNNYYYYYYYYYYYyNNSSSN....',
'.......NNYYYYYYYYYYYyNNSSSSNYYYYYYYYYYYYyNNSSN.....',
'.......NNYYYYYYYYYYYyNNSSSSNYYYYYYYYYYYyyNNNN......',
'.......NNYYYYYYYYYYyyNNNSSSNYYYYYYYYYYYyyNNN.......',
'........NNyYYYYYYYyyyNNNNNNNNYYYYYYYYyyyyNN........',
'.........NNyyyyyyyyyNN......NNYyyyyyyyyyNN.........',
'...........NyyyyyyyNN........NNyyyyyyNNN...........',
'............NNNNNNN............NNNNNNN.............'];
  const DUCK_PAL = { N: '#081e6b', W: '#fffaf6', S: '#dedef6', T: '#babad2', C: '#fcb6b6', c: '#ffd6d6', B: '#fd6966', b: '#de424e', Y: '#fdd565', y: '#f6ba42', L: '#479efc', D: '#0036a2', G: '#c6c6de', H: '#ffffff' };

  const NOTE_ROWS = ['..NNNNNNNNN.', '..NNNNNNNNN.', '..NN.....NN.', '..NN.....NN.', '..NN.....NN.', '..NN.....NN.', '..NN.....NN.', 'NNNN...NNNN.', 'NNNN...NNNN.', '.NN.....NN..'];
  const CLOSE_ROWS = ['NN......NN', 'NNN....NNN', '.NNN..NNN.', '..NNNNNN..', '...NNNN...', '...NNNN...', '..NNNNNN..', '.NNN..NNN.', 'NNN....NNN', 'NN......NN'];
  const GAMEPAD_ROWS = ['..NNNNNNNNNNNN..', '.NWWWWWWWWWWWWN.', 'NWWNWWWWWWWPWWWN', 'NWNNNWWWWWPWPWWN', 'NWWNWWWWWWWPWWWN', 'NWWWWNNNNNNWWWWN', '.NNNN......NNNN.', '..NNN......NNN..'];
  const PLAY_ROWS = ['N', 'NN', 'NNN', 'NNNN', 'NNN', 'NN', 'N'];
  const GIFT_ROWS = ['..NNN..NNN..', '.NRRRNNRRRN.', '.NRRRRRRRRN.', '..NNNRRNNN..', 'NNNNNRRNNNNN', 'NYYYYRRYYYYN', 'NYYYYRRYYYYN', 'NNNNNRRNNNNN', '.NYYYRRYYYN.', '.NYYYRRYYYN.', '.NYYYRRYYYN.', '.NNNNNNNNNN.'];
  const BOMB_ROWS = ['..........S.', '.........SFS', '........NN..', '.......NN...', '...NNNNNN...', '..NBBBBBBN..', '.NBHHBBBBBN.', '.NBHBBBBBBN.', '.NBBBBBBBBN.', '.NBBBBBBBBN.', '..NBBBBBBN..', '...NNNNNN...'];
  const ITEM_PAL = { N: '#0a0d18', R: '#ff1744', Y: '#ffd700', B: '#4a5c88', H: '#cfd8e8', S: '#ff9100', F: '#ffd700' };

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
    DUCK_ROWS, DUCK_PAL, GIFT_ROWS, BOMB_ROWS, ITEM_PAL,
    duckURL: url(DUCK_ROWS, DUCK_PAL),
    noteOnURL: url(NOTE_ROWS, mono('#00e5ff')),
    noteOffURL: url(NOTE_ROWS, mono('#6b6a9a')),
    closeURL: url(CLOSE_ROWS, mono('#aab4cc')),
    gamepadURL: url(GAMEPAD_ROWS, { N: '#0a1a6b', W: '#f4f0ff', P: '#ff4fd8' }),
    playURL: url(PLAY_ROWS, mono('#ff4fd8')),
    duckCanvas: rowsToCanvas(DUCK_ROWS, DUCK_PAL),
    giftCanvas: rowsToCanvas(GIFT_ROWS, ITEM_PAL),
    bombCanvas: rowsToCanvas(BOMB_ROWS, ITEM_PAL)
  };
})();
