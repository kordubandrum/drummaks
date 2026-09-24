(function () {
  var form = document.getElementById('form');
  var F = form.elements;
  var msg = form.querySelector('.form__msg');
  var ageField = form.querySelector('.field--age');
  var stick = document.getElementById('stick');

  // Кнопка «Заказать сертификат» и другие сразу отмечают нужный пункт в форме
  document.querySelectorAll('[data-need]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = form.querySelector('input[name="need"][value="' + a.dataset.need + '"]');
      if (r) r.checked = true;
    });
  });

  // Поле возраста появляется, только если урок для ребёнка
  form.querySelectorAll('input[name="who"]').forEach(function (r) {
    r.addEventListener('change', function () {
      ageField.hidden = F.who.value !== 'Для ребёнка';
    });
  });

  // Полоска записи прячется, когда форма уже на экране
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      stick.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0.1 }).observe(document.getElementById('zayavka'));
  }

  // Шапка темнеет, как только страница прокручена
  var top = document.querySelector('.top');
  var onScroll = function () { top.classList.toggle('is-scrolled', window.scrollY > 40); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Видео на первом экране не крутится у тех, кто отключил анимацию в телефоне
  var heroVideo = document.querySelector('.hero__video');
  if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }

  // Кавер Максима со звуком открывается в окне поверх страницы
  var player = document.getElementById('player');
  var playerVideo = player.querySelector('video');
  document.querySelectorAll('[data-video]').forEach(function (b) {
    b.addEventListener('click', function () {
      playerVideo.src = b.dataset.video;
      player.setAttribute('aria-label', b.dataset.title);
      player.showModal();
      playerVideo.play();
    });
  });
  player.querySelector('.player__close').addEventListener('click', function () { player.close(); });
  player.addEventListener('click', function (e) { if (e.target === player) player.close(); });
  player.addEventListener('close', function () { playerVideo.pause(); });

  // Одновременно играет только одно видео со звуком
  document.addEventListener('play', function (e) {
    document.querySelectorAll('video[controls]').forEach(function (v) {
      if (v !== e.target) v.pause();
    });
  }, true);

  function setError(input, bad) {
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.className = 'form__msg';
    msg.textContent = '';

    var name = F.name.value.trim();
    var phoneDigits = F.phone.value.replace(/\D/g, '');
    var errors = [];

    setError(F.name, !name);
    if (!name) errors.push('имя');
    var phoneBad = phoneDigits.length < 10 || phoneDigits.length > 12;
    setError(F.phone, phoneBad);
    if (phoneBad) errors.push('телефон');
    form.querySelector('.agree').classList.toggle('is-error', !F.agree.checked);
    if (!F.agree.checked) errors.push('согласие на обработку данных');

    if (errors.length) {
      msg.classList.add('is-error');
      msg.textContent = 'Заполните: ' + errors.join(', ') + '.';
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    // Куда уходит заявка, задано в разметке формы: на бесплатном хостинге это адрес
    // приёмного скрипта, на хостинге с PHP хватит send.php рядом со страницей.
    var kuda = form.dataset.otpravka || 'send.php';
    var dannye = new URLSearchParams(new FormData(form));

    // Скрипт Google перебрасывает запрос на соседний адрес и при этом теряет POST
    // примерно в трети случаев. GET переброс переживает, поэтому туда шлём ссылкой.
    var cherezGoogle = kuda.indexOf('script.google.com') !== -1;

    // Google примерно в трети случаев не отдаёт ответ на переадресации.
    // Поэтому пробуем до трёх раз; номер заявки не даёт ей задвоиться.
    dannye.set('nomer', Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

    function poslat() {
      return cherezGoogle
        ? fetch(kuda + '?' + dannye.toString(), { method: 'GET' })
        : fetch(kuda, { method: 'POST', body: dannye });
    }

    function popytka(ostalos) {
      return poslat()
        .then(function (r) { return r.text(); })
        .then(function (t) {
          var o = {};
          try { o = JSON.parse(t); } catch (e) { o = {}; }
          if (o.ok === true) return true;
          if (o.ok === false) return false;      // заявку не приняли, повтор не поможет
          throw new Error('нет ответа');
        })
        .catch(function (e) {
          if (ostalos <= 0) throw e;
          return new Promise(function (r) { setTimeout(r, 1500); }).then(function () {
            return popytka(ostalos - 1);
          });
        });
    }

    var zapros = popytka(2);

    // Google отвечает медленно, до полуминуты. Человеку об этом говорим,
    // чтобы он не решил, что сайт завис, и не ушёл.
    var dolgo = setTimeout(function () {
      if (msg.textContent) return;
      msg.textContent = 'Отправляем заявку. Иногда это занимает до полуминуты, не закрывайте страницу.';
    }, 4000);

    var pozdno = setTimeout(function () { zavershit(false); }, 90000);
    var gotovo = false;

    function zavershit(uspeh) {
      if (gotovo) return;
      gotovo = true;
      clearTimeout(dolgo);
      clearTimeout(pozdno);
      msg.className = 'form__msg';
      if (uspeh) {
        form.reset();
        ageField.hidden = true;
        msg.classList.add('is-ok');
        msg.textContent = 'Заявка отправлена. Максим свяжется с вами в течение дня.';
        btn.textContent = 'Заявка отправлена';
      } else {
        msg.classList.add('is-error');
        msg.innerHTML = 'Заявка не отправилась. Позвоните или напишите в телеграм: <a href="tel:+79883983442">+7 988 398-34-42</a>.';
        btn.disabled = false;
        btn.textContent = 'Отправить заявку';
      }
    }

    zapros
      .then(function (uspeh) { zavershit(uspeh); })
      .catch(function () { zavershit(false); });
  });
})();

/* Кнопка «на раздел выше»: одно нажатие — один экран смысла, а не прыжок в самый верх */
(function () {
  var knopka = document.getElementById('vverh');
  if (!knopka) return;
  var razdely = Array.prototype.slice.call(document.querySelectorAll('section'));
  var tiho = window.matchMedia('(prefers-reduced-motion: reduce)');

  function shapka() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--shapka');
    return parseInt(v, 10) || 0;
  }

  knopka.addEventListener('click', function () {
    var seychas = window.scrollY;
    var verh = shapka();
    var tochki = [0];
    razdely.forEach(function (r) {
      tochki.push(Math.max(0, Math.round(r.getBoundingClientRect().top + seychas - verh)));
    });
    tochki.sort(function (a, b) { return a - b; });
    var cel = 0;
    tochki.forEach(function (t) { if (t < seychas - 4) cel = t; });
    window.scrollTo({ top: cel, behavior: tiho.matches ? 'auto' : 'smooth' });
  });

  function vidna() { knopka.classList.toggle('is-on', window.scrollY > 320); }
  window.addEventListener('scroll', vidna, { passive: true });
  vidna();
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
