import { el, icon, viewHead, cardTitle, toast, confirmBox, setTheme, todayStr } from '../util.js';
import { parseBackup } from '../data.js';
import { store, isDemo } from '../store.js';
import { CITIES } from '../weather.js';

function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], {type:'application/json'}));
  const a = el('a', {href:url,download:filename});
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function render(root) {
  const displayName = el('input',{class:'input',id:'display-name',maxlength:'40',value:store.data.settings.displayName||'',placeholder:'你的称呼'});
  const city = el('select',{class:'input',id:'weather-city'}, el('option',{value:''},'暂不设置'), Object.entries(CITIES).map(([id,c])=>el('option',{value:id,selected:store.data.settings.weatherCity===id?'':null},c.name)));
  const quotes = el('input',{type:'checkbox',id:'quotes-enabled',checked:store.data.settings.quotesEnabled?'':null});
  if (isDemo) { city.disabled = true; quotes.disabled = true; }
  const status = el('div',{class:'save-status'},store.status.message || '数据保存在当前浏览器');
  const off = store.onStatus(s => {status.textContent=s.message || '已保存到本机';});
  const file = el('input',{type:'file',accept:'.json,application/json','aria-label':'选择备份文件',hidden:''});
  file.addEventListener('change',async()=>{
    const selected=file.files?.[0];
    if(!selected) return;
    try {
      if(selected.size>5*1024*1024) throw new Error('备份超过 5 MB，请选择更小的备份');
      const text=await selected.text();
      const parsed=parseBackup(text);
      const count=parsed.todos.length+parsed.events.length+parsed.notes.length;
      if(!await confirmBox(`${isDemo ? '恢复将替换演示空间内容，不影响个人空间。' : '恢复将替换本机现有内容。'}备份包含 ${count} 条待办、日程与笔记，请先导出当前数据。`,'替换并恢复')) return;
      store.importBackup(text);
      toast('备份已恢复','ok');
    } catch(e) {toast(e.message || '备份无效，未修改本机数据','err');}
    finally {file.value='';}
  });
  root.append(
    viewHead('设置',''),
    el('div',{class:'card set-card'},cardTitle('gear','外观'),el('div',{class:'theme-grid'},[
      ['light','浅色'],['dark','深色']
    ].map(([id,name])=>el('button',{class:'theme-opt'+(document.documentElement.dataset.theme===id?' on':''),'aria-pressed':document.documentElement.dataset.theme===id?'true':'false',onclick:()=>{setTheme(id);root.querySelectorAll('.theme-opt').forEach(b=>{const on=b.dataset.theme===id;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});},dataset:{theme:id}},el('span',{class:'theme-preview '+id}),name)))),
    el('div',{class:'card set-card'},cardTitle('briefcase','偏好'),
      el('div',{class:'field'},el('label',{for:'display-name'},'称呼'),displayName),
      el('div',{class:'field'},el('label',{for:'weather-city'},isDemo ? '天气快照城市' : '天气城市'),city),
      el('label',{class:'checkbox-row',style:'display:flex;align-items:center;gap:9px;margin-bottom:18px'},quotes,isDemo ? '演示空间使用模拟参考价' : '查询公开行情'),
      el('button',{class:'btn btn-primary',onclick:()=>{store.update(d=>{d.settings.displayName=displayName.value.trim();d.settings.weatherCity=city.value;d.settings.quotesEnabled=quotes.checked;});toast('偏好已保存','ok');}},'保存偏好')),
    el('div',{class:'card set-card'},cardTitle('down','数据备份'),status,
      el('div',{style:'display:flex;gap:10px;flex-wrap:wrap'},
        el('button',{class:'btn btn-primary',onclick:()=>{download(store.exportBackup(),`personal-workbench-${isDemo ? 'demo-' : ''}${todayStr()}.json`);toast('备份已导出','ok');}},icon('down',15),'导出备份'),
        el('button',{class:'btn',onclick:()=>file.click()},icon('up',15),'恢复备份'),
        store.loadError?el('button',{class:'btn',onclick:()=>{download(store.rawLocalData||'',`personal-workbench-raw-${todayStr()}.json`);}},'导出原始数据'):null),file),
    el('div',{class:'card'},cardTitle('note','关于'),el('p',{class:'muted',style:'font-size:13px'},'Personal Workbench · Jiaxuan Tao'),el('a',{class:'btn btn-sm',style:'margin-top:12px',href:'https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/personal-workbench',target:'_blank',rel:'noopener noreferrer'},icon('link',14),'项目说明'))
  );
  return off;
}
