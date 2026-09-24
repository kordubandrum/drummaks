// Приём заявки с сайта и пересылка её Максиму в телеграм.
//
// Работает на Vercel: GitHub Pages умеет отдавать только готовые файлы,
// а заявку нужно принять и передать боту. Токен бота и номер чата лежат
// в настройках проекта на Vercel (переменные TG_TOKEN и TG_CHAT_ID),
// в код и в git они не попадают.

const POLYA = {
  name: 60,
  phone: 30,
  need: 40,
  who: 20,
  age: 3,
  time: 30,
  contact: 20
};

// Заявки с одного адреса чаще, чем раз в 20 секунд, не пропускаем:
// живой человек столько не печатает, а бот попробует.
const nedavnie = new Map();
const PAUZA = 20000;

function chistoe(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const body = req.body || {};

  // Ловушка для ботов: это поле человек не видит и не заполняет
  if (chistoe(body.website, 100)) return res.status(200).json({ ok: true });

  const d = {};
  for (const [klyuch, max] of Object.entries(POLYA)) d[klyuch] = chistoe(body[klyuch], max);

  const cifry = d.phone.replace(/\D/g, '');
  if (!d.name || cifry.length < 10 || cifry.length > 12) {
    return res.status(400).json({ ok: false, error: 'fields' });
  }
  if (!body.agree) return res.status(400).json({ ok: false, error: 'agree' });

  const adres = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'неизвестно';
  const teper = Date.now();
  for (const [k, v] of nedavnie) if (teper - v > PAUZA) nedavnie.delete(k);
  if (nedavnie.has(adres)) return res.status(429).json({ ok: false, error: 'often' });

  const token = process.env.TG_TOKEN;
  const chat = process.env.TG_CHAT_ID;
  if (!token || !chat) return res.status(500).json({ ok: false, error: 'config' });

  const rebenok = d.who === 'Для ребёнка' && d.age ? `, ${d.age} лет` : '';
  const text = [
    'Заявка с сайта DrumMaks',
    '',
    `Имя: ${d.name}`,
    `Телефон: ${d.phone}`,
    `Интересует: ${d.need || 'не указано'}`,
    `Для кого: ${d.who || 'не указано'}${rebenok}`,
    `Удобно: ${d.time || 'не указано'}`,
    `Связаться: ${d.contact || 'не указано'}`
  ].join('\n');

  try {
    const otvet = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true })
    });
    if (!otvet.ok) {
      const prichina = await otvet.text();
      console.error('Телеграм не принял заявку:', otvet.status, prichina.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'telegram' });
    }
  } catch (e) {
    console.error('Телеграм недоступен:', e && e.message);
    return res.status(502).json({ ok: false, error: 'telegram' });
  }

  nedavnie.set(adres, teper);
  return res.status(200).json({ ok: true });
};
