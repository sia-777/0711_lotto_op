// Vercel Serverless Function — 저장된 로그 조회 (관리자 전용)
// 보호: ADMIN_TOKEN 환경변수와 요청의 x-admin-token 헤더가 일치해야 함.
// 환경변수:
//   ADMIN_TOKEN                 (필수) 관리자 접근 토큰
//   SUPABASE_URL                (필수)
//   SUPABASE_SERVICE_ROLE_KEY   (필수)
//   SUPABASE_TABLE              (선택, 기본 saju_logs)
//   SUPABASE_CHAT_TABLE         (선택, 기본 chat_logs)

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET 요청만 지원합니다.' });
    return;
  }

  const admin = process.env.ADMIN_TOKEN;
  if (!admin) {
    res.status(503).json({ error: 'ADMIN_TOKEN 환경변수가 설정되지 않아 조회가 비활성화되어 있습니다.' });
    return;
  }
  const token = req.headers['x-admin-token'] || (req.query && req.query.token) || '';
  if (token !== admin) {
    res.status(401).json({ error: '관리자 인증에 실패했습니다.' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' });
    return;
  }

  const q = req.query || {};
  const type = q.type === 'chat' ? 'chat' : 'saju';
  const table = type === 'chat'
    ? (process.env.SUPABASE_CHAT_TABLE || 'chat_logs')
    : (process.env.SUPABASE_TABLE || 'saju_logs');

  // 날짜 범위 필터 (YYYY-MM-DD). PostgREST 는 같은 컬럼에 여러 조건을 AND 로 처리.
  const filters = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.from || '')) filters.push(`created_at=gte.${q.from}T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(q.to || '')) filters.push(`created_at=lte.${q.to}T23:59:59`);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 500, 1), 1000);
  const query = ['select=*', 'order=created_at.desc', 'limit=' + limit, ...filters].join('&');

  try {
    const r = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data).slice(0, 300));
    res.status(200).json({ rows: Array.isArray(data) ? data : [] });
  } catch (e) {
    res.status(502).json({ error: '조회 중 오류: ' + (e.message || '알 수 없는 오류') });
  }
};
