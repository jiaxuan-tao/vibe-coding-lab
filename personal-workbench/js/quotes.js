// Public quote responses are parsed as data, never executed as remote scripts.
import { store } from './store.js';
// 用法：fetchQuotes(['sh600519','hk00700','usAAPL']) -> { quotes: {code: quote|null}, offline: bool }
// 真实数据格式（2026-09 实测）：
//   window.v_<code> 的值就是 ~ 分隔的内容本体，不含 v_="..." 包装
//   通用：1=名称 2=代码 3=现价 4=昨收 5=今开 6=成交量
//   时间戳字段：A股=31(yyyyMMddHHmmss)，港股/美股=30("2026/09/07 11:33:20" / "2026-09-04 16:00:01")
//   时间戳之后依次为：+1=涨跌额 +2=涨跌幅% +3=最高 +4=最低
//   美股查询代码不带交易所后缀：usAAPL（不是 usAAPL.OQ）

const CACHE_KEY = 'vcl.personal-workbench.quotes';
const TIMEOUT = 9000;

function marketOf(code) {
  const c = code.toLowerCase();
  if (c.startsWith('hk')) return 'hk';
  if (c.startsWith('us')) return 'us';
  return 'a'; // sh / sz / bj，含指数
}

/** 找到时间戳字段下标（A股 yyyyMMddHHmmss；港/美股带日期分隔符），找不到返回 -1 */
function tsIndex(p) {
  for (let i = 29; i < Math.min(p.length, 40); i++) {
    const s = p[i];
    if (/^\d{14}$/.test(s) || /\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}/.test(s)) return i;
  }
  return -1;
}

/** 容错解析单只行情 */
export function parseQuote(code, raw) {
  if (!raw || typeof raw !== 'string') return null;
  let body = raw.trim();
  // 兼容带 v_xxx="..." 包装的历史/测试数据
  const q1 = body.indexOf('"'), q2 = body.lastIndexOf('"');
  if (q1 >= 0 && q2 > q1) body = body.slice(q1 + 1, q2);
  if (!body || /none_match/i.test(body)) return null;
  const p = body.split('~');
  if (p.length < 5) return null;
  const m = marketOf(code);
  const f = i => (i < p.length ? p[i] : '');
  const n = i => { const x = parseFloat(f(i)); return Number.isFinite(x) ? x : null; };

  const q = {
    name: f(1) || code, code: f(2) || code,
    price: n(3), prev: n(4), open: n(5), vol: n(6),
    chg: null, pct: null, high: null, low: null, amt: null,
  };
  const ti = tsIndex(p);
  if (ti >= 0) {
    q.chg = n(ti + 1); q.pct = n(ti + 2);
    q.high = n(ti + 3); q.low = n(ti + 4);
    q.amt = n(m === 'a' ? 38 : 37);
  }
  if (q.price == null || !q.name) return null;
  if ((q.pct == null || q.chg == null) && q.prev && q.prev !== 0) {
    q.chg = q.price - q.prev;
    q.pct = q.chg / q.prev * 100;
  }
  q.market = m;
  q.ts = Date.now();
  return q;
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}
function writeCache(quotes) {
  const c = readCache();
  for (const [k, v] of Object.entries(quotes)) if (v) c[k] = v;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

/**
 * 批量拉行情。失败/超时自动降级为本地缓存（offline=true）。
 * 返回 { quotes, offline }，quotes 中每只可能是 null。
 */
export function fetchQuotes(codes) {
  const uniq = [...new Set(codes.filter(Boolean).map(c => {
    c = c.trim();
    // 美股：保留代码大小写、去掉交易所后缀（usAAPL.OQ -> usAAPL），变量名与查询代码一致
    if (/^us/i.test(c)) return 'us' + c.slice(2).toUpperCase().split('.')[0];
    return c.toLowerCase();
  }))];
  if (!uniq.length) return Promise.resolve({ quotes: {}, offline: false });

  return new Promise(resolve => {
    const cache = readCache();
    const fromCache = () => {
      const quotes = {};
      uniq.forEach(c => { quotes[c] = cache[c] ? { ...cache[c], cached: true } : null; });
      return { quotes, offline: true };
    };

    if (!store.data.settings.quotesEnabled) return resolve(fromCache());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    fetch('https://qt.gtimg.cn/q=' + uniq.map(encodeURIComponent).join(',') + '&_t=' + Date.now(), {signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'})
      .then(async response => {
      if (!response.ok) throw new Error('Quote source unavailable');
      const text = new TextDecoder('gbk').decode(await response.arrayBuffer());
      const quotes = {};
      let any = false;
      for (const c of uniq) {
        const line = text.split(/\r?\n/).find(line => line.trim().startsWith('v_' + c + '='));
        const raw = line?.match(/="([^"]*)"/)?.[1];
        const q = parseQuote(c, raw);
        quotes[c] = q;
        if (q) any = true;
      }
      if (!any) return resolve(fromCache());
      writeCache(quotes);
      resolve({ quotes, offline: false });
    }).catch(() => resolve(fromCache())).finally(() => clearTimeout(timer));
  });
}

/** 代码规范化：6 位纯数字自动补交易所前缀；美股自动补 us 前缀并去交易所后缀 */
export function normCode(input) {
  const raw = (input || '').trim();
  if (!raw) return '';
  const c = raw.toLowerCase();
  if (c.startsWith('us')) return 'us' + raw.slice(2).toUpperCase().split('.')[0];
  if (/^(sh|sz|bj|hk)/.test(c)) return c;
  if (/^\d{6}$/.test(c)) {
    if (c.startsWith('6') || c.startsWith('9')) return 'sh' + c;
    if (c.startsWith('4') || c.startsWith('8')) return 'bj' + c;
    return 'sz' + c;
  }
  // 纯字母（可带点后缀）视为美股代码，如 AAPL / aapl.oq -> usAAPL
  if (/^[a-z]+(\.[a-z]{1,4})?$/i.test(raw)) return 'us' + raw.toUpperCase().split('.')[0];
  return c;
}
