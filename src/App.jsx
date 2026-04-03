import { useState, useEffect, useCallback } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import * as XLSX from 'xlsx';
import './App.css';

const CATEGORIES = [
  { key: 'home',     label: '居住環境',        icon: '🏠', colorKey: 'yellow' },
  { key: 'study',    label: '学び',            icon: '📚', colorKey: 'blue' },
  { key: 'hobby',    label: '趣味・余暇・遊び',  icon: '🎯', colorKey: 'brightyellow' },
  { key: 'family',   label: '家族・パートナー',  icon: '👨‍👩‍👧', colorKey: 'pink' },
  { key: 'theme',    label: '人生のテーマ&感情', icon: '✨', colorKey: 'brightyellow', wide: true },
  { key: 'health',   label: '健康',            icon: '💚', colorKey: 'yellow' },
  { key: 'relation', label: '人間性・人間関係',  icon: '🤝', colorKey: 'purple' },
  { key: 'work',     label: '仕事・社会貢献',   icon: '💼', colorKey: 'yellow' },
  { key: 'money',    label: 'お金・物欲',       icon: '💴', colorKey: 'blue' },
];
const GRID_LAYOUT = [['home','study','hobby'],['family','theme','health'],['relation','work','money']];
const HORIZONS = [
  { key: 'y1',  label: '1年後',  sub: '2026年12月31日（58歳）', icon: '🌱' },
  { key: 'y3',  label: '3年後',  sub: '2028年12月31日（60歳）', icon: '🌿' },
  { key: 'y10', label: '10年後', sub: '2035年12月31日（67歳）', icon: '🌳' },
];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const EMOJI_LIST = ['😊','🚀','🌸','⭐','🔥','💪','🎯','🌈','🦋','🌺','🎨','🏆','💡','🌙','🌊'];
const MONTH_CATS = [
  { key: 'home',     label: '居住環境',        icon: '🏠', colorKey: 'yellow' },
  { key: 'study',    label: '学び',            icon: '📚', colorKey: 'blue' },
  { key: 'hobby',    label: '趣味・余暇・遊び',  icon: '🎯', colorKey: 'brightyellow' },
  { key: 'family',   label: '家族・パートナー',  icon: '👨‍👩‍👧', colorKey: 'pink' },
  { key: 'theme',    label: '今月のテーマ&感情', icon: '✨', colorKey: 'brightyellow' },
  { key: 'health',   label: '健康',            icon: '💚', colorKey: 'yellow' },
  { key: 'relation', label: '人間性・人間関係',  icon: '🤝', colorKey: 'purple' },
  { key: 'work',     label: '仕事・社会貢献',   icon: '💼', colorKey: 'yellow' },
  { key: 'money',    label: 'お金・物欲',       icon: '💴', colorKey: 'blue' },
];
const COLOR_THEMES = {
  excel:  { name: 'Excelカラー', colors: { yellow:{bg:'#FFFFCC',label:'#555533',border:'#DDDD88'}, blue:{bg:'#CCECFF',label:'#334466',border:'#88BBDD'}, brightyellow:{bg:'#FFFF99',label:'#665500',border:'#CCCC44'}, pink:{bg:'#FFCCCC',label:'#663333',border:'#DDAAAA'}, purple:{bg:'#FFCCFF',label:'#553355',border:'#DDAADD'} }, header:'#E8E8D0', headerText:'#333322', bg:'#F5F5E8' },
  nature: { name: '若草グリーン', colors: { yellow:{bg:'#F0FAE8',label:'#2D5A1B',border:'#A8D878'}, blue:{bg:'#E8F4F0',label:'#1B4A3A',border:'#88CCAA'}, brightyellow:{bg:'#EEFAD8',label:'#3A5A10',border:'#BBDD88'}, pink:{bg:'#F8F0E8',label:'#5A3A1B',border:'#DDB888'}, purple:{bg:'#F0EEF8',label:'#3A2A5A',border:'#BBAADD'} }, header:'#D4F0B0', headerText:'#1B4A10', bg:'#F0F9E8' },
  ocean:  { name: 'オーシャンブルー', colors: { yellow:{bg:'#E8F4FF',label:'#1A3A5C',border:'#88BBEE'}, blue:{bg:'#D8EEFF',label:'#0A2A4C',border:'#66AAEE'}, brightyellow:{bg:'#E0F0FF',label:'#1A3060',border:'#77AADD'}, pink:{bg:'#EEF0FF',label:'#2A2A60',border:'#AAAAEE'}, purple:{bg:'#F0E8FF',label:'#3A1A60',border:'#BB88EE'} }, header:'#B8DAFF', headerText:'#0A2A5C', bg:'#EAF4FF' },
  sakura: { name: 'さくらピンク', colors: { yellow:{bg:'#FFF5F8',label:'#5C1A2A',border:'#FFAACC'}, blue:{bg:'#FFF0F5',label:'#5C1A3A',border:'#FF99BB'}, brightyellow:{bg:'#FFECF5',label:'#5C0A30',border:'#FF88BB'}, pink:{bg:'#FFE8F2',label:'#5C0A2A',border:'#FF77AA'}, purple:{bg:'#FFF0FF',label:'#4A0A4A',border:'#FFAAFF'} }, header:'#FFCCE0', headerText:'#5C0A2A', bg:'#FFF5F8' },
  night:  { name: 'ナイトモード', colors: { yellow:{bg:'#2A2A1A',label:'#FFEEAA',border:'#555533'}, blue:{bg:'#1A2A3A',label:'#AADDFF',border:'#335577'}, brightyellow:{bg:'#2A2800',label:'#FFFF88',border:'#555500'}, pink:{bg:'#2A1A1A',label:'#FFAAAA',border:'#553333'}, purple:{bg:'#221A2A',label:'#FFAAFF',border:'#553366'} }, header:'#1A1A0A', headerText:'#EEEEBB', bg:'#121210' },
};

function emptyCategories(){return Object.fromEntries(CATEGORIES.map(c=>[c.key,'']));}
function emptyMonthCategories(){return Object.fromEntries(MONTH_CATS.map(c=>[c.key,'']));}
const DEFAULT_GOALS={y1:emptyCategories(),y3:emptyCategories(),y10:emptyCategories()};
const DEFAULT_ACTIONS=()=>Object.fromEntries(Array.from({length:12},(_,i)=>[String(i+1),emptyMonthCategories()]));
function deepClone(obj){return JSON.parse(JSON.stringify(obj));}

export default function App(){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState('map');
  const [authMode,setAuthMode]=useState('login');
  const [profile,setProfile]=useState({nickname:'',emoji:'😊'});
  const [goals,setGoals]=useState(deepClone(DEFAULT_GOALS));
  const [actions,setActions]=useState(DEFAULT_ACTIONS());
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState('');
  const [theme,setTheme]=useState('excel');
  const [showThemePicker,setShowThemePicker]=useState(false);
  const T=COLOR_THEMES[theme];
  useEffect(()=>{const unsub=onAuthStateChanged(auth,async(u)=>{setUser(u);if(u)await loadUserData(u.uid);setLoading(false);});return unsub;},[]);
  async function loadUserData(uid){try{const snap=await getDoc(doc(db,'users',uid));if(snap.exists()){const d=snap.data();if(d.profile)setProfile(d.profile);if(d.goals)setGoals(d.goals);if(d.actions)setActions(d.actions);if(d.theme)setTheme(d.theme);}}catch(e){console.error(e);}}
  const saveAll=useCallback(async(p,g,a,t)=>{if(!user)return;setSaving(true);try{await setDoc(doc(db,'users',user.uid),{profile:p??profile,goals:g??goals,actions:a??actions,theme:t??theme,updatedAt:serverTimestamp()},{merge:true});showToast('保存しました ✓');}catch(e){showToast('保存エラー: '+e.message);}finally{setSaving(false);}},[user,profile,goals,actions,theme]);
  function showToast(msg){setToast(msg);setTimeout(()=>setToast(''),2500);}
  async function handleAuth(e){e.preventDefault();const email=e.target.email.value.trim();const pass=e.target.password.value;try{if(authMode==='register'){await createUserWithEmailAndPassword(auth,email,pass);showToast('登録完了！');}else{await signInWithEmailAndPassword(auth,email,pass);showToast('ログインしました');}}catch(err){showToast(err.message);}}
  async function handleLogout(){await signOut(auth);setGoals(deepClone(DEFAULT_GOALS));setActions(DEFAULT_ACTIONS());setProfile({nickname:'',emoji:'😊'});setTheme('excel');}

  function exportExcel(){
    const wb=XLSX.utils.book_new();
    const CELL_STYLES={
      map:{
        labelRow:[['FFFFFFCC','FFCCECFF','FFFFFF00'],['FFFFCCCC','FFFFFF00','FFFFFFCC'],['FFFFCCFF','FFFFFFCC','FFCCECFF']],
        dataRow: [['FFFFFFCC','FFCCECFF','FFFFFF00'],['FFFFCCCC','FFFFFF00','FFFFFFCC'],['FFFFCCFF','FFFFFFCC','FFCCECFF']],
        labelFg: [[null,null,'FFFF0000'],[null,'FF0000FF',null],['FF0000CC',null,null]],
        dataFg:  [[null,'FF0000FF','FFFF0000'],['FF0000CC','FF0000CC',null],['FF0000CC',null,null]],
      },
      monthly:{
        labelRow:[['FFFFFFCC','FFCCECFF','FFFFFF00'],['FFFFFFCC','FFFFFF00','FFFFFFCC'],['FFFFCCFF','FFFFFFCC','FFFFFFCC']],
        dataRow: [['FFFFFFCC','FFFFFFCC','FFFFFF00'],['FFFFFFCC','FFFFFF00','FFFFFFCC'],['FFFFCCFF','FFFFFFCC','FFFFFFCC']],
        labelFg: [[null,null,'FFFF0000'],[null,'FF0000FF',null],[null,null,null]],
        dataFg:  [[null,'FF0000FF','FFFF0000'],['FFFF0000','FF0000CC',null],[null,null,null]],
      },
    };
    function applyStyle(ws,addr,bgARGB,fgARGB,bold,wrapText,valign){
      if(!ws[addr])ws[addr]={t:'s',v:''};
      ws[addr].s={
        fill:bgARGB&&bgARGB!=='00000000'?{patternType:'solid',fgColor:{rgb:bgARGB.substring(2)}}:{patternType:'none'},
        font:{name:'Yu Gothic',sz:18,bold:!!bold,color:fgARGB?{rgb:fgARGB.substring(2)}:{rgb:'000000'}},
        alignment:{wrapText:!!wrapText,vertical:valign||'center',horizontal:'left'},
      };
    }
    const layout=[['home','study','hobby'],['family','theme','health'],['relation','work','money']];
    const catLabel={home:'居住環境',study:'学び',hobby:'趣味・余暇・遊び',family:'家族・パートナー',theme:'人生のテーマ&感情',health:'健康',relation:'人間性・人間関係',work:'仕事・社会貢献',money:'お金・物欲'};
    const titles={y1:'フューチャーマップ(2026年の外側)　　1年後　2026年12月31日（58歳）',y3:'フューチャーマップ(2028年の外側)　　3年後　2028年12月31日（60歳）',y10:'フューチャーマップ(Life Goals/10years)現状の外側　2035年12月31日（67歳）'};
    const sheetNames={y1:'フューチャーマップ(1年後2026年の外側)',y3:'フューチャーマップ(3年後2028年の外側)',y10:'フューチャーマップ(Life Goals10years)'};
    const colWidths={y1:55.66,y3:47.5,y10:48.16};
    HORIZONS.forEach((h,hi)=>{
      const g=goals[h.key]||emptyCategories();
      const ws={};ws['!ref']='A1:D8';
      ws['A1']={t:'s',v:titles[h.key],s:{font:{name:'Yu Gothic',sz:18,bold:true}}};
      ws['D2']={t:'s',v:new Date().toLocaleDateString('ja-JP'),s:{font:{name:'Yu Gothic',sz:12}}};
      const cols=['B','C','D'];const st=CELL_STYLES.map;
      layout.forEach((row,ri)=>{
        const lr=3+ri*2,dr=4+ri*2;
        row.forEach((key,ci)=>{
          const la=`${cols[ci]}${lr}`,da=`${cols[ci]}${dr}`;
          ws[la]={t:'s',v:catLabel[key]};applyStyle(ws,la,st.labelRow[ri][ci],st.labelFg[ri][ci],true,false,'top');
          ws[da]={t:'s',v:g[key]||''};applyStyle(ws,da,st.dataRow[ri][ci],st.dataFg[ri][ci],false,true,'center');
        });
      });
      ws['!cols']=[{wch:3.16},{wch:colWidths[h.key]},{wch:13},{wch:13}];
      ws['!rows']=[{hpt:hi===1?31:23},{hpt:15.75},{hpt:21.75},{hpt:193.5},{hpt:26.25},{hpt:193.5},{hpt:24.75},{hpt:193.5}];
      XLSX.utils.book_append_sheet(wb,ws,sheetNames[h.key]);
    });
    const catLabelM={home:'居住環境',study:'学び',hobby:'趣味・余暇・遊び',family:'家族・パートナー',theme:'今月のテーマ&感情',health:'健康',relation:'人間性・人間関係',work:'仕事・社会貢献',money:'お金・物欲'};
    const stM=CELL_STYLES.monthly;
    MONTHS.forEach((m,mi)=>{
      const a=actions[String(mi+1)];
      if(!a||!Object.values(a).some(Boolean))return;
      const mn=mi+1;
      const ws={};ws['!ref']='A1:D8';
      ws['A1']={t:'s',v:`フューチャーマップ(今月のアクション　2026年${mn}月)`,s:{font:{name:'Yu Gothic',sz:18,bold:true}}};
      ws['D2']={t:'s',v:new Date().toLocaleDateString('ja-JP'),s:{font:{name:'Yu Gothic',sz:12}}};
      const cols=['B','C','D'];
      layout.forEach((row,ri)=>{
        const lr=3+ri*2,dr=4+ri*2;
        row.forEach((key,ci)=>{
          const la=`${cols[ci]}${lr}`,da=`${cols[ci]}${dr}`;
          ws[la]={t:'s',v:catLabelM[key]};applyStyle(ws,la,stM.labelRow[ri][ci],stM.labelFg[ri][ci],true,false,'top');
          ws[da]={t:'s',v:a[key]||''};applyStyle(ws,da,stM.dataRow[ri][ci],stM.dataFg[ri][ci],false,true,'center');
        });
      });
      ws['!cols']=[{wch:3.16},{wch:55.66},{wch:13},{wch:13}];
      ws['!rows']=[{hpt:23},{hpt:15.75},{hpt:21.75},{hpt:193.5},{hpt:26.25},{hpt:193.5},{hpt:24.75},{hpt:193.5}];
      XLSX.utils.book_append_sheet(wb,ws,`${mn}月アクション`);
    });
    XLSX.writeFile(wb,'futuremap_export.xlsx',{cellStyles:true});
    showToast('Excelをダウンロードしました');
  }

  function importExcel(e){const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=(ev)=>{try{const wb=XLSX.read(ev.target.result,{type:'binary'});const L={'居住環境':'home','学び':'study','趣味・余暇・遊び':'hobby','家族・パートナー':'family','人生のテーマ&感情':'theme','今月のテーマ&感情':'theme','テーマ&感情':'theme','健康':'health','人間性・人間関係':'relation','仕事・社会貢献':'work','お金・物欲':'money'};function pG(rows){const r={};[[2,3],[4,5],[6,7]].forEach(([li,di])=>{if(li>=rows.length)return;const lb=rows[li],dt=rows[di]||[];[1,2,3].forEach(col=>{const l=lb[col],v=dt[col];if(l&&L[l])r[L[l]]=String(v||'');});});return r;}function pA(rows){const r={};rows.slice(1).forEach(row=>{const k=L[row[0]];if(k)r[k]=String(row[1]||'');});return r;}const ng=deepClone(DEFAULT_GOALS);const OR={y1:['フューチャーマップ(1年後2026年の外側) ','フューチャーマップ(1年後2026年の外側)'],y3:['フューチャーマップ(3年後2028年の外側)'],y10:['フューチャーマップ(Life Goals10years)']};HORIZONS.forEach(h=>{if(wb.Sheets[h.label]){Object.assign(ng[h.key],pA(XLSX.utils.sheet_to_json(wb.Sheets[h.label],{header:1})));return;}for(const n of(OR[h.key]||[])){if(wb.Sheets[n]){Object.assign(ng[h.key],pG(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1})));break;}}});setGoals(ng);const na=DEFAULT_ACTIONS();if(wb.Sheets['月次アクション']){XLSX.utils.sheet_to_json(wb.Sheets['月次アクション'],{header:1}).slice(1).forEach(row=>{const mi=MONTHS.indexOf(row[0]);if(mi>=0){const k=String(mi+1);MONTH_CATS.forEach((c,ci)=>{na[k][c.key]=String(row[ci+1]||'');});}});}wb.SheetNames.forEach(name=>{const m=name.match(/^(\d+)月アクション$/);if(!m)return;const mi=parseInt(m[1])-1;if(mi<0||mi>11)return;Object.assign(na[String(mi+1)],pG(XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1})));});setActions(na);showToast('Excelを取り込みました ✓');e.target.value='';}catch(err){showToast('読み込みエラー: '+err.message);}};reader.readAsBinaryString(file);}

  if(loading)return <div className="splash"><div className="splash-logo">🗺️</div><div className="splash-text">FutureMap</div></div>;
  if(!user)return <AuthPage authMode={authMode} setAuthMode={setAuthMode} onSubmit={handleAuth}/>;
  return(
    <div className="app" style={{background:T.bg,minHeight:'100vh'}}>
      {toast&&<div className="toast">{toast}</div>}
      {showThemePicker&&(
        <div className="theme-overlay" onClick={()=>setShowThemePicker(false)}>
          <div className="theme-picker" onClick={e=>e.stopPropagation()}>
            <div className="theme-picker-title">🎨 カラーテーマを選択</div>
            <div className="theme-grid">
              {Object.entries(COLOR_THEMES).map(([key,t])=>(<button key={key} className={`theme-btn${theme===key?' active':''}`} style={{background:t.bg,border:`3px solid ${theme===key?'#333':t.header}`}} onClick={()=>{setTheme(key);setShowThemePicker(false);saveAll(null,null,null,key);}}><div className="theme-preview">{Object.values(t.colors).slice(0,5).map((c,i)=>(<div key={i} style={{background:c.bg,border:`1px solid ${c.border}`}}/>))}</div><div className="theme-name" style={{color:t.headerText}}>{t.name}</div></button>))}
            </div>
          </div>
        </div>
      )}
      <header className="header" style={{background:T.header,borderBottom:`2px solid ${T.colors.yellow.border}`}}>
        <span className="logo" style={{color:T.headerText}}>🗺️ FutureMap</span>
        <nav className="nav">{['map','actions','profile'].map(p=>(<button key={p} className={`nav-btn${page===p?' active':''}`} style={page===p?{background:T.colors.yellow.bg,color:T.headerText,borderColor:T.colors.yellow.border}:{color:T.headerText}} onClick={()=>setPage(p)}>{p==='map'?'マップ':p==='actions'?'月次アクション':'プロフィール'}</button>))}</nav>
        <div className="header-right">
          <button className="btn-theme" style={{background:T.colors.purple.bg,color:T.colors.purple.label,borderColor:T.colors.purple.border}} onClick={()=>setShowThemePicker(true)}>🎨 テーマ</button>
          <span className="user-badge" style={{color:T.headerText}}>{profile.emoji} {profile.nickname||user.email}</span>
          <button className="btn-logout" style={{color:T.headerText,borderColor:T.colors.yellow.border}} onClick={handleLogout}>ログアウト</button>
        </div>
      </header>
      <div className="toolbar" style={{background:T.header,borderBottom:`1px solid ${T.colors.yellow.border}`}}>
        <label className="btn-tool" style={{background:T.colors.blue.bg,color:T.colors.blue.label,borderColor:T.colors.blue.border}}>📥 Excelインポート<input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{display:'none'}}/></label>
        <button className="btn-tool" style={{background:T.colors.blue.bg,color:T.colors.blue.label,borderColor:T.colors.blue.border}} onClick={exportExcel}>📤 Excelエクスポート</button>
        <button className="btn-save" style={{background:T.colors.pink.bg,color:T.colors.pink.label,borderColor:T.colors.pink.border}} onClick={()=>saveAll()} disabled={saving}>{saving?'保存中…':'💾 保存'}</button>
      </div>
      <main className="main">
        {page==='map'&&<MapPage goals={goals} setGoals={setGoals} T={T}/>}
        {page==='actions'&&<ActionsPage actions={actions} setActions={setActions} T={T}/>}
        {page==='profile'&&<ProfilePage profile={profile} setProfile={setProfile} T={T} onSave={p=>saveAll(p,null,null,null)}/>}
      </main>
    </div>
  );
}
function AuthPage({authMode,setAuthMode,onSubmit}){return(<div className="auth-bg"><div className="auth-card"><div className="auth-logo">🗺️</div><h1 className="auth-title">FutureMap</h1><p className="auth-sub">あなたの未来を描こう</p><form onSubmit={onSubmit} className="auth-form"><input name="email" type="email" placeholder="メールアドレス" required className="auth-input"/><input name="password" type="password" placeholder="パスワード（6文字以上）" required className="auth-input"/><button type="submit" className="auth-submit">{authMode==='login'?'ログイン':'アカウント作成'}</button></form><button className="auth-toggle" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>{authMode==='login'?'→ 新規登録はこちら':'→ ログインはこちら'}</button></div></div>);}
function CatCard({cat,value,onChange,T,placeholder}){const c=T.colors[cat.colorKey];return(<div className="cat-card" style={{background:c.bg,border:`1px solid ${c.border}`}}><div className="cat-label" style={{color:c.label,borderBottom:`1px solid ${c.border}`}}><span className="cat-icon">{cat.icon}</span>{cat.label}</div><textarea className="cat-textarea" style={{background:'rgba(255,255,255,0.7)',color:'#333',borderColor:c.border}} placeholder={placeholder||`${cat.label}を入力…`} value={value||''} onChange={onChange}/></div>);}
function MapPage({goals,setGoals,T}){const [ah,setAh]=useState('y1');function upd(hk,ck,v){setGoals(p=>({...p,[hk]:{...p[hk],[ck]:v}}));}const h=HORIZONS.find(x=>x.key===ah);const data=goals[ah]||emptyCategories();const cm=Object.fromEntries(CATEGORIES.map(c=>[c.key,c]));return(<div className="map-page"><div className="page-header" style={{background:T.header,border:`1px solid ${T.colors.yellow.border}`}}><h2 className="page-title" style={{color:T.headerText}}>🗺️ フューチャーマップ</h2><p className="page-sub" style={{color:T.headerText}}>1年後・3年後・10年後のビジョンを描きましょう</p></div><div className="horizon-tabs">{HORIZONS.map(hz=>(<button key={hz.key} className={`horizon-tab${ah===hz.key?' active':''}`} style={ah===hz.key?{background:T.colors.yellow.bg,borderColor:T.colors.yellow.border,color:T.colors.yellow.label}:{background:T.bg,borderColor:T.colors.yellow.border,color:T.headerText}} onClick={()=>setAh(hz.key)}><span className="htab-icon">{hz.icon}</span><span className="htab-label">{hz.label}</span><span className="htab-sub" style={{color:T.headerText+'AA'}}>{hz.sub}</span></button>))}</div><div className="excel-grid-header" style={{background:T.header,border:`1px solid ${T.colors.yellow.border}`}}><span style={{color:T.headerText}}>{h.icon} {h.label} — {h.sub}</span></div><div className="excel-grid">{GRID_LAYOUT.map((row,ri)=>(<div key={ri} className="excel-row">{row.map(key=>{const cat=cm[key];return(<CatCard key={key} cat={cat} value={data[key]} onChange={e=>upd(ah,key,e.target.value)} T={T} placeholder={`${cat.label}の目標・ビジョンを入力…`}/>);})}</div>))}</div></div>);}
function ActionsPage({actions,setActions,T}){const [sm,setSm]=useState(new Date().getMonth()+1);const cm=Object.fromEntries(MONTH_CATS.map(c=>[c.key,c]));function upd(m,ck,v){setActions(p=>({...p,[String(m)]:{...p[String(m)],[ck]:v}}));}const cur=actions[String(sm)]||emptyMonthCategories();return(<div className="actions-page"><div className="page-header" style={{background:T.header,border:`1px solid ${T.colors.yellow.border}`}}><h2 className="page-title" style={{color:T.headerText}}>📅 月次アクションプラン</h2><p className="page-sub" style={{color:T.headerText}}>月ごとの9カテゴリを設定しましょう</p></div><div className="month-grid">{MONTHS.map((m,i)=>{const a=actions[String(i+1)];const hd=a&&Object.values(a).some(Boolean);return(<button key={i} className={`month-btn${sm===i+1?' active':''}${hd?' has-data':''}`} style={sm===i+1?{background:T.colors.yellow.bg,borderColor:T.colors.yellow.border,color:T.colors.yellow.label,fontWeight:700}:{background:T.bg,borderColor:T.colors.yellow.border,color:T.headerText}} onClick={()=>setSm(i+1)}>{m}{hd&&<span className="has-dot" style={{color:T.colors.pink.label}}>●</span>}</button>);})}</div><div className="excel-grid-header" style={{background:T.header,border:`1px solid ${T.colors.yellow.border}`}}><span style={{color:T.headerText}}>📅 {MONTHS[sm-1]} のアクションプラン</span></div><div className="excel-grid">{GRID_LAYOUT.map((row,ri)=>(<div key={ri} className="excel-row">{row.map(key=>{const cat=cm[key];return(<CatCard key={key} cat={cat} value={cur[key]} onChange={e=>upd(sm,key,e.target.value)} T={T} placeholder={`${cat.label}の今月のアクション…`}/>);})}</div>))}</div><div className="year-summary" style={{background:T.header,border:`1px solid ${T.colors.yellow.border}`}}><h3 className="visual-title" style={{color:T.headerText}}>📊 年間プラン一覧</h3><div className="summary-grid">{MONTHS.map((m,i)=>{const a=actions[String(i+1)];const f=a?Object.values(a).filter(Boolean).length:0;return(<div key={i} className={`summary-card${sm===i+1?' selected':''}`} style={{background:sm===i+1?T.colors.yellow.bg:T.bg,border:`1px solid ${T.colors.yellow.border}`}} onClick={()=>setSm(i+1)}><div className="summary-month" style={{color:T.colors.yellow.label}}>{m}</div><div className="summary-theme" style={{color:T.headerText}}>{a?.theme||'—'}</div><div className="summary-tasks" style={{color:T.headerText+'99'}}>{f}/9</div></div>);})}</div></div></div>);}
function ProfilePage({profile,setProfile,T,onSave}){const [local,setLocal]=useState({...profile});function hs(){setProfile(local);onSave(local);}return(<div className="profile-page"><div className="page-header" style={{background:T.header,border:`1px solid ${T.colors.yellow.border}`}}><h2 className="page-title" style={{color:T.headerText}}>👤 プロフィール</h2><p className="page-sub" style={{color:T.headerText}}>あなたの名前とアイコンを設定しましょう</p></div><div className="profile-card" style={{background:T.colors.yellow.bg,border:`1px solid ${T.colors.yellow.border}`}}><div className="profile-preview" style={{background:T.bg,border:`1px solid ${T.colors.yellow.border}`}}><span className="profile-emoji-big">{local.emoji}</span><span className="profile-name-preview" style={{color:T.headerText}}>{local.nickname||'ニックネーム未設定'}</span></div><label className="field-label" style={{color:T.headerText}}>ニックネーム</label><input className="profile-input" style={{background:T.bg,borderColor:T.colors.yellow.border,color:T.headerText}} placeholder="例：まさひこ" value={local.nickname} onChange={e=>setLocal(l=>({...l,nickname:e.target.value}))}/><label className="field-label" style={{color:T.headerText}}>絵文字アイコン</label><div className="emoji-grid">{EMOJI_LIST.map(em=>(<button key={em} className={`emoji-btn${local.emoji===em?' selected':''}`} style={{background:local.emoji===em?T.colors.yellow.bg:T.bg,borderColor:T.colors.yellow.border}} onClick={()=>setLocal(l=>({...l,emoji:em}))}>{em}</button>))}</div><button className="btn-primary" style={{background:T.colors.pink.bg,color:T.colors.pink.label,borderColor:T.colors.pink.border}} onClick={hs}>プロフィールを保存</button></div></div>);}
