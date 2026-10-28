// ============ 综合信息面板（所选城市天气 / 热榜新闻 / 快捷网址） ============
import { el, icon, viewHead, cardTitle, fmtHM } from '../util.js';
import { safeUrl } from '../validation.js';
import { store, isDemo } from '../store.js';
import { CITIES } from '../weather.js';
import { publicSnapshot } from '../public-snapshot.js';

// ---- 天气代码映射（WMO weathercode）----
function weatherInfo(code) {
  const M = {
    0: ['晴', '☀️'], 1: ['大部晴朗', '🌤️'], 2: ['多云', '⛅'], 3: ['阴', '☁️'],
    45: ['雾', '🌫️'], 48: ['冻雾', '🌫️'],
    51: ['小毛毛雨', '🌦️'], 53: ['毛毛雨', '🌦️'], 55: ['浓毛毛雨', '🌧️'],
    56: ['冻毛毛雨', '🌧️'], 57: ['冻毛毛雨', '🌧️'],
    61: ['小雨', '🌧️'], 63: ['中雨', '🌧️'], 65: ['大雨', '🌧️'],
    66: ['冻雨', '🌧️'], 67: ['冻雨', '🌧️'],
    71: ['小雪', '🌨️'], 73: ['中雪', '❄️'], 75: ['大雪', '❄️'], 77: ['雪粒', '❄️'],
    80: ['小阵雨', '🌦️'], 81: ['阵雨', '🌦️'], 82: ['强阵雨', '⛈️'],
    85: ['阵雪', '🌨️'], 86: ['强阵雪', '🌨️'],
    95: ['雷阵雨', '⛈️'], 96: ['雷阵雨伴冰雹', '⛈️'], 99: ['雷阵雨伴冰雹', '⛈️'],
  };
  return M[code] || ['未知', '🌡️'];
}

async function loadWeather(box) {
  const city = CITIES[store.data.settings.weatherCity];
  if (!city) {
    box.replaceChildren(el('div',{class:'empty'},'尚未选择天气城市',el('button',{class:'btn btn-sm',style:'margin-top:12px',onclick:()=>document.dispatchEvent(new CustomEvent('wb:nav',{detail:'settings'}))},'选择城市')));
    return;
  }
  box.textContent = '正在获取' + city.name + '天气…';
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=3`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const cur = j.current;
    const [wText, wIcon] = weatherInfo(cur.weather_code);
    box.innerHTML = '';
    box.append(
      el('div', { class: 'weather-now' },
        el('span', { class: 'ic' }, wIcon),
        el('div', {},
          el('div', { class: 'tp num' }, Math.round(cur.temperature_2m) + '°'),
          el('div', { class: 'muted', style: 'font-size:13px' }, `${city.name} · ${wText}`)),
        el('div', { class: 'tiny muted', style: 'line-height:1.9' },
          el('div', { class: 'num' }, `湿度 ${cur.relative_humidity_2m}%`),
          el('div', { class: 'num' }, `风速 ${cur.wind_speed_10m} km/h`)),
        el('button', {
          class: 'icon-btn', title: '刷新天气', style: 'margin-left:auto',
          onclick: () => loadWeather(box)
        }, icon('refresh', 16))),
      el('div', { class: 'forecast' }, j.daily.time.map((day, i) => {
        const [t, ic] = weatherInfo(j.daily.weather_code[i]);
        const dd = new Date(day + 'T00:00:00');
        const label = i === 0 ? '今天' : `${dd.getMonth() + 1}/${dd.getDate()}`;
        return el('div', { class: 'fc' },
          el('div', { class: 'muted' }, label),
          el('div', { style: 'font-size:20px;margin:4px 0' }, ic),
          el('div', { class: 'tiny muted' }, t),
          el('div', { class: 'num', style: 'font-weight:600;margin-top:2px' },
            `${Math.round(j.daily.temperature_2m_min[i])}° / ${Math.round(j.daily.temperature_2m_max[i])}°`));
      }))
    );
  } catch (e) {
    box.innerHTML = '';
    box.append(el('div', { class: 'empty' },
      el('span', { class: 'em-icon' }, '🌥️'),
      '天气暂时加载失败（可能是网络问题）',
      el('div', { class: 'em-hint' },
        el('button', { class: 'btn btn-sm', style: 'margin-top:8px', onclick: () => loadWeather(box) }, '重试'))));
  }
}

// ---- 新闻热榜（多源尝试，失败降级为入口卡片）----
const NEWS_SOURCES = [
  { name: '微博热搜', url: 'https://60s.viki.moe/v2/weibo', pick: j => (j.data || []).slice(0, 10).map(i => ({ title: i.title, link: i.link || i.url || 'https://weibo.com/hot/search' })) },
  { name: '知乎热榜', url: 'https://60s.viki.moe/v2/zhihu', pick: j => (j.data || []).slice(0, 10).map(i => ({ title: i.title, link: i.url || 'https://www.zhihu.com/billboard' })) },
  { name: '百度热点', url: 'https://60s.viki.moe/v2/baidu/hot', pick: j => (j.data || []).slice(0, 10).map(i => ({ title: i.title || i.word, link: i.url || i.link || 'https://top.baidu.com/board' })) },
];

const NEWS_ENTRIES = [
  { name: '财联社', url: 'https://www.cls.cn', icon: '📈', desc: '7×24 财经快讯' },
  { name: '新浪财经', url: 'https://finance.sina.com.cn', icon: '💹', desc: '综合财经资讯' },
  { name: '36氪', url: 'https://36kr.com', icon: '🚀', desc: '科技与创投' },
  { name: '知乎热榜', url: 'https://www.zhihu.com/billboard', icon: '🔥', desc: '全网热议话题' },
];

async function loadNews(box) {
  box.innerHTML = '<div class="muted tiny" style="padding:10px 0">正在获取热榜…</div>';
  for (const src of NEWS_SOURCES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(src.url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const j = await res.json();
      const items = src.pick(j).filter(i => typeof i.title==='string' && safeUrl(i.link)).slice(0,10);
      if (!items.length) continue;
      box.innerHTML = '';
      box.append(
        el('div', { class: 'tiny muted', style: 'margin-bottom:6px;display:flex;justify-content:space-between' },
          el('span', {}, `来源：${src.name} · ${fmtHM(Date.now())}`),
          el('button', { class: 'icon-btn', title: '刷新', onclick: () => loadNews(box) }, icon('refresh', 14))),
        el('div', {}, items.map((it, i) => el('div', { class: 'news-item' },
          el('span', { class: 'no num' }, String(i + 1)),
          el('a', { href: safeUrl(it.link), target: '_blank', rel: 'noopener noreferrer' }, it.title)))));
      return;
    } catch { /* 尝试下一个源 */ }
  }
  // 全部失败 → 优雅降级为新闻入口卡片
  box.innerHTML = '';
  box.append(
    el('div', { class: 'tiny muted', style: 'margin-bottom:10px' }, '热榜暂时拉取失败，可直接访问这些新闻入口：'),
    el('div', { class: 'grid grid-2' }, NEWS_ENTRIES.map(n => el('a', { class: 'link-card', href: n.url, target: '_blank', rel: 'noopener' },
      el('span', { class: 'lk', style: 'background:var(--accent-dim)' }, n.icon),
      el('div', {}, el('div', {}, n.name), el('div', { class: 'tiny muted', style: 'font-weight:400' }, n.desc))))));
}

const QUICK_LINKS = [
  { name: 'B站', url: 'https://www.bilibili.com', icon: '📺', bg: 'rgba(0,161,214,.15)' },
  { name: '知识星球', url: 'https://wx.zsxq.com', icon: '🪐', bg: 'rgba(52,211,153,.15)' },
  { name: '抖音', url: 'https://www.douyin.com', icon: '🎵', bg: 'rgba(244,63,94,.12)' },
];

function renderSnapshot(root) {
  const { weather, articles, collectedOn } = publicSnapshot;
  const { current, daily } = weather.raw;
  const [description, symbol] = weatherInfo(current.weather_code);
  root.append(
    viewHead('信息面板', '公开资料与产品观察'),
    el('div', { class: 'grid grid-2' },
      el('section', { class: 'card' }, cardTitle('cloud', '武汉 · 天气快照'),
        el('div', { class: 'weather-now' }, el('span', { class: 'ic' }, symbol),
          el('div', {}, el('div', { class: 'tp num' }, `${current.temperature_2m}°`), el('div', { class: 'muted' }, description)),
          el('div', { class: 'tiny muted' }, el('div', {}, `湿度 ${current.relative_humidity_2m}%`), el('div', {}, `风速 ${current.wind_speed_10m} km/h`))),
        el('div', { class: 'forecast' }, daily.time.map((date, i) => {
          const [text, symbol] = weatherInfo(daily.weather_code[i]);
          return el('div', { class: 'fc' }, el('div', { class: 'muted' }, date.slice(5).replace('-', '/')),
            el('div', { style: 'font-size:20px;margin:4px 0' }, symbol), el('div', { class: 'tiny muted' }, text),
            el('div', { class: 'num' }, `${daily.temperature_2m_min[i]}° / ${daily.temperature_2m_max[i]}°`));
        })),
        el('div', { class: 'snapshot-meta', style: 'margin-top:14px' },
          el('div', {}, `模型数据时间：${current.time.replace('T', ' ')} · 北京时间`),
          el('div', {}, `采集：${weather.collectedOn} · 非实时 · 未来日期为预报`),
          el('a', { href: weather.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, '来源：Open-Meteo'))),
      el('section', { class: 'card' }, cardTitle('note', '阅读关注'),
        el('h2', { class: 'reading-focus-title' }, '从能力发布，到可交付的工作流'),
        el('div', { class: 'reading-focus-list' },
          el('div', {}, el('span', { class: 'tag' }, '协作'), el('span', {}, '自动化归属谁，离队后谁接手？')),
          el('div', {}, el('span', { class: 'tag' }, '权限'), el('span', {}, '哪些步骤自动继续，哪些必须确认？')),
          el('div', {}, el('span', { class: 'tag' }, '评测'), el('span', {}, '工具参数、失败恢复是否可复现？'))),
        el('div', { class: 'snapshot-meta' }, `${articles.length} 条官方资料 · ${collectedOn} 采集`),
        el('div', { class: 'tiny muted', style: 'margin-top:6px' }, '下方“观察”是独立解读，不是官方结论。'))),
    el('section', { class: 'snapshot-articles' },
      el('div', { class: 'snapshot-heading' }, el('h2', {}, 'AI 资讯 · 资料快照'), el('span', { class: 'tiny muted' }, '原始发布日期 · 非实时更新')),
      articles.map(a => el('article', { class: 'snapshot-article' },
        el('div', { class: 'tiny muted' }, `${a.category} · ${a.source} · 发布于 ${a.publishedOn}`),
        el('h3', {}, el('a', { href: safeUrl(a.url), target: '_blank', rel: 'noopener noreferrer' }, a.title, ' ↗')),
        el('p', {}, a.summary),
        el('p', { class: 'snapshot-observation' }, el('strong', {}, '观察 · '), a.observation)))),
  );
}

export function render(root) {
  if (isDemo) return renderSnapshot(root);
  const weatherBox = el('div', {});
  const newsBox = el('div', {});
  root.append(
    viewHead('信息面板', '天气、热榜、常用网站，一屏看完'),
    el('div', { class: 'grid grid-2' },
      el('div', { class: 'card' }, cardTitle('cloud', '天气'), weatherBox,el('a',{href:'https://open-meteo.com/',target:'_blank',rel:'noopener noreferrer',class:'tiny muted',style:'display:inline-block;margin-top:12px'},'天气数据：Open-Meteo')),
      el('div', { class: 'card' }, cardTitle('grid', '实时热榜'), newsBox)),
    el('div', { style: 'height:16px' }),
    el('div', { class: 'card' },
      cardTitle('link', '快捷网址'),
      el('div', { class: 'link-cards' }, QUICK_LINKS.map(l => el('a', { class: 'link-card', href: l.url, target: '_blank', rel: 'noopener' },
        el('span', { class: 'lk', style: `background:${l.bg}` }, l.icon),
        l.name, el('span', { class: 'tiny muted', style: 'margin-left:auto' }, '↗')))))
  );
  loadWeather(weatherBox);
  loadNews(newsBox);
}
