import ExcelJS from 'exceljs';
import { CATEGORIES, TABS, THEME_LABELS } from './initialData';

// Hex color to ARGB
const toArgb = (hex) => hex && hex.length === 8 ? hex : (hex ? 'FF' + hex : null);

// Cell fill helper
const solidFill = (argb) => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});

// Thin border all sides
const thinBorder = () => ({
  top:    { style: 'thin' },
  bottom: { style: 'thin' },
  left:   { style: 'thin' },
  right:  { style: 'thin' },
});

// Build one sheet matching original Excel format exactly
function buildSheet(ws, tabId, tabData, userName) {
  const tab = TABS.find(t => t.id === tabId);
  const themeLabel = THEME_LABELS[tabId];

  // Page setup: A4 landscape, fit to 1 page
  ws.pageSetup = {
    paperSize: 9,         // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0, footer: 0 },
  };

  // Column widths (match original)
  ws.getColumn('A').width = 3.16;
  ws.getColumn('B').width = 55.66;
  ws.getColumn('C').width = 28;
  ws.getColumn('D').width = 28;

  // Row heights (match original)
  ws.getRow(1).height = 23;
  ws.getRow(2).height = 15.75;
  ws.getRow(3).height = 21.75;
  ws.getRow(4).height = 193.5;
  ws.getRow(5).height = 26.25;
  ws.getRow(6).height = 193.5;
  ws.getRow(7).height = 24.75;
  ws.getRow(8).height = 193.5;

  // Row 1: Title
  const titleCell = ws.getCell('A1');
  titleCell.value = tab.excelTitle;
  titleCell.font = { bold: true, size: 18, name: 'Arial' };

  // Row 2: Date (right column)
  const dateCell = ws.getCell('D2');
  dateCell.value = new Date();
  dateCell.numFmt = 'yyyy年m月d日';
  dateCell.font = { size: 12, name: 'Arial' };

  // Username (B2)
  if (userName) {
    const nameCell = ws.getCell('B2');
    nameCell.value = userName;
    nameCell.font = { size: 12, name: 'Arial' };
  }

  const layout = [
    [3, 4, 'B', 'living'],
    [3, 4, 'C', 'learning'],
    [3, 4, 'D', 'leisure'],
    [5, 6, 'B', 'family'],
    [5, 6, 'C', 'theme'],
    [5, 6, 'D', 'health'],
    [7, 8, 'B', 'humanity'],
    [7, 8, 'C', 'work'],
    [7, 8, 'D', 'money'],
  ];

  layout.forEach(([hRow, cRow, col, key]) => {
    const cat = CATEGORIES.find(c => c.key === key);
    const label = key === 'theme' ? themeLabel : cat.label;
    const content = tabData[key] || '';
    const hCell = ws.getCell(`${col}${hRow}`);
    hCell.value = label;
    hCell.font = { bold: hRow >= 5, size: 18, name: 'HGSGothicE', color: cat.headerColor ? { argb: toArgb(cat.headerColor) } : { theme: 1 } };
    hCell.fill = solidFill(toArgb(cat.headerBg));
    hCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    hCell.border = thinBorder();
    const cCell = ws.getCell(`${col}${cRow}`);
    cCell.value = content;
    cCell.font = { size: 18, name: 'HGSGothicE', color: cat.contentColor ? { argb: toArgb(cat.contentColor) } : { theme: 1 } };
    cCell.fill = solidFill(toArgb(cat.contentBg));
    cCell.alignment = { horizontal: col === 'B' && (cRow === 6 || cRow === 8) ? 'left' : 'center', vertical: 'center', wrapText: true };
    cCell.border = thinBorder();
  });
}

export async function exportToExcel(allData, userName = '') {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FutureMap';
  wb.created = new Date();
  const sheetOrder = ['month', 'y10', 'y3', 'y1'];
  const sheetNames = { month: '４月アクション', y1: 'フューチャーマップ(1年後2026年の外側)', y3: 'フューチャーマップ(3年後2028年の外側)', y10: 'フューチャーマップ(Life Goals10years)' };
  sheetOrder.forEach(tabId => {
    const ws = wb.addWorksheet(sheetNames[tabId]);
    buildSheet(ws, tabId, allData[tabId] || {}, userName);
  });
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FutureMap_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
