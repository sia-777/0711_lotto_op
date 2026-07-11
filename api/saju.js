// Vercel Serverless Function — 사주 분석 + 로또 번호 추천
// API 키는 브라우저에 노출되지 않고, 이 서버 함수에서만 사용됩니다.
// 필요한 환경변수 (Vercel → Settings → Environment Variables):
//   OPENAI_API_KEY  (필수)
//   OPENAI_MODEL    (선택, 기본값 gpt-5.4-mini)

const SYSTEM_ANALYZE = `당신은 따뜻하고 재치있는 사주명리학 분석가입니다.
사용자의 생년월일과 태어난 시간을 바탕으로 사주를 재미있게 풀이하고, 오늘의 기운에 어울리는 로또 번호를 추천합니다.
반드시 아래 JSON 형식으로만 답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "saju": "사주 풀이 2~3문장 (오행/기운을 친근하게, 한국어)",
  "advice": "오늘의 운세 한 줄 (한국어)",
  "numbers": [1~45 사이 서로 다른 정수 6개],
  "bonus": 1~45 사이 정수 1개 (numbers와 겹치지 않게)
}

주의: 사주 풀이는 재미를 위한 것이며 미래를 보장하지 않는다는 톤을 유지하되, 문장 안에서 지나치게 부정적이거나 단정적인 예언은 피하세요.`;

const SYSTEM_CHAT = `당신은 따뜻하고 재치있는 사주명리학 챗봇입니다.
한국어로 2~4문장 이내로 간결하게 답하세요. 사주는 재미를 위한 해석임을 자연스럽게 전제하고, 필요하면 로또 번호(1~45)를 제안해도 좋습니다.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 지원합니다.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 추가하세요.' });
    return;
  }
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};
  const mode = body.mode === 'chat' ? 'chat' : 'analyze';

  try {
    if (mode === 'analyze') {
      const info = [
        `생년월일: ${body.birthDate || '미입력'}`,
        `달력: ${body.calendar || '양력'}`,
        `태어난 시간: ${body.birthTime || '모름'}`,
        `성별: ${body.gender || '미입력'}`
      ].join('\n');

      const content = await callOpenAI(apiKey, model, [
        { role: 'system', content: SYSTEM_ANALYZE },
        { role: 'user', content: info }
      ], true);

      const parsed = safeJson(content);
      res.status(200).json(normalize(parsed));
    } else {
      const history = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
      const content = await callOpenAI(apiKey, model, [
        { role: 'system', content: SYSTEM_CHAT },
        ...history
      ], false);
      res.status(200).json({ reply: content });
    }
  } catch (e) {
    res.status(502).json({ error: '분석 중 오류가 발생했어요: ' + (e.message || '알 수 없는 오류') });
  }
};

async function callOpenAI(apiKey, model, messages, jsonMode) {
  const payload = { model, messages };
  if (jsonMode) payload.response_format = { type: 'json_object' };

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI ${r.status} — ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
}

function safeJson(text) {
  if (!text) return {};
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return {};
}

// 모델 응답을 신뢰하지 않고 서버에서 번호 유효성 보정 (1~45, 중복 제거, 6개 + 보너스)
function normalize(parsed) {
  let nums = Array.isArray(parsed.numbers)
    ? parsed.numbers.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 45)
    : [];
  nums = [...new Set(nums)];
  while (nums.length < 6) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!nums.includes(n)) nums.push(n);
  }
  nums = nums.slice(0, 6).sort((a, b) => a - b);

  let bonus = Number(parsed.bonus);
  if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45 || nums.includes(bonus)) {
    do { bonus = Math.floor(Math.random() * 45) + 1; } while (nums.includes(bonus));
  }

  return {
    saju: typeof parsed.saju === 'string' ? parsed.saju : '사주 풀이를 불러오지 못했어요.',
    advice: typeof parsed.advice === 'string' ? parsed.advice : '',
    numbers: nums,
    bonus
  };
}
