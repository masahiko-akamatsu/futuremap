export const CATEGORIES = [
  { key:'living',   label:'居住環境',        icon:'🏡', headerBg:'FFFFFFCC', contentBg:'FFFFFFCC', headerColor:null,       contentColor:null       },
  { key:'learning', label:'学び',             icon:'📚', headerBg:'FFCCECFF', contentBg:'FFCCECFF', headerColor:null,       contentColor:'FF0000FF' },
  { key:'leisure',  label:'趣味・余暇・遊び', icon:'🎨', headerBg:'FFFFFF00', contentBg:'FFFFFF00', headerColor:'FFFF0000', contentColor:'FFFF0000' },
  { key:'family',   label:'家族・パートナー', icon:'💑', headerBg:'FFFFCCCC', contentBg:'FFFFCCCC', headerColor:null,       contentColor:'FF0000CC' },
  { key:'theme',    label:'今月のテーマ&感情', icon:'✨', headerBg:'FFFFFF00', contentBg:'FFFFFF00', headerColor:'FF0000FF', contentColor:'FF0000CC', isTheme:true },
  { key:'health',   label:'健康',             icon:'🌱', headerBg:'FFFFFFCC', contentBg:'FFFFFFCC', headerColor:null,       contentColor:null       },
  { key:'humanity', label:'人間性・人間関係', icon:'🤝', headerBg:'FFFFCCFF', contentBg:'FFFFCCFF', headerColor:'FF0000CC', contentColor:'FF0000CC' },
  { key:'work',     label:'仕事・社会貢献',   icon:'💼', headerBg:'FFFFFFCC', contentBg:'FFFFFFCC', headerColor:null,       contentColor:null       },
  { key:'money',    label:'お金・物欲',        icon:'💰', headerBg:'FFCCECFF', contentBg:'FFCCECFF', headerColor:null,       contentColor:null       },
];
export const THEME_LABELS = {
  month:'今月のテーマ&感情', y1:'人生のテーマ&感情', y3:'人生のテーマ&感情', y10:'人生のテーマ&感情',
};
export const TABS = [
  { id:'month', label:'今月のアクション', shortLabel:'今月', period:'2026年4月',      excelTitle:'フューチャーマップ(今月のアクション)【2026年4月】' },
  { id:'y1',    label:'1年後ビジョン',   shortLabel:'1年後', period:'2026年12月31日', excelTitle:'フューチャーマップ(2026年の外側)　【1年後】2026年12月31日（58歳）' },
  { id:'y3',    label:'3年後ビジョン',   shortLabel:'3年後', period:'2028年12月31日', excelTitle:'フューチャーマップ(2028年の外側)　【3年後】2028年12月31日（60歳）' },
  { id:'y10',   label:'10年後ビジョン',  shortLabel:'10年後', period:'2035年12月31日', excelTitle:'フューチャーマップ(Life Goals/10years)現状の外側　2035年12月31日（67歳）' },
];
export const INITIAL_DATA = {
  month: { living:'', learning:'', leisure:'', family:'', theme:'', health:'', humanity:'', work:'', money:'' },
  y1:    { living:'', learning:'', leisure:'', family:'', theme:'', health:'', humanity:'', work:'', money:'' },
  y3:    { living:'', learning:'', leisure:'', family:'', theme:'', health:'', humanity:'', work:'', money:'' },
  y10:   { living:'', learning:'', leisure:'', family:'', theme:'', health:'', humanity:'', work:'', money:'' },
};
