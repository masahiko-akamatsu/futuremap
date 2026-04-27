import ExcelJS from 'exceljs';
import { THEME_LABELS } from './initialData';
const LABELS = {
  living:   '居住環境',
  learning: '学び',
  leisure:  '趣味・余暇・遙び',
  family:   '家族・パートナー',
  theme:    null,
  health:   '健康',
  humanity: '人間性・人間関係',
  work:     '仕事・社会貢献',
  money:    'お金・物欲',
};


const solidFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thinBorder = () => ({
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' },
});

// 原紙フォーマット完全再現
// [headerRow, contentRow, col, key, hFill, hColor, hBold, cFill, cColor]
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

function buildSheet(ws, tabId, tabData, sheetTitle) {
  ws.pageSetup = {
    paperSize: 9, orientation: 'landscape',
    fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0, footer: 0 },
  };

  // 列幅（原紙：A=3.16, B=55.66, C=13.0, D=13.0）
  ws.getColumn('A').width = 3.16;
  ws.getColumn('B').width = 60;
  ws.getColumn('C').width = 60;
  ws.getColumn('D').width = 60;

  // 行高さ（原紙通り）
  ws.getRow(1).height = 23;
  ws.getRow(2).height = 15.75;
  ws.getRow(3).height = 21.75;
  ws.getRow(4).height = 193.5;
  ws.getRow(5).height = 26.25;
  ws.getRow(6).height = 193.5;
  ws.getRow(7).height = 24.75;
  ws.getRow(8).height = 193.5;

  // A1: タイトル（Arial 18 bold）
  const titleCell = ws.getCell('A1');
  titleCell.value = sheetTitle;
  titleCell.font = { bold: true, size: 18, name: 'Arial' };

  // D2: 日付
  const dateCell = ws.getCell('D2');
  dateCell.value = new Date();
  dateCell.numFmt = 'yyyy年m月d日';
  dateCell.font = { size: 12, name: 'Arial' };

  const themeLabel = THEME_LABELS[tabId];

  LAYOUT.forEach(([hRow, cRow, col, key, hFill, hColor, hBold, cFill, cColor]) => {
    const label = key === 'theme' ? themeLabel : (LABELS[key] || key);
    const content = tabData[key] || '';

    // ヘッダーセル（原紙のalignment: row3はcenter/center/wrap, row5,7はcenter/top）
    const hCell = ws.getCell(`${col}${hRow}`);
    hCell.value = label;
    hCell.font = {
      name: 'HGSGothicE', size: 18, bold: hBold,
      color: hColor ? { argb: hColor } : { theme: 1 },
    };
    hCell.fill = solidFill(hFill);
    hCell.alignment = {
      horizontal: 'center',
      vertical: 'center',
      wrapText: true,
    };
    hCell.border = thinBorder();

    // コンテンツセル（原紙: center/center/wrap）
    const cCell = ws.getCell(`${col}${cRow}`);
    cCell.value = content;
    cCell.font = {
      name: 'HGSGothicE', size: 18,
      color: cColor ? { argb: cColor } : { theme: 1 },
    };
    cCell.fill = solidFill(cFill);
    cCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cCell.border = thinBorder();
  });
}

export async function exportToExcel(allData, userName = '') {
    console.log("EXPORT_KEYS:", JSON.stringify(Object.keys(allData)));
  console.log("MONTH_KEYS:", JSON.stringify(Object.keys(allData.month||{})));
  console.log("Y1_KEYS:", JSON.stringify(Object.keys(allData.y1||{})));
  
  const mth=allData.month||{};
  const mkeys=Object.keys(mth);
  if(mkeys.length>0) console.log("MONTH_FIRST_ENTRY:", JSON.stringify({key:mkeys[0],val:(mth[mkeys[0]]||'').toString().slice(0,50)}));
  
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FutureMap';
  wb.created = new Date();

  // allData: { month: {...}, y1: {...}, y3: {...}, y10: {...} }
  // monthはFutureMapApp.jsxで現在の月のデータを 'month' キーで渡す
  const now = new Date();
  const ym = `${now.getFullYear()}年${now.getMonth()+1}月`;

  const sheets = [
    {
      tabId: 'month',
      name: `${now.getFullYear()}年${now.getMonth()+1}月アクション`,
      title: `フューチャーマップ(今月のアクション)【${ym}】`,
    },
    {
      tabId: 'y1',
      name: 'フューチャーマップ(1年後2026年の外側) ',
      title: 'フューチャーマップ(2026年の外側)　【1年後】',
    },
    {
      tabId: 'y3',
      name: 'フューチャーマップ(3年後2028年の外側)',
      title: 'フューチャーマップ(2028年の外側)　【3年後】',
    },
    {
      tabId: 'y10',
      name: 'フューチャーマップ(Life Goals10years)',
      title: 'フューチャーマップ(Life Goals/10years)現状の外側',
    },
  ];

  sheets.forEach(({ tabId, name, title }) => {
    const ws = wb.addWorksheet(name);
    buildSheet(ws, tabId, allData[tabId] || {}, title);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dt = now.toISOString().slice(0, 10).replace(/-/g, '');
  a.download = `FutureMap${dt}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
