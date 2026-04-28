import ExcelJS from 'exceljs';
import { THEME_LABELS } from './initialData';

const LABELS = {
  living: '居住環境',
  learning: '学び',
  leisure: '趣味・余暇・遊び',
  family: '家族・パートナー',
  theme: null,
  health: '健康',
  humanity: '人間性・人間関係',
  work: '仕事・社会貢献',
  money: 'お金・物欲',
};

const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thinBorder = () => ({
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
});

const LAYOUT = [
  [3, 4, 'B', 'living',   'FFFFFFCC', null,       false, 'FFFFFFCC', null      ],
  [3, 4, 'C', 'learning', 'FFCCECFF', null,       false, 'FFFFFFCC', 'FF0000FF'],
  [3, 4, 'D', 'leisure',  'FFFFFF00', 'FFFF0000', false, 'FFFFFF00', 'FFFF0000'],
  [5, 6, 'B', 'family',   'FFFFFFCC', null,       true,  'FFFFFFCC', 'FFFF0000'],
  [5, 6, 'C', 'theme',    'FFFFFF00', 'FF0000FF', true,  'FFFFFF00', 'FF0000CC'],
  [5, 6, 'D', 'health',   'FFFFFFCC', null,       true,  'FFFFFFCC', null      ],
  [7, 8, 'B', 'humanity', 'FFFFCCFF', null,       true,  'FFFFCCFF', null      ],
  [7, 8, 'C', 'work',     'FFFFFFCC', null,       true,  'FFFFFFCC', null      ],
  [7, 8, 'D', 'money',    'FFFFFFCC', null,       true,  'FFFFFFCC', null      ],
];

function parseMonthKey(k) {
  const [y, m] = k.split('_');
  return { year: parseInt(y), month: parseInt(m) };
}

function buildSheet(ws, tabId, tabData, sheetTitle, themeOverride) {
  ws.pageSetup = {
    paperSize: 9, orientation: 'landscape', fitToPage: true,
    fitToWidth: 1, fitToHeight: 1,
    margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0, footer: 0 },
  };
  ws.getColumn('A').width = 3.16;
  ws.getColumn('B').width = 60;
  ws.getColumn('C').width = 60;
  ws.getColumn('D').width = 60;
  ws.getRow(1).height = 23;
  ws.getRow(2).height = 15.75;
  ws.getRow(3).height = 21.75;
  ws.getRow(4).height = 193.5;
  ws.getRow(5).height = 26.25;
  ws.getRow(6).height = 193.5;
  ws.getRow(7).height = 24.75;
  ws.getRow(8).height = 193.5;

  const titleCell = ws.getCell('A1');
  titleCell.value = sheetTitle;
  titleCell.font = { bold: true, size: 18, name: 'Arial' };

  const dateCell = ws.getCell('D2');
  dateCell.value = new Date();
  dateCell.numFmt = 'yyyy年m月d日';
  dateCell.font = { size: 12, name: 'Arial' };

  const themeLabel = themeOverride || THEME_LABELS[tabId] || 'テーマ&感情';

  LAYOUT.forEach(([hRow, cRow, col, key, hFill, hColor, hBold, cFill, cColor]) => {
    const label = key === 'theme' ? themeLabel : (LABELS[key] || key);
    const content = tabData[key] || '';

    const hCell = ws.getCell(col + hRow);
    hCell.value = label;
    hCell.font = { name: 'HGSGothicE', size: 18, bold: hBold, color: hColor ? { argb: hColor } : { theme: 1 } };
    hCell.fill = solidFill(hFill);
    hCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    hCell.border = thinBorder();

    const cCell = ws.getCell(col + cRow);
    cCell.value = content;
    cCell.font = { name: 'HGSGothicE', size: 18, color: cColor ? { argb: cColor } : { theme: 1 } };
    cCell.fill = solidFill(cFill);
    cCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cCell.border = thinBorder();
  });
}

export async function exportToExcel(allData, userName, monthKeys) {
  const mKeys = Array.isArray(monthKeys) ? monthKeys : [];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FutureMap';
  wb.created = new Date();

  const sorted = [...mKeys].sort();
  for (const mk of sorted) {
    const { year, month } = parseMonthKey(mk);
    const label = year + '年' + month + '月';
    const sheetName = year + '年' + month + '月アクション';
    const sheetTitle = 'フューチャーマップ(' + label + 'のアクション)';
    const themeLabel = label + 'のテーマ&感情';
    const ws = wb.addWorksheet(sheetName);
    buildSheet(ws, mk, allData[mk] || {}, sheetTitle, themeLabel);
  }

  const visions = [
    { id: 'y1',  name: 'フューチャーマップ(1年剌2026年の外側) ', title: 'フューチャーマップ(2026年の外側) 　1年後】' },
    { id: 'y3',  name: 'フューチャーマップ(3年剌2028年の外側)',  title: 'フューチャーマップ(2028年の外側) 　3年後】' },
    { id: 'y10', name: 'フューチャーマップ(Life Goals10years)',   title: 'フューチャーマップ(Life Goals/10years)現状の外側' },
  ];
  for (const { id, name, title } of visions) {
    const ws = wb.addWorksheet(name);
    buildSheet(ws, id, allData[id] || {}, title);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  a.download = 'FutureMap' + now.toISOString().slice(0,10).replace(/-/g,'') + '.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
