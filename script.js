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

    fetch('send.php', { method: 'POST', body: new FormData(form) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || 'fail');
        form.reset();
        ageField.hidden = true;
        msg.classList.add('is-ok');
        msg.textContent = 'Заявка отправлена. Максим свяжется с вами в течение дня.';
        btn.textContent = 'Заявка отправлена';
      })
      .catch(function () {
        msg.classList.add('is-error');
        msg.innerHTML = 'Заявка не отправилась. Позвоните или напишите в телеграм: <a href="tel:+79883983442">+7 988 398-34-42</a>.';
        btn.disabled = false;
        btn.textContent = 'Отправить заявку';
      });
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
