// ============ Excel 导入导出（基于项目内置 SheetJS，离线可用） ============
import { isValidDate } from './validation.js';

let loading = null;

// 懒加载本地 vendor/xlsx.full.min.js（只需加载一次）
export function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../vendor/xlsx.full.min.js', import.meta.url).href;
      s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error('Excel 组件异常')));
      s.onerror = () => { loading=null; s.remove(); reject(new Error('Excel 组件加载失败，请重试')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// 导出：aoa = 二维数组（第一行是表头）
export async function exportExcel(filename, sheetName, aoa, colWidths) {
  return exportExcelBook(filename, [{ name: sheetName, aoa, widths: colWidths }]);
}

// 多工作表导出：sheets = [{ name, aoa, widths }]
export async function exportExcelBook(filename, sheets) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, aoa, widths }) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (widths) ws['!cols'] = widths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}

// 导入：弹出文件选择框，解析第一个工作表为二维数组；用户取消时返回 null
export function pickExcelRows() {
  return pickExcelBook().then(book => (book ? book[0].rows : null));
}

// 导入：返回全部工作表 [{ name, rows }]；用户取消时返回 null
export function pickExcelBook() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.addEventListener('cancel',()=>resolve(null),{once:true});
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return resolve(null);
      try {
        if(file.size>5*1024*1024) throw new Error('文件不能超过 5 MB');
        const XLSX = await loadXLSX();
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        resolve(wb.SheetNames.map(name => ({
          name,
          rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' }),
        })));
      } catch (e) {
        reject(new Error('文件读取失败，请确认是 Excel 文件（.xlsx）'));
      }
    };
    input.click();
  });
}

// ---------------- 单元格值解析（兼容文字 / 日期 / Excel 数字日期 / 富文本 HTML） ----------------
const pad = n => String(n).padStart(2, '0');

// Excel 日期常带小数秒误差（如 23:59:17），先四舍五入到最近的整天再取年月日
function dayRound(v) { return new Date(Math.round(v.getTime() / 86400000) * 86400000); }

export function asText(v) {
  if (v == null) return '';
  if (v instanceof Date) { const d = dayRound(v); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  // 富文本字段（HTML）：先剥标签还原纯文本，保证导出/导入往返一致
  return String(v)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim();
}

function dateFromSerial(n) { // Excel 日期序列号 → Date（按 1900 日期系统）
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

// 解析成 'YYYY-MM'，失败返回 null
export function asMonth(v) {
  if (v instanceof Date && !isNaN(v)) { const d = dayRound(v); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; }
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = dateFromSerial(v); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; }
  const m = String(v == null ? '' : v).match(/(\d{4})\s*[-/年.]\s*(\d{1,2})/);
  if (!m) return null;
  const mm = Number(m[2]);
  return mm >= 1 && mm <= 12 ? `${m[1]}-${pad(mm)}` : null;
}

// 解析成 'YYYY-MM-DD'，失败返回 null
export function asDate(v) {
  if (v instanceof Date && !isNaN(v)) { const d = dayRound(v); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = dateFromSerial(v); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  const m = String(v == null ? '' : v).match(/(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})/);
  if (!m) return null;
  const mm = Number(m[2]), dd = Number(m[3]);
  const value=`${m[1]}-${pad(mm)}-${pad(dd)}`;
  return isValidDate(value)?value:null;
}

// 解析"是否完成"
export function asDone(v) {
  if (v === true) return true;
  const s = String(v == null ? '' : v).trim().toLowerCase();
  return ['是', '完成', '已完成', '√', '✓', 'y', 'yes', 'true', '1'].includes(s);
}
