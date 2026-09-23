/* Живая установка на странице: барабаны звучат прямо в браузере.
   Звук синтезируется, файлов с записями нет — сайт от этого не тяжелеет. */
(function () {
  var svg = document.querySelector('.groove');
  var notes = svg ? svg.querySelectorAll('.n') : [];
  var playBtn = document.getElementById('beat');
  var kit = document.querySelector('.kit');
  var zony = document.querySelectorAll('.kit__zona');
  if (!playBtn || !notes.length) return;

  // Тот же рисунок, что нарисован нотами: 2 такта по 8 восьмых
  var PATTERN = [
    { hh: 1, sn: 0, bd: 1 }, { hh: 1 }, { hh: 1, sn: 1 }, { hh: 1 },
    { hh: 1, bd: 1 }, { hh: 1 }, { hh: 1, sn: 1 }, { hh: 1 },
    { hh: 1, bd: 1 }, { hh: 1 }, { hh: 1, sn: 1 }, { hh: 1 },
    { hh: 1, bd: 1 }, { hh: 1, bd: 1 }, { hh: 1, sn: 1 }, { hh: 1 }
  ];
  var BPM = 92;
  var STEP = 30 / BPM; // длительность восьмой в секундах

  var ctx = null, noise = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var len = Math.floor(ctx.sampleRate * 2); // хватает на долгий крэш
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.36);
  }

  function snare(t) {
    var s = ctx.createBufferSource(); s.buffer = noise;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    s.connect(bp).connect(g).connect(ctx.destination);
    s.start(t); s.stop(t + 0.2);

    var o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(190, t);
    og.gain.setValueAtTime(0.35, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og).connect(ctx.destination);
    o.start(t); o.stop(t + 0.13);
  }

  // Тарелка: шум в верхних частотах, разница только в срезе, громкости и длине затухания
  function cymbal(cut, dur, vol) {
    return function (t) {
      var s = ctx.createBufferSource(); s.buffer = noise;
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = cut;
      var pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 9000; pk.gain.value = 5;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(hp).connect(pk).connect(g).connect(ctx.destination);
      s.start(t); s.stop(t + dur + 0.02);
    };
  }

  var hat = cymbal(7200, 0.055, 0.22);
  var openhat = cymbal(6800, 0.42, 0.2);
  var crash = cymbal(3600, 1.6, 0.3);

  function ride(t) {
    cymbal(5200, 0.9, 0.14)(t);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(3100, t);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.25);
  }

  // Том: тон уходит вниз, сверху короткий щелчок пластика
  function tom(freq) {
    return function (t) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * 1.7, t);
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.07);
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.52);

      var s = ctx.createBufferSource(); s.buffer = noise;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 3; bp.Q.value = 1;
      var ng = ctx.createGain();
      ng.gain.setValueAtTime(0.16, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      s.connect(bp).connect(ng).connect(ctx.destination);
      s.start(t); s.stop(t + 0.08);
    };
  }

  var splash = cymbal(5000, 0.5, 0.24);
  var china = cymbal(2500, 0.9, 0.3);

  var voice = {
    bd: kick, sn: snare, hh: hat, oh: openhat,
    t1: tom(250), t2: tom(200), t3: tom(160), ft: tom(105),
    cr: crash, rd: ride, sp: splash, ch: china
  };

  function hit(name, at) {
    if (!voice[name] || !audio()) return;
    voice[name](at === undefined ? ctx.currentTime : at);
  }

  function flash(el) {
    if (!el) return;
    el.classList.remove('is-hit');
    void el.getBoundingClientRect();
    el.classList.add('is-hit');
  }

  // Открытый хай-хэт двигает ту же тарелку, что и закрытый
  function part(name) {
    return document.querySelector('.kit__part[data-part="' + (name === 'oh' ? 'hh' : name) + '"]');
  }

  // Удар по установке: мышь, палец, клавиатура
  var keys = {
    ' ': 'bd',
    'f': 'sn', 'а': 'sn',
    's': 'hh', 'ы': 'hh',
    'd': 'oh', 'в': 'oh',
    'a': 'cr', 'ф': 'cr',
    'q': 'sp', 'й': 'sp',
    'w': 'ch', 'ц': 'ch',
    'g': 'rd', 'п': 'rd',
    'j': 't1', 'о': 't1',
    'k': 't2', 'л': 't2',
    'l': 't3', 'д': 't3',
    ';': 'ft', 'ж': 'ft'
  };
  zony.forEach(function (z) {
    var name = z.getAttribute('data-drum');
    z.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      hit(name); flash(part(name));
    });
    z.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(name); flash(part(name)); }
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.matches && e.target.matches('input, textarea, button, a, select, summary')) return;
    if (e.target.closest && e.target.closest('.kit__zona')) return; // по этому барабану уже ударили
    var name = keys[e.key.toLowerCase()];
    if (!name) return;
    e.preventDefault();
    hit(name);
    flash(part(name));
  });

  // Подписи клавиш прячутся, пока их не попросят: установка должна оставаться чистой
  var keysBtn = document.querySelector('.kit__keys');
  if (keysBtn && kit) {
    keysBtn.addEventListener('click', function () {
      var on = kit.classList.toggle('is-keys');
      keysBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      keysBtn.textContent = on ? 'Скрыть клавиши' : 'Показать клавиши';
    });
  }

  // Ритм целиком: расписание вперёд, чтобы доли не плавали
  var playing = false, step = 0, nextTime = 0, timer = null;
  function schedule() {
    while (nextTime < ctx.currentTime + 0.12) {
      var s = PATTERN[step % PATTERN.length];
      if (s.hh) hat(nextTime);
      if (s.sn) snare(nextTime);
      if (s.bd) kick(nextTime);
      (function (i, when, doli) {
        setTimeout(function () {
          notes.forEach(function (n) { n.classList.remove('is-on'); });
          if (!playing) return;
          notes[i].classList.add('is-on');
          if (doli.hh) flash(part('hh'));
          if (doli.sn) flash(part('sn'));
          if (doli.bd) flash(part('bd'));
        }, Math.max(0, (when - ctx.currentTime) * 1000));
      })(step % PATTERN.length, nextTime, s);
      nextTime += STEP;
      step++;
    }
  }
  function start() {
    if (!audio()) return;
    playing = true;
    step = 0;
    nextTime = ctx.currentTime + 0.08;
    playBtn.textContent = 'Остановить';
    playBtn.setAttribute('aria-pressed', 'true');
    svg.classList.add('is-playing');
    schedule();
    timer = setInterval(schedule, 25);
  }
  function stop() {
    playing = false;
    clearInterval(timer);
    playBtn.textContent = 'Включить ритм';
    playBtn.setAttribute('aria-pressed', 'false');
    svg.classList.remove('is-playing');
    notes.forEach(function (n) { n.classList.remove('is-on'); });
  }
  playBtn.addEventListener('click', function () { playing ? stop() : start(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) stop(); });
})();

/* Видео первого экрана: на телефон уходит лёгкая вертикальная версия (0,7 МБ вместо 2,5) */
(function () {
  var v = document.querySelector('.hero__video');
  if (!v) return;
  var narrow = window.matchMedia('(max-width: 759px)').matches;
  if (!narrow && v.dataset.posterWide) v.poster = v.dataset.posterWide;
  var src = narrow ? v.dataset.narrow : v.dataset.wide;
  var tiho = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var save = navigator.connection && navigator.connection.saveData;
  if (!src || tiho || save) return; // остаётся кадр-заставка
  var el = document.createElement('source');
  el.src = src; el.type = 'video/mp4';
  v.appendChild(el);
  v.load();
  var go = v.play();
  if (go && go.catch) go.catch(function () {});
})();

/* Появление блоков при прокрутке и лёгкое движение видео на первом экране */
(function () {
  var tiho = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reveals = document.querySelectorAll('.reveal');

  if (tiho.matches || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  reveals.forEach(function (el) { io.observe(el); });

  var bg = document.querySelector('.hero__bg');
  var hero = document.querySelector('.hero');
  if (!bg || !hero) return;
  var tick = false;
  window.addEventListener('scroll', function () {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (y < hero.offsetHeight) {
        bg.style.transform = 'translate3d(0,' + (y * 0.16) + 'px,0) scale(' + (1.1 + y / 12000) + ')';
      }
      tick = false;
    });
  }, { passive: true });
})();
