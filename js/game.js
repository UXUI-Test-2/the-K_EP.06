/* 더케이 오락실 · 레트로 벽돌깨기
   게임 로직은 KTCU_DS_PMO_PICK_벽돌깨기편_게임_v0.5 와 동일하게 유지하고,
   화면(UI/렌더링)만 Figma 디자인(8비트 네온 스타일)으로 교체했습니다. */
(function () {
  'use strict';

  // ==========================================
  // 1. 8비트 레트로 신시사이저 오디오 엔진 (원본과 동일)
  // ==========================================
  class RetroAudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.isBgmPlaying = false;
      this.bgmTimer = null;
      this.currentNoteIndex = 0;
      this.volume = 0.25;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTone(freq, type = 'square', duration = 0.08, gainVal = 0.1, pitchBend = 0) {
      if (this.isMuted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (pitchBend !== 0) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(10, freq + pitchBend), this.ctx.currentTime + duration);
        }
        gain.gain.setValueAtTime(gainVal * this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    playPaddleHit() { this.init(); this.playTone(320, 'triangle', 0.06, 0.12, 50); }
    playBrickHit() { this.init(); this.playTone(580, 'square', 0.05, 0.09, 100); }
    playCatchItem() {
      this.init();
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'triangle', 0.12, 0.15, 30), i * 50);
      });
    }
    playBadItem() {
      this.init();
      this.playTone(300, 'sawtooth', 0.12, 0.15, -120);
      setTimeout(() => this.playTone(220, 'sawtooth', 0.15, 0.15, -80), 90);
    }
    playLoseLife() {
      this.init();
      [350, 300, 240, 180].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'sawtooth', 0.15, 0.14, -50), i * 90);
      });
    }
    playVictory() {
      this.init();
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'square', 0.2, 0.18), i * 80);
      });
    }

    toggleBgm() {
      if (this.isBgmPlaying) { this.stopBgm(); return false; }
      this.startBgm();
      return true;
    }

    startBgm() {
      if (this.isBgmPlaying || this.isMuted) return;
      this.init();
      this.isBgmPlaying = true;
      this.currentNoteIndex = 0;
      const notes = [
        523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.00, 698.46,
        659.25, 783.99, 1046.5, 783.99, 587.33, 493.88, 587.33, 659.25
      ];
      const playNext = () => {
        if (!this.isBgmPlaying || this.isMuted) return;
        const f = notes[this.currentNoteIndex];
        this.playTone(f, 'square', 0.12, 0.04);
        this.playTone(f / 2, 'triangle', 0.1, 0.03);
        this.currentNoteIndex = (this.currentNoteIndex + 1) % notes.length;
        this.bgmTimer = setTimeout(playNext, 160);
      };
      playNext();
    }

    stopBgm() {
      this.isBgmPlaying = false;
      if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
    }
  }

  const audio = new RetroAudioEngine();

  // ==========================================
  // 2. 교직원공제회 혜택 & 리스크 데이터 (원본과 동일)
  // ==========================================
  const GIFT_ITEM = { id: 'gift', name: '선물', type: 'GIFT' };
  const BOMB_ITEM = { id: 'bomb', name: '폭탄', type: 'BOMB' };

  const GIFT_RATIO = 0.5;             // 선물:폭탄 = 5:5
  const MIN_GIFTS_PER_STAGE = 2;
  const MAX_GIFTS_PER_STAGE = 3;
  const MIN_BOMBS_PER_STAGE = 2;
  const MAX_BOMBS_PER_STAGE = 3;
  const GUARANTEE_BRICKS_PER_ITEM = 7;
  const MAX_STAGE = 3;
  const DROP_CHANCE = 0.18;
  const DROP_COOLDOWN_SEC = 3.0;
  const ITEM_SIZE = 48;               // 디자인 기준 크기 (원본 40)

  const HP_MAX = 100;
  const HP_GIFT_HEAL = 30;
  const HP_BOMB_DAMAGE = 25;
  const HP_BALL_LOST_DAMAGE = 30;
  const DAMAGE_FLASH_SEC = 0.5;

  const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  const START_HINT_TEXT = IS_TOUCH ? '화면을 터치하면 게임 시작!' : '화면을 클릭하면 게임 시작!';
  const AUTO_RELAUNCH_SEC = 1.0;      // 공을 놓친 뒤 자동 발사까지 대기 시간
  const RESUME_HINT_TEXT =IS_TOUCH ? '화면을 터치하면 이어서 진행!' : '화면을 클릭하면 이어서 진행!';

  class ItemManager {
    rollDropItem() {
      if (Math.random() > DROP_CHANCE) return null;
      return Math.random() < GIFT_RATIO ? { ...GIFT_ITEM, isGood: true } : { ...BOMB_ITEM, isGood: false };
    }
  }

  const COUPON_POOL = [
    { id: 'cp_saving',   tag: '저축 상품',   title: '장기저축급여',       desc: '급여율 5.0%, 연복리로 목돈 불리기' },
    { id: 'cp_split',    tag: '저축 상품',   title: '분할급여금',         desc: '모은 만큼 퇴직 후 월급처럼 받기' },
    { id: 'cp_increase', tag: '저축 상품',   title: '증좌',               desc: '여윳돈 생길 때마다 증좌로 미래 채우기' },
    { id: 'cp_movie',    tag: '문화 혜택',   title: '영화표 할인',        desc: '보고 싶은 영화 365일 할인받고 보기' },
    { id: 'cp_travel',   tag: '여행 혜택',   title: '숙박 및 교통 할인',  desc: '숙박·교통 할인으로 여행 경비 줄이기' },
    { id: 'cp_golf',     tag: '레저 혜택',   title: '골프장 회원가 이용', desc: '골프장 회원가로 취미 생활 즐기기' },
    { id: 'cp_wedding',  tag: '축하금 제공', title: '결혼축하금',         desc: '새 출발 축하금 받기' },
    { id: 'cp_mind',     tag: '건강 지원',   title: 'The-K 마음쉼',       desc: '마음이 복잡할 때 1:1 상담 받기' },
    { id: 'cp_checkup',  tag: '건강 지원',   title: '건강검진',           desc: '제휴 검진기관에서 할인받고 건강 챙기기' },
    { id: 'cp_consult',  tag: '생활 지원',   title: '무료 전문 상담',     desc: '법률·노무·세무 상담 무료로 받기' }
  ];

  const PRIZE_CONFIG = {
    requiredCoupons: 3,
    prizeName: '경품',     // 확정 시 교체 (예: '커피 쿠폰')
    authUrl: '',           // 본인인증 페이지 URL — 비어 있으면 데모 모드(바로 응모 결과 화면으로 이동)
    savingUrl: '',         // 응모 결과 화면의 「장기저축급여 알아보기」 연결 주소 (콘텐츠 전용관 장기저축급여 편)
    welfareUrl: ''         // 「공제회 회원 전용 혜택 모아보기」 연결 주소 (콘텐츠 전용관 복지혜택 편)
  };
  const PRIZE_APPLIED_KEY = 'KTCU_BREAKER_PRIZE_APPLIED_V1';   // 경품 응모 여부 (중복 참여 방지)

  class CouponWallet {
    constructor() {
      this.ids = [];
      try {
        const saved = JSON.parse(localStorage.getItem('KTCU_BREAKER_COUPONS_V1') || '[]');
        if (Array.isArray(saved)) this.ids = saved.filter(id => COUPON_POOL.some(c => c.id === id));
      } catch (e) {}
    }
    save() { try { localStorage.setItem('KTCU_BREAKER_COUPONS_V1', JSON.stringify(this.ids)); } catch (e) {} }
    get count() { return this.ids.length; }
    get isPrizeReady() { return this.count >= PRIZE_CONFIG.requiredCoupons; }
    grant() {
      const remaining = COUPON_POOL.filter(c => !this.ids.includes(c.id));
      if (remaining.length === 0) return null;
      const coupon = remaining[Math.floor(Math.random() * remaining.length)];
      this.ids.push(coupon.id);
      this.save();
      return coupon;
    }
  }

  // ==========================================
  // 3. 8비트 픽셀 그리기 도우미 (Figma 컴포넌트 모양 그대로)
  // ==========================================
  const BRICK_COLORS = ['#ff4fb0', '#ffc83d', '#27d3ff', '#a066ff', '#ff4fb0', '#ffc83d'];
  const BRICK_H = 16;
  const BRICK_GAP = 4;

  function drawBrick(ctx, x, y, w, h, color) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y, w - 4, 2); ctx.fillRect(x, y + 2, w, h - 4); ctx.fillRect(x + 2, y + h - 2, w - 4, 2); // 모서리를 깎은 3줄 구조
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 2, y, w - 4, 2);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 2, y + h - 2, w - 4, 2);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x + 4, y + 4, 4, 2); ctx.fillRect(x + 4, y + 6, 2, 2);
  }

  function drawPaddle(ctx, x, y, w) {
    x = Math.round(x); y = Math.round(y);
    const bands = [[0, 4, 4, '#ff9be8', '#9aeaff'], [4, 8, 0, '#ff4fd8', '#27d3ff'], [12, 4, 4, '#b0239a', '#0b86c8']]; // [y, h, 모서리 inset, 캡색, 몸통색]
    for (const [dy, h, ins, cap, body] of bands) {
      ctx.fillStyle = cap; ctx.fillRect(x + ins, y + dy, 12 - ins, h); ctx.fillRect(x + w - 12, y + dy, 12 - ins, h);
      ctx.fillStyle = body; ctx.fillRect(x + 12, y + dy, w - 24, h);
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x + 16, y + 2, Math.min(40, w - 32), 2);
  }

  function discRows(ctx, cx, cy, widths, u, color) {
    const h = widths.length * u;
    ctx.fillStyle = color;
    widths.forEach((w, i) => ctx.fillRect(Math.round(cx - (w * u) / 2), Math.round(cy - h / 2 + i * u), w * u, u));
  }

  const BALL_TRAIL = [[16, 8, '#cfe8ff', 0.9], [24, 8, '#9fd0ff', 0.75], [32, 6, '#6fa8ff', 0.6], [39, 6, '#5a7bff', 0.45], [45, 4, '#4b63ff', 0.35], [50, 4, '#4b63ff', 0.25]];
  function drawBall(ctx, b) {
    const sp = Math.hypot(b.vx, b.vy) || 1, dx = -b.vx / sp, dy = -b.vy / sp;
    for (const [d, s, c, a] of BALL_TRAIL) {
      ctx.globalAlpha = a; ctx.fillStyle = c;
      ctx.fillRect(Math.round((b.x + dx * d - s / 2) / 2) * 2, Math.round((b.y + dy * d - s / 2) / 2) * 2, s, s);
    }
    ctx.globalAlpha = 0.35; discRows(ctx, b.x, b.y, [4, 6, 8, 10, 10, 10, 10, 8, 6, 4], 2, '#7cc4ff');
    ctx.globalAlpha = 1; discRows(ctx, b.x, b.y, [4, 6, 8, 8, 8, 8, 6, 4], 2, '#ffffff');
  }

  const ITEM_OUTER = [4, 8, 10, 10, 12, 12, 12, 12, 10, 10, 8, 4];
  const ITEM_INNER = [4, 8, 8, 10, 10, 10, 10, 8, 8, 4];
  function drawItem(ctx, it) {
    const ring = it.isGood ? '#00e676' : '#ff1744', fill = it.isGood ? '#003c1e' : '#46000f';
    const cx = it.x + it.size / 2, cy = it.y + it.size / 2;
    discRows(ctx, cx, cy, ITEM_OUTER, 4, ring);
    discRows(ctx, cx, cy, ITEM_INNER, 4, fill);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(it.isGood ? SPRITES.giftCanvas : SPRITES.bombCanvas, Math.round(cx - 12), Math.round(cy - 12), 24, 24);
  }

  // ==========================================
  // 4. 벽돌깨기 핵심 게임 엔진 (로직은 원본과 동일)
  // ==========================================
  class BrickBreakerGame {
    constructor(canvas, itemManager, couponWallet, onStateChange, onNotifyItem) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.itemManager = itemManager;
      this.couponWallet = couponWallet;
      this.onStateChange = onStateChange;
      this.onNotifyItem = onNotifyItem;

      this.width = 360;
      this.height = 500;

      this.stage = 1;
      this.hp = HP_MAX;
      this.lastHpDelta = 0;
      this.damageFlash = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.isGameOver = false;
      this.isVictory = false;

      this.paddle = { x: 140, y: 460, width: 80, baseWidth: 80, height: 16, speed: 400, moveDir: 0 };
      this.balls = [];
      this.ballAttached = true;
      this.bricks = [];
      this.fallingItems = [];
      this.dropCooldown = 0;
      this.isStageClearing = false;
      this.particles = [];
      this.floatingTexts = [];
      this.stageGiftDrops = 0;
      this.stageBombDrops = 0;

      this.lastTime = 0;
      this.animationFrameId = null;
      this.resizeCanvas();
    }

    resizeCanvas() {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.width = w;
      this.height = h;
      this.paddle.y = this.height - 12 - this.paddle.height;
      this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.width, this.paddle.x));
    }

    start() {
      this.stage = 1;
      this.hp = HP_MAX;
      this.lastHpDelta = 0;
      this.damageFlash = 0;
      this.isPlaying = true;
      this.isPaused = false;
      this.isGameOver = false;
      this.isVictory = false;
      this.fallingItems = [];
      this.particles = [];
      this.floatingTexts = [];
      this.dropCooldown = 0;
      this.isStageClearing = false;
      this.giftPause = false;
      this.autoLaunch = 0;

      this.resizeCanvas();
      this.initStage(this.stage);
      this.resetBallAndPaddle();

      this.lastTime = performance.now();
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.loop(this.lastTime);
      this.triggerStateUpdate();
    }

    stop() {
      this.isPlaying = false;
      this.giftPause = false;
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 선물을 받으면 잠시 멈춰서 어떤 선물인지 읽을 수 있게 하고, 클릭/터치하면 이어서 진행
    pauseForGift() {
      this.giftPause = true;
      this.isPaused = true;
    }

    resumeFromGift() {
      if (!this.giftPause) return false;
      this.giftPause = false;
      this.isPaused = false;
      this.lastTime = performance.now();
      return true;
    }

    // 스테이지별 차이는 벽돌 개수뿐: 1단계 4줄(28개)부터 1줄(7개)씩 늘어 3단계 6줄(42개), 모든 벽돌 1번에 깨짐
    initStage(stageNum) {
      this.bricks = [];
      this.stageGiftDrops = 0;
      this.stageBombDrops = 0;
      const rows = 3 + stageNum;
      const cols = 7;
      const margin = 12;
      const brickW = Math.floor((this.width - margin * 2 - BRICK_GAP * (cols - 1)) / cols);
      const offsetX = Math.floor((this.width - (brickW * cols + BRICK_GAP * (cols - 1))) / 2);
      const offsetY = 16;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.bricks.push({
            x: offsetX + c * (brickW + BRICK_GAP),
            y: offsetY + r * (BRICK_H + BRICK_GAP),
            width: brickW,
            height: BRICK_H,
            hp: 1,
            maxHp: 1,
            color: BRICK_COLORS[r % BRICK_COLORS.length]
          });
        }
      }
    }

    resetBallAndPaddle() {
      this.paddle.width = this.paddle.baseWidth;
      this.paddle.x = (this.width - this.paddle.width) / 2;
      this.ballAttached = true;
      this.balls = [{ x: this.paddle.x + this.paddle.width / 2, y: this.paddle.y - 9, radius: 8, vx: 180, vy: -260, speed: 320 }];
    }

    launchBall() {
      if (!this.isPlaying || this.isGameOver) return;
      if (this.ballAttached) {
        this.ballAttached = false;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        const speed = 320;
        this.balls[0].vx = Math.cos(angle) * speed;
        this.balls[0].vy = Math.sin(angle) * speed;
        audio.playPaddleHit();
      }
    }

    movePaddleLeft(isDown) { this.paddle.moveDir = isDown ? -1 : 0; }
    movePaddleRight(isDown) { this.paddle.moveDir = isDown ? 1 : 0; }

    setPaddleX(targetX) {
      this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.width, targetX - this.paddle.width / 2));
      if (this.ballAttached && this.balls[0]) this.balls[0].x = this.paddle.x + this.paddle.width / 2;
    }

    movePaddleBy(dx) {
      this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.width, this.paddle.x + dx));
      if (this.ballAttached && this.balls[0]) this.balls[0].x = this.paddle.x + this.paddle.width / 2;
    }

    update(deltaSec) {
      if (!this.isPlaying || this.isGameOver) return;

      if (this.paddle.moveDir !== 0) {
        this.paddle.x += this.paddle.moveDir * this.paddle.speed * deltaSec;
        this.paddle.x = Math.max(0, Math.min(this.width - this.paddle.width, this.paddle.x));
        if (this.ballAttached && this.balls[0]) this.balls[0].x = this.paddle.x + this.paddle.width / 2;
      }

      if (!this.ballAttached && !this.isStageClearing) this.updateBalls(deltaSec);

      // 공을 놓친 뒤: 잠시 대기 후 자동 발사 (게임이 멈춰 있지 않도록)
      if (this.autoLaunch > 0 && this.ballAttached && !this.isStageClearing) {
        this.autoLaunch -= deltaSec;
        if (this.autoLaunch <= 0) { this.autoLaunch = 0; this.launchBall(); }
      }

      if (this.dropCooldown > 0) this.dropCooldown = Math.max(0, this.dropCooldown - deltaSec);
      for (let i = this.fallingItems.length - 1; i >= 0; i--) {
        const item = this.fallingItems[i];
        item.y += item.vy * deltaSec;

        if (item.y + item.size >= this.paddle.y && item.y <= this.paddle.y + this.paddle.height &&
            item.x + item.size >= this.paddle.x && item.x <= this.paddle.x + this.paddle.width) {
          this.fallingItems.splice(i, 1);
          this.dropCooldown = DROP_COOLDOWN_SEC;
          this.applyItem(item);
          continue;
        }
        if (item.y > this.height) {
          this.fallingItems.splice(i, 1);
          this.dropCooldown = DROP_COOLDOWN_SEC;
        }
      }

      this.updateParticles(deltaSec);

      if (this.bricks.length === 0) this.stageClear();
    }

    updateBalls(deltaSec) {
      for (let i = this.balls.length - 1; i >= 0; i--) {
        const ball = this.balls[i];
        ball.x += ball.vx * deltaSec;
        ball.y += ball.vy * deltaSec;

        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius; ball.vx = Math.abs(ball.vx); audio.playPaddleHit();
        } else if (ball.x + ball.radius > this.width) {
          ball.x = this.width - ball.radius; ball.vx = -Math.abs(ball.vx); audio.playPaddleHit();
        }

        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius; ball.vy = Math.abs(ball.vy); audio.playPaddleHit();
        }

        if (ball.y + ball.radius >= this.paddle.y && ball.y - ball.radius <= this.paddle.y + this.paddle.height &&
            ball.x >= this.paddle.x - ball.radius && ball.x <= this.paddle.x + this.paddle.width + ball.radius && ball.vy > 0) {
          const hitPos = (ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
          const maxAngle = Math.PI * 0.38;
          const angle = hitPos * maxAngle - Math.PI / 2;
          const curSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          ball.vx = Math.cos(angle) * curSpeed;
          ball.vy = Math.sin(angle) * curSpeed;
          ball.y = this.paddle.y - ball.radius - 1;
          audio.playPaddleHit();
          this.createPaddleHitParticles(ball.x, ball.y);
        }

        if (ball.y - ball.radius > this.height) this.balls.splice(i, 1);

        this.checkBrickCollision(ball);
      }

      if (this.balls.length === 0) this.loseLife();
    }

    checkBrickCollision(ball) {
      for (let i = this.bricks.length - 1; i >= 0; i--) {
        const br = this.bricks[i];
        if (ball.x + ball.radius >= br.x && ball.x - ball.radius <= br.x + br.width &&
            ball.y + ball.radius >= br.y && ball.y - ball.radius <= br.y + br.height) {
          const overlapLeft = (ball.x + ball.radius) - br.x;
          const overlapRight = (br.x + br.width) - (ball.x - ball.radius);
          const overlapTop = (ball.y + ball.radius) - br.y;
          const overlapBottom = (br.y + br.height) - (ball.y - ball.radius);
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          if (minOverlap === overlapLeft || minOverlap === overlapRight) ball.vx = -ball.vx;
          else ball.vy = -ball.vy;
          this.damageBrick(i);
          break;
        }
      }
    }

    damageBrick(index) {
      const br = this.bricks[index];
      br.hp--;
      audio.playBrickHit();
      this.createBrickParticles(br.x + br.width / 2, br.y + br.height / 2, br.color);

      if (br.hp <= 0) {
        this.bricks.splice(index, 1);

        const noneFalling = this.fallingItems.length === 0;
        const canDrop = noneFalling && this.dropCooldown <= 0;
        const giftsNeeded = Math.max(0, MIN_GIFTS_PER_STAGE - this.stageGiftDrops);
        const bombsNeeded = Math.max(0, MIN_BOMBS_PER_STAGE - this.stageBombDrops);
        const totalNeeded = giftsNeeded + bombsNeeded;
        const mustDrop = totalNeeded > 0 && noneFalling && this.bricks.length > 0 &&
          this.bricks.length <= totalNeeded * GUARANTEE_BRICKS_PER_ITEM;
        let drop = null;
        if (mustDrop) {
          const giveGift = giftsNeeded === bombsNeeded ? Math.random() < GIFT_RATIO : giftsNeeded > bombsNeeded;
          drop = giveGift ? { ...GIFT_ITEM, isGood: true } : { ...BOMB_ITEM, isGood: false };
        } else if (canDrop) {
          drop = this.itemManager.rollDropItem();
        }
        if (drop && drop.isGood && this.stageGiftDrops >= MAX_GIFTS_PER_STAGE) drop = null;
        if (drop && !drop.isGood && this.stageBombDrops >= MAX_BOMBS_PER_STAGE) drop = null;
        if (drop) {
          if (drop.isGood) this.stageGiftDrops++;
          else this.stageBombDrops++;
          this.fallingItems.push({ ...drop, x: br.x + br.width / 2 - ITEM_SIZE / 2, y: br.y, size: ITEM_SIZE, vy: 140 });
        }
      }
      this.triggerStateUpdate();
    }

    applyItem(item) {
      if (item.isGood) audio.playCatchItem();
      else audio.playBadItem();

      if (!item.isGood) {
        this.takeDamage(HP_BOMB_DAMAGE, item.x + item.size / 2, this.paddle.y);
        return;
      }
      const coupon = this.couponWallet.grant();
      this.onNotifyItem(item, coupon);
      this.addFloatingText(`HP +${HP_GIFT_HEAL}`, this.width / 2, this.height * 0.55, '#46f0a0', 28);
      this.changeHp(HP_GIFT_HEAL);
    }

    changeHp(delta) {
      this.hp = Math.max(0, Math.min(HP_MAX, this.hp + delta));
      this.lastHpDelta = delta;
      if (this.hp <= 0 && !this.isGameOver) { this.gameOver(false); return; }
      this.triggerStateUpdate();
    }

    takeDamage(amount, x, y) {
      this.damageFlash = DAMAGE_FLASH_SEC;
      this.addFloatingText(`HP -${amount}`, this.width / 2, this.height * 0.55, '#ff4f6d', 28);
      for (let i = 0; i < 18; i++) {
        this.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 320,
          vy: -Math.random() * 260 - 40,
          life: 0.7, maxLife: 0.7,
          color: i % 2 ? '#ff4f6d' : '#ff9100',
          size: Math.random() < 0.5 ? 4 : 6
        });
      }
      this.changeHp(-amount);
    }

    loseLife() {
      audio.playLoseLife();
      this.takeDamage(HP_BALL_LOST_DAMAGE, this.paddle.x + this.paddle.width / 2, this.height - 10);
      if (!this.isGameOver) {
        this.resetBallAndPaddle();
        this.autoLaunch = AUTO_RELAUNCH_SEC;   // 체력이 깎여도 멈추지 않고 잠시 뒤 공이 자동 발사됨
      }
    }

    stageClear() {
      if (this.isStageClearing) return;
      this.isStageClearing = true;
      this.fallingItems = [];
      this.dropCooldown = 0;
      audio.playVictory();

      if (this.stage >= MAX_STAGE) {
        this.addFloatingText('ALL CLEAR!', this.width / 2, this.height / 2, '#ffd23f', 28);
        setTimeout(() => this.gameOver(true), 1200);
        return;
      }

      this.stage++;
      this.addFloatingText(`STAGE ${this.stage} 돌파!`, this.width / 2, this.height / 2, '#ffd23f', 28);
      setTimeout(() => {
        if (!this.isPlaying) return;
        this.initStage(this.stage);
        this.resetBallAndPaddle();
        this.isStageClearing = false;
        this.triggerStateUpdate();
      }, 1200);
    }

    gameOver(victory = false) {
      this.isGameOver = true;
      this.isPlaying = false;
      this.isVictory = victory;
      if (!victory) audio.playLoseLife();
      this.triggerStateUpdate();
    }

    triggerStateUpdate() {
      if (this.onStateChange) {
        this.onStateChange({
          stage: this.stage,
          hp: this.hp,
          hpDelta: this.lastHpDelta,
          bricksLeft: this.bricks.length,
          isGameOver: this.isGameOver,
          isVictory: this.isVictory
        });
      }
    }

    loop(time) {
      if (!this.isPlaying || this.isGameOver) return;
      const deltaTime = Math.min(0.05, (time - this.lastTime) / 1000);
      this.lastTime = time;
      if (!this.isPaused) this.update(deltaTime);
      this.render();
      this.animationFrameId = requestAnimationFrame(t => this.loop(t));
    }

    // --- 렌더링 (배경은 투명 → 페이지의 네온 도시 배경이 비침) ---
    render() {
      const { ctx } = this;
      ctx.clearRect(0, 0, this.width, this.height);
      const dmg = this.damageFlash > 0 ? this.damageFlash / DAMAGE_FLASH_SEC : 0;
      ctx.save();
      if (dmg > 0) {
        const amp = 7 * dmg;
        ctx.translate((Math.random() - 0.5) * amp * 2, (Math.random() - 0.5) * amp * 2);
      }

      for (const br of this.bricks) drawBrick(ctx, br.x, br.y, br.width, br.height, br.color);
      drawPaddle(ctx, this.paddle.x, this.paddle.y, this.paddle.width);
      for (const ball of this.balls) drawBall(ctx, ball);
      for (const item of this.fallingItems) drawItem(ctx, item);
      this.renderParticles(ctx);
      ctx.restore();

      this.renderFloatingTexts(ctx);

      const showReady = this.autoLaunch > 0 && this.ballAttached && this.isPlaying && !this.isGameOver && !this.isPaused;
      const showStartHint = !showReady && this.ballAttached && this.isPlaying && !this.isGameOver && !this.isStageClearing && !this.isPaused;
      const showGiftHint = this.giftPause && this.isPlaying && !this.isGameOver;
      if (showStartHint || showGiftHint || showReady) {
        const text = showGiftHint ? RESUME_HINT_TEXT : showReady ? 'READY!' : START_HINT_TEXT;
        const y = showGiftHint ? this.height * 0.72 : this.height / 2;
        ctx.save();
        ctx.font = 'bold 22px Mona12, Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(10,5,54,.8)';
        ctx.strokeText(text, this.width / 2, y);
        ctx.fillStyle = '#ffd23f';
        ctx.fillText(text, this.width / 2, y);
        ctx.restore();
      }
    }

    createBrickParticles(x, y, color) {
      for (let i = 0; i < 8; i++) {
        this.particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, color, life: 0.35, maxLife: 0.35, size: Math.random() < 0.5 ? 2 : 4 });
      }
    }

    createPaddleHitParticles(x, y) {
      for (let i = 0; i < 6; i++) {
        this.particles.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 80 - 20, color: '#27d3ff', life: 0.25, maxLife: 0.25, size: 4 });
      }
    }

    addFloatingText(text, x, y, color = '#FFFFFF', size = 14) {
      this.floatingTexts.push({ text, x, y, color, size, life: 1.2, maxLife: 1.2 });
    }

    updateParticles(deltaSec) {
      if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - deltaSec);
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * deltaSec; p.y += p.vy * deltaSec; p.life -= deltaSec;
        if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 25 * deltaSec; ft.life -= deltaSec;
        if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
    }

    renderParticles(ctx) {
      for (const p of this.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1.0;
    }

    renderFloatingTexts(ctx) {
      ctx.textAlign = 'center';
      for (const ft of this.floatingTexts) {
        ctx.font = `bold ${ft.size}px Mona12, Pretendard, sans-serif`;
        ctx.globalAlpha = Math.min(1, ft.life / (ft.maxLife * 0.4));
        ctx.strokeStyle = '#0a0536';
        ctx.lineWidth = ft.size > 20 ? 6 : 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1.0;
    }
  }

  // ==========================================
  // 5. 시작 화면 일러스트 (벽돌 벽 + 공 + 덕헤이 + 패들)
  // ==========================================
  function drawStartArt() {
    const c = document.getElementById('start-canvas');
    const inner = c.parentElement;
    const w = inner.clientWidth, h = inner.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // 일러스트(벽돌 벽 + 덕헤이)는 "시작하기" 버튼 아래 남은 공간에 맞춰 배치.
    // 공간이 넉넉하면 원래 크기(1배)로 가운데 쯤에, 모자라면 최대 0.7배까지 줄여서 화면 안에 들어오게 한다.
    const ART_H = 221, GAP_TOP = 22, GAP_BOTTOM = 20;
    const ctaBottom = document.getElementById('btn-start').getBoundingClientRect().bottom - inner.getBoundingClientRect().top;
    const avail = h - (ctaBottom + GAP_TOP) - GAP_BOTTOM;
    const f = Math.max(0.7, Math.min(1, avail / ART_H));
    const extra = Math.max(0, avail - ART_H * f);
    const top = ctaBottom + GAP_TOP + extra * 0.45;

    ctx.save();
    ctx.translate(w / 2, top);
    ctx.scale(f, f);
    const left = -195;                  // 390 콘텐츠 영역의 왼쪽 끝 (가운데 기준)
    // 벽돌 배치: Figma 시작 화면(01)에서 좌표를 그대로 옮김 [x, y, 색] (좌우는 화면 밖으로 잘림)
    const P = '#ff4fb0', Y = '#ffc83d', C = '#27d3ff', V = '#a066ff';
    const WALL = [
      [-12, 496, P], [48, 496, Y], [108, 496, C], [168, 496, V], [228, 496, P], [288, 496, Y], [348, 496, C],
      [-12, 524, C], [48, 524, V], [168, 524, Y], [228, 524, C], [288, 524, V], [348, 524, P],
      [-12, 552, P], [48, 552, Y], [288, 552, Y], [348, 552, C],
      [-12, 580, C], [48, 580, V], [348, 580, P],
      [-12, 608, P], [348, 608, C],
      [-12, 636, C]
    ];
    for (const [x, y, color] of WALL) {
      drawBrick(ctx, left + x, y - 496, 56, 24, color);
      // 일러스트를 줄였을 때 좌우 끝이 비어 보이지 않도록 가장자리 벽돌을 바깥으로 이어서 채움
      if (x === -12) drawBrick(ctx, left - 72, y - 496, 56, 24, color);
      if (x === 348) drawBrick(ctx, left + 408, y - 496, 56, 24, color);
    }
    // 파티클
    for (const [x, y, s, color] of [[110, 534, 8, '#27d3ff'], [130, 570, 6, '#ff4fd8'], [286, 528, 8, '#ff9be8'], [272, 584, 6, '#27d3ff'], [92, 610, 6, '#a066ff'], [300, 634, 6, '#ffd23f']]) {
      ctx.fillStyle = color; ctx.fillRect(Math.round(left + x), Math.round(y - 496), s, s);
    }
    // 덕헤이 (204×260 → 0.75배) — 벽돌 앞에 앉아 있음
    SPRITES.drawDuck(ctx, -77, 26, 0.75);
    ctx.restore();
  }

  // ==========================================
  // 6. UI 렌더링 및 이벤트
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const itemManager = new ItemManager();
    const couponWallet = new CouponWallet();

    // 스프라이트 주입
    $('duck-head').src = SPRITES.duckURL;
    $('gamepad').src = SPRITES.gamepadURL;
    $('play-icon').src = SPRITES.playURL;
    $('close-icon').src = SPRITES.closeURL;
    $('bgm-icon').src = SPRITES.noteOnURL;
    document.querySelectorAll('.x-icon').forEach(i => { i.src = SPRITES.closeURL; });
    const fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = SPRITES.duckURL;

    const hudStage = $('hud-stage'), hudBricks = $('hud-bricks');
    const hpBar = $('hp-bar'), hpText = $('hp-text');
    const toast = $('toast'), board = $('board'), canvas = $('game-canvas');
    let lastOn = 10, hpTimer = null;

    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    // ----- HP 바 (10칸) -----
    for (let i = 0; i < 10; i++) { const s = document.createElement('span'); s.className = 'seg'; hpBar.appendChild(s); }
    const segs = [...hpBar.children];
    function renderHp(hp, lostFrom) {
      const on = Math.ceil(hp / 10);
      segs.forEach((s, i) => { s.className = 'seg' + (i < on ? ' on' : (lostFrom != null && i >= on && i < lostFrom ? ' lost' : '')); });
      const pct = (hp / HP_MAX) * 100;
      hpBar.classList.toggle('low', pct <= 30);
      hpBar.classList.toggle('mid', pct > 30 && pct <= 60);
      hpText.textContent = `${hp} / ${HP_MAX}`;
      hpBar.setAttribute('aria-valuenow', hp);
      return on;
    }
    renderHp(HP_MAX);

    // ----- 아이템 카드 -----
    function cardHtml(c, state, no) {
      const nn = String(no).padStart(2, '0');
      const tag = state === 'locked' ? '미획득' : escapeHtml(c.tag);
      return `<div class="card pxbox ${state}"><div class="stub"><img class="px-img" src="assets/icons/item-${nn}.png" alt=""><small>No.${nn}</small></div>` +
        `<div class="body"><span class="tag">${tag}</span><span class="title">${escapeHtml(c.title)}</span><span class="desc">${escapeHtml(c.desc)}</span></div></div>`;
    }

    function progressHtml() {
      let dots = '';
      for (let i = 0; i < PRIZE_CONFIG.requiredCoupons; i++) dots += `<span class="${i < couponWallet.count ? 'on' : ''}"></span>`;
      return `<div class="progress">${dots}</div>`;
    }

    function updateWalletButton() {
      $('wallet-label').textContent = couponWallet.isPrizeReady ? '도감 · 응모 가능' : '아이템 도감';
    }

    function prizeBannerHtml(isResult = false) {
      const need = PRIZE_CONFIG.requiredCoupons;
      const prize = escapeHtml(PRIZE_CONFIG.prizeName);
      if (couponWallet.isPrizeReady) {
        const guide = isResult
          ? `하단의 아이템 도감 버튼을 눌러<br>본인인증 후 <b>${prize}</b> 응모가 가능해요.`
          : `본인인증 후 <b>${prize}</b> 응모가 가능해요.`;
        return `아이템 <b>${couponWallet.count}개</b> 수집 완료!<br>${guide}${progressHtml()}`;
      }
      return `아이템 <b>${need}개</b>를 모으면 본인인증 후 <b>${prize}</b> 응모!<br>앞으로 <b>${need - couponWallet.count}개</b> 남았어요.${progressHtml()}`;
    }

    // ----- 도감 / 응모 팝업 -----
    function openWallet() {
      if (game.isPlaying) game.isPaused = true;
      $('wallet-prize').innerHTML = prizeBannerHtml();
      const owned = new Set(couponWallet.ids);
      $('wallet-summary').innerHTML = `<span>전체 아이템 ${COUPON_POOL.length}종</span><span>획득 <b>${owned.size}</b> / ${COUPON_POOL.length}</span>`;
      const list = $('wallet-list');
      list.innerHTML = COUPON_POOL.map((c, i) => cardHtml(c, owned.has(c.id) ? 'owned' : 'locked', i + 1)).join('');
      list.scrollTop = 0;
      $('btn-prize-apply').disabled = !couponWallet.isPrizeReady;
      $('btn-wallet-resume').textContent = game.isPlaying ? '계속하기' : '닫기';
      $('modal-wallet').classList.add('active');
    }
    function closeWallet() { $('modal-wallet').classList.remove('active'); game.isPaused = false; }

    function openPrize() {
      if (!couponWallet.isPrizeReady) return;
      if (game.isPlaying) game.isPaused = true;
      const prize = escapeHtml(PRIZE_CONFIG.prizeName);
      $('prize-count').textContent = couponWallet.count;
      $('prize-message').innerHTML = PRIZE_CONFIG.authUrl
        ? `경품 지급을 위해 <b>본인인증</b>이 필요해요.<br>인증을 마치면 <b>${prize}</b> 응모가 완료됩니다.`
        : `경품 지급을 위해 <b>본인인증</b>이 필요해요.<br>(데모) 버튼을 누르면 본인인증을 마친 것으로 보고<br><b>${prize}</b> 응모 결과 화면으로 이동해요.`;
      const btnAuth = $('btn-prize-auth');
      btnAuth.disabled = false;
      btnAuth.textContent = '본인인증 하기';
      $('modal-wallet').classList.remove('active');
      $('modal-prize').classList.add('active');
    }
    function closePrize() { $('modal-prize').classList.remove('active'); game.isPaused = false; }

    // ----- 선물 획득 알림 카드: HUD 자리에 겹쳐 표시 -----
    function showItemToast(item, coupon) {
      if (!coupon) return;           // 전 종류를 모은 뒤에는 HP 회복만
      const hud = $('hud').getBoundingClientRect();
      toast.style.left = hud.left + 'px';
      toast.style.top = hud.top + 'px';
      toast.style.width = hud.width + 'px';
      toast.innerHTML = cardHtml(coupon, 'owned', COUPON_POOL.indexOf(coupon) + 1);
      updateWalletButton();
      if (couponWallet.count === PRIZE_CONFIG.requiredCoupons) {
        game.addFloatingText(`아이템 ${PRIZE_CONFIG.requiredCoupons}개 달성! 경품 응모 가능`, game.width / 2, game.height / 2 - 30, '#ffd700', 16);
      }
      toast.classList.add('show');
      game.pauseForGift();           // 어떤 선물인지 읽을 수 있게 잠시 멈춤 → 클릭/터치하면 이어서 진행
    }

    // 선물 안내를 닫고 게임 이어서 진행
    function resumeFromGift() {
      if (!game.resumeFromGift()) return false;
      toast.classList.remove('show');
      return true;
    }

    function handleStateChange(state) {
      hudStage.textContent = state.stage;
      hudBricks.textContent = state.bricksLeft;
      const prevOn = lastOn;
      lastOn = renderHp(state.hp, state.hpDelta < 0 ? prevOn : null);
      if (state.hpDelta) {
        // 체력이 깎이면 빨강(HP바 + 상단/하단 라인), 채워지면 초록(HP바 테두리) — Figma 디자인과 동일
        const isHit = state.hpDelta < 0;
        hpBar.classList.remove('hit', 'heal');
        document.body.classList.remove('fx-damage');
        hpBar.classList.add(isHit ? 'hit' : 'heal');
        if (isHit) document.body.classList.add('fx-damage');
        if (hpTimer) clearTimeout(hpTimer);
        hpTimer = setTimeout(() => {
          hpBar.classList.remove('hit', 'heal');
          document.body.classList.remove('fx-damage');
          renderHp(game.hp);
        }, 700);
        game.lastHpDelta = 0;
      }
      if (state.isGameOver) {
        $('final-stage').textContent = state.stage;
        $('gameover-title').textContent = state.isVictory ? 'ALL CLEAR!' : 'GAME OVER';
        $('btn-restart').textContent = state.isVictory ? '한 판 더' : '다시 도전하기';
        $('final-coupons').textContent = couponWallet.count;
        $('gameover-prize').innerHTML = prizeBannerHtml(true);
        $('modal-gameover').classList.add('active');
      }
    }

    const game = new BrickBreakerGame(canvas, itemManager, couponWallet, handleStateChange, showItemToast);
    updateWalletButton();

    // ----- 경품 응모 완료 / 이벤트 중복 참여 방지 페이지 -----
    let noticeTimer = null;
    function notify(msg) {
      const n = $('notice');
      n.textContent = msg; n.classList.add('show');
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => n.classList.remove('show'), 2200);
    }
    function applyPrize() {
      let already = false;
      try { already = localStorage.getItem(PRIZE_APPLIED_KEY) === '1'; if (!already) localStorage.setItem(PRIZE_APPLIED_KEY, '1'); } catch (e) {}
      closePrize();
      showResult(already ? 'duplicate' : 'complete');
    }
    function drawResultArt(kind) {
      const c = $('result-art'), inner = c.parentElement;
      const w = inner.clientWidth, h = inner.clientHeight;
      if (!w || !h) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      // 제목 위의 남은 공간에 덕헤이를 앉힘 (공간이 좁으면 생략)
      const space = $('result-title').getBoundingClientRect().top - inner.getBoundingClientRect().top - 12;
      if (space < 90) return;
      const s = space >= 130 ? 0.5 : space / 260;            // 204×260 기준 배율
      const dw = 204 * s, dh = 260 * s, cx = w / 2, top = space - dh + 12 - 12 + 0;
      SPRITES.drawDuck(ctx, Math.round(cx - dw / 2), Math.round(Math.max(8, top)), s);
      const ay = Math.round(Math.max(8, top));
      if (kind === 'complete') {
        // 선물 + 색종이
        ctx.drawImage(SPRITES.giftCanvas, Math.round(cx + dw / 2 - 6), ay + 8, 48, 48);
        const CONF = [[-110, 10, 8, '#27d3ff'], [-86, 56, 6, '#ff4fd8'], [-130, 70, 6, '#ffd23f'], [-60, 6, 6, '#a066ff'], [118, 70, 8, '#ff9be8'], [96, 6, 6, '#27d3ff'], [140, 28, 6, '#ffd23f'], [-100, 100, 8, '#ff9be8'], [88, 104, 6, '#a066ff']];
        for (const [x, y, sz, col] of CONF) { ctx.fillStyle = col; ctx.fillRect(Math.round(cx + x), ay + y, sz, sz); }
      } else {
        // 응모 완료 배지(체크)
        const bx = Math.round(cx + dw / 2 + 18), by = ay + 32;
        const OUTER = [4, 8, 10, 10, 12, 12, 12, 12, 10, 10, 8, 4], INNER = [4, 8, 8, 10, 10, 10, 10, 8, 8, 4];
        discRows(ctx, bx, by, OUTER, 4, '#46f0a0');
        discRows(ctx, bx, by, INNER, 4, '#003c1e');
        ctx.fillStyle = '#ffffff';
        for (const [x, y] of [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]]) ctx.fillRect(bx - 14 + x * 4, by - 10 + y * 4, 4, 4);
      }
    }
    function showResult(kind) {
      game.stop(); audio.stopBgm();
      $('bgm-icon').src = SPRITES.noteOnURL;
      toast.classList.remove('show');
      document.body.classList.remove('fx-damage', 'screen-play', 'screen-start');
      ['modal-gameover', 'modal-wallet', 'modal-prize'].forEach(id => $(id).classList.remove('active'));
      document.body.classList.add('screen-result');
      $('result').dataset.kind = kind;
      $('result-title').innerHTML = kind === 'duplicate' ? '이미 경품 응모가<br>완료되었습니다.' : '경품 응모가<br>완료되었습니다.';
      drawResultArt(kind);
    }
    function openLink(url) { if (url) window.open(url, '_blank', 'noopener'); else notify('연결 페이지를 준비하고 있어요.'); }
    $('btn-link-saving').addEventListener('click', () => openLink(PRIZE_CONFIG.savingUrl));
    $('btn-link-welfare').addEventListener('click', () => openLink(PRIZE_CONFIG.welfareUrl));
    $('btn-result-back').addEventListener('click', () => showStart());   // 게임으로 돌아가기

    // ----- 화면 전환 -----
    function showStart() {
      game.stop();
      audio.stopBgm();
      $('bgm-icon').src = SPRITES.noteOnURL;
      toast.classList.remove('show');
      document.body.classList.remove('fx-damage');
      ['modal-gameover', 'modal-wallet', 'modal-prize'].forEach(id => $(id).classList.remove('active'));
      document.body.classList.add('screen-start');
      document.body.classList.remove('screen-play', 'screen-result');
      drawStartArt();
    }
    function beginGame() {
      audio.init();
      document.body.classList.remove('screen-start');
      document.body.classList.add('screen-play');
      renderHp(HP_MAX); lastOn = 10;
      game.start();
      audio.startBgm();
    }

    $('btn-start').addEventListener('click', beginGame);
    $('btn-wallet').addEventListener('click', openWallet);
    $('btn-go-wallet').addEventListener('click', openWallet);
    $('btn-wallet-x').addEventListener('click', closeWallet);
    $('btn-wallet-resume').addEventListener('click', closeWallet);
    $('btn-prize-apply').addEventListener('click', openPrize);
    $('btn-prize-x').addEventListener('click', closePrize);
    $('btn-prize-cancel').addEventListener('click', closePrize);
    $('btn-prize-auth').addEventListener('click', () => {
      if (PRIZE_CONFIG.authUrl) {
        // 실제 연동: 본인인증은 외부 페이지에서 처리하고(게임은 개인정보를 받지 않음),
        // 인증 후 ?page=complete(최초 응모) / ?page=duplicate(이미 응모)로 돌아오게 한다.
        window.open(PRIZE_CONFIG.authUrl, '_blank', 'noopener');
        return;
      }
      applyPrize();   // 데모: 인증 완료로 간주
    });
    $('btn-restart').addEventListener('click', (e) => {
      e.preventDefault();
      audio.init();
      $('modal-gameover').classList.remove('active');
      toast.classList.remove('show');
      renderHp(HP_MAX); lastOn = 10;
      game.start();
    });
    toast.addEventListener('click', resumeFromGift);   // 선물 카드를 눌러도 이어서 진행
    $('btn-close').addEventListener('click', showStart);   // 닫기 → 시작 화면으로
    $('btn-bgm').addEventListener('click', () => {
      $('bgm-icon').src = audio.toggleBgm() ? SPRITES.noteOnURL : SPRITES.noteOffURL;
    });

    // ----- 조작: PC 마우스 / 모바일 스와이프 / 키보드 (원본과 동일) -----
    let mouseControlOn = false;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      audio.init();
      if (resumeFromGift()) return;       // 선물 안내 중이면 클릭으로 이어서 진행
      if (!mouseControlOn) {
        mouseControlOn = true;
        const rect = canvas.getBoundingClientRect();
        game.setPaddleX(e.clientX - rect.left);
      }
      game.launchBall();
    });
    window.addEventListener('mousemove', (e) => {
      if (!mouseControlOn || game.isPaused || !game.isPlaying) return;
      const rect = canvas.getBoundingClientRect();
      game.setPaddleX(e.clientX - rect.left);
    });

    const SWIPE_SENSITIVITY = 1.3, TAP_MAX_MOVE = 8, TAP_MAX_MS = 250;
    let touchLastX = 0, touchStartX = 0, touchStartTime = 0;
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault(); audio.init();
      const t = e.touches[0];
      touchLastX = touchStartX = t.clientX; touchStartTime = performance.now();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const x = e.touches[0].clientX;
      game.movePaddleBy((x - touchLastX) * SWIPE_SENSITIVITY);
      touchLastX = x;
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const isTap = Math.abs(t.clientX - touchStartX) < TAP_MAX_MOVE && performance.now() - touchStartTime < TAP_MAX_MS;
      if (isTap && resumeFromGift()) return;   // 선물 안내 중이면 터치로 이어서 진행
      if (isTap) game.launchBall();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (document.body.classList.contains('screen-start')) return;
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      audio.init();
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') game.movePaddleLeft(true);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') game.movePaddleRight(true);
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { if (!resumeFromGift()) game.launchBall(); }
      if (e.key === 'm' || e.key === 'M') $('bgm-icon').src = audio.toggleBgm() ? SPRITES.noteOnURL : SPRITES.noteOffURL;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') game.movePaddleLeft(false);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') game.movePaddleRight(false);
    });

    window.addEventListener('resize', () => {
      game.resizeCanvas();
      if (document.body.classList.contains('screen-start')) drawStartArt();
      if (document.body.classList.contains('screen-result')) drawResultArt($('result').dataset.kind);
    });

    // 외부(본인인증 페이지 등)에서 결과 화면으로 바로 들어오는 경우: ?page=complete | ?page=duplicate
    const entry = new URLSearchParams(location.search).get('page');
    if (entry === 'complete' || entry === 'duplicate') showResult(entry);

    // 폰트 로드 후 시작 화면 일러스트 그리기
    drawStartArt();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawStartArt(); if (document.body.classList.contains('screen-result')) drawResultArt($('result').dataset.kind); });
    if (window.ResizeObserver) new ResizeObserver(() => { if (document.body.classList.contains('screen-start')) drawStartArt(); }).observe(document.querySelector('.start-col'));
  });
})();
