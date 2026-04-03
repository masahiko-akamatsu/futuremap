import { useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import * as XLSX from 'xlsx';
import './App.css';

const HORIZONS = [
  { key: 'y1',  label: '1年後',  color: '#4ade80', icon: '🌱' },
  { key: 'y3',  label: '3年後',  color: '#60a5fa', icon: '🌿' },
  { key: 'y10', label: '10年後', color: '#f472b6', icon: '🌳' },
];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const EMOJI_LIST = ['😊','🚀','🌸','⭐','🔥','💪','🎯','🌈','🦋','🌺','🎨','🏆','💡','🌙','🌊'];
const DEFAULT_GOALS = {
  y1:  { title: '', items: ['','',''] },
  y3:  { title: '', items: ['','',''] },
  y10: { title: '', items: ['','',''] },
};
const DEFAULT_ACTIONS = () =>
  Object.fromEntries(Array.from({length:12},(_,i)=>[String(i+1),{theme:'',tasks:['','','']}]));
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('map');
  const [authMode, setAuthMode] = useState('login');
  const [profile, setProfile] = useState({ nickname:'', emoji:'😊' });
  const [goals, setGoals] = useState(deepClone(DEFAULT_GOALS));
  const [actions, setActions] = useState(DEFAULT_ACTIONS());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await loadUserData(u.uid);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function loadUserData(uid) {
    try {
      const snap = await getDoc(doc(db,'users',uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.profile) setProfile(d.profile);
        if (d.goals)   setGoals(d.goals);
        if (d.actions) setActions(d.actions);
      }
    } catch(e){ console.error(e); }
  }

  const saveAll = useCallback(async (p,g,a) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db,'users',user.uid),{
        profile: p??profile, goals: g??goals, actions: a??actions,
        updatedAt: serverTimestamp()
      },{merge:true});
      showToast('保存しました ✓');
    } catch(e){ showToast('保存エラー: '+e.message); }
    finally { setSaving(false); }
  },[user,profile,goals,actions]);

  function showToast(msg){ setToast(msg); setTimeout(()=>setToast(''),2500); }

  async function handleAuth(e) {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      if (authMode==='register') {
        await createUserWithEmailAndPassword(auth,email,password);
        showToast('登録完了！');
      } else {
        await signInWithEmailAndPassword(auth,email,password);
        showToast('ログインしました');
      }
    } catch(err){ showToast(err.message); }
  }

  async function handleLogout() {
    await signOut(auth);
    setGoals(deepClone(DEFAULT_GOALS));
    setActions(DEFAULT_ACTIONS());
    setProfile({nickname:'',emoji:'😊'});
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const mapRows = [['期間','目標タイトル','項目1','項目2','項目3']];
    HORIZONS.forEach(h=>{
      const g=goals[h.key];
      mapRows.push([h.label,g.title,g.items[0]||'',g.items[1]||'',g.items[2]||'']);
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(mapRows),'フューチャーマップ');
    const actRows = [['月','テーマ','タスク1','タスク2','タスク3']];
    MONTHS.forEach((m,i)=>{
      const a=actions[String(i+1)];
      actRows.push([m,a?.theme||'',a?.tasks?.[0]||'',a?.tasks?.[1]||'',a?.tasks?.[2]||'']);
    });
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(actRows),'アクションプラン');
    XLSX.writeFile(wb,'futuremap_export.xlsx');
    showToast('Excelをダウンロードしました');
  }

  function importExcel(e) {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result,{type:'binary'});
        const mapSheet = wb.Sheets['フューチャーマップ'];
        if (mapSheet) {
          const rows = XLSX.utils.sheet_to_json(mapSheet,{header:1});
          const ng = deepClone(DEFAULT_GOALS);
          rows.slice(1).forEach(row=>{
            const h = HORIZONS.find(x=>x.label===row[0]);
            if(h){ ng[h.key].title=row[1]||''; ng[h.key].items=[row[2]||'',row[3]||'',row[4]||'']; }
          });
          setGoals(ng);
        }
        const actSheet = wb.Sheets['アクションプラン'];
        if (actSheet) {
          const rows = XLSX.utils.sheet_to_json(actSheet,{header:1});
          const na = DEFAULT_ACTIONS();
          rows.slice(1).forEach(row=>{
            const mi = MONTHS.indexOf(row[0]);
            if(mi>=0){ const k=String(mi+1); na[k].theme=row[1]||''; na[k].tasks=[row[2]||'',row[3]||'',row[4]||'']; }
          });
          setActions(na);
        }
        showToast('Excelを取り込みました'); e.target.value='';
      } catch(err){ showToast('読み込みエラー: '+err.message); }
    };
    reader.readAsBinaryString(file);
  }

  if (loading) return <div className="splash"><div className="splash-logo">🗺️</div><div className="splash-text">FutureMap</div></div>;
  if (!user) return <AuthPage authMode={authMode} setAuthMode={setAuthMode} onSubmit={handleAuth} />;

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}
      <header className="header">
        <div className="header-left"><span className="logo">🗺️ FutureMap</span></div>
        <nav className="nav">
          <button className={page==='map'?'nav-btn active':'nav-btn'} onClick={()=>setPage('map')}>マップ</button>
          <button className={page==='actions'?'nav-btn active':'nav-btn'} onClick={()=>setPage('actions')}>アクション</button>
          <button className={page==='profile'?'nav-btn active':'nav-btn'} onClick={()=>setPage('profile')}>プロフィール</button>
        </nav>
        <div className="header-right">
          <span className="user-badge">{profile.emoji} {profile.nickname||user.email}</span>
          <button className="btn-logout" onClick={handleLogout}>ログアウト</button>
        </div>
      </header>
      <div className="toolbar">
        <label className="btn-tool">📥 Excelインポート<input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{display:'none'}} /></label>
        <button className="btn-tool" onClick={exportExcel}>📤 Excelエクスポート</button>
        <button className="btn-save" onClick={()=>saveAll()} disabled={saving}>{saving?'保存中…':'💾 保存'}</button>
      </div>
      <main className="main">
        {page==='map'     && <MapPage goals={goals} setGoals={setGoals} />}
        {page==='actions' && <ActionsPage actions={actions} setActions={setActions} />}
        {page==='profile' && <ProfilePage profile={profile} setProfile={setProfile} onSave={(p)=>saveAll(p,null,null)} />}
      </main>
    </div>
  );
}

function AuthPage({authMode,setAuthMode,onSubmit}) {
  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🗺️</div>
        <h1 className="auth-title">FutureMap</h1>
        <p className="auth-sub">あなたの未来を描こう</p>
        <form onSubmit={onSubmit} className="auth-form">
          <input name="email" type="email" placeholder="メールアドレス" required className="auth-input" />
          <input name="password" type="password" placeholder="パスワード（6文字以上）" required className="auth-input" />
          <button type="submit" className="auth-submit">{authMode==='login'?'ログイン':'アカウント作成'}</button>
        </form>
        <button className="auth-toggle" onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>
          {authMode==='login'?'→ 新規登録はこちら':'→ ログインはこちら'}
        </button>
      </div>
    </div>
  );
}

function MapPage({goals,setGoals}) {
  function updateGoal(key,field,value){ setGoals(prev=>({...prev,[key]:{...prev[key],[field]:value}})); }
  function updateItem(key,idx,value){ setGoals(prev=>{ const items=[...prev[key].items]; items[idx]=value; return {...prev,[key]:{...prev[key],items}}; }); }
  return (
    <div className="map-page">
      <h2 className="page-title">🗺️ フューチャーマップ</h2>
      <p className="page-sub">1年後・3年後・10年後の目標を描きましょう</p>
      <div className="horizons">
        {HORIZONS.map(h=>(
          <div className="horizon-card" key={h.key} style={{'--accent':h.color}}>
            <div className="horizon-header"><span className="horizon-icon">{h.icon}</span><span className="horizon-label">{h.label}</span></div>
            <input className="horizon-title-input" placeholder={`${h.label}の大目標`} value={goals[h.key].title} onChange={e=>updateGoal(h.key,'title',e.target.value)} />
            <div className="horizon-items">
              {goals[h.key].items.map((item,idx)=>(
                <div className="item-row" key={idx}>
                  <span className="item-num">{idx+1}</span>
                  <input className="item-input" placeholder={`目標項目 ${idx+1}`} value={item} onChange={e=>updateItem(h.key,idx,e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="map-visual">
        <h3 className="visual-title">📍 未来へのロードマップ</h3>
        <div className="timeline">
          {HORIZONS.map((h,i)=>(
            <div className="timeline-item" key={h.key}>
              <div className="timeline-dot" style={{background:h.color}} />
              {i<HORIZONS.length-1 && <div className="timeline-line" />}
              <div className="timeline-content">
                <div className="tl-label" style={{color:h.color}}>{h.label}</div>
                <div className="tl-main">{goals[h.key].title||'（未設定）'}</div>
                {goals[h.key].items.filter(Boolean).map((it,j)=><div className="tl-item" key={j}>・{it}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionsPage({actions,setActions}) {
  const [selectedMonth,setSelectedMonth] = useState(new Date().getMonth()+1);
  function updateAction(month,field,value){ setActions(prev=>({...prev,[String(month)]:{...prev[String(month)],[field]:value}})); }
  function updateTask(month,idx,value){ setActions(prev=>{ const tasks=[...(prev[String(month)]?.tasks||['','',''])]; tasks[idx]=value; return {...prev,[String(month)]:{...prev[String(month)],tasks}}; }); }
  const cur = actions[String(selectedMonth)]||{theme:'',tasks:['','','']};
  return (
    <div className="actions-page">
      <h2 className="page-title">📅 月次アクションプラン</h2>
      <p className="page-sub">月ごとのテーマとタスクを設定しましょう</p>
      <div className="month-grid">
        {MONTHS.map((m,i)=>{
          const a=actions[String(i+1)]; const hasData=a?.theme||a?.tasks?.some(Boolean);
          return <button key={i} className={`month-btn ${selectedMonth===i+1?'active':''} ${hasData?'has-data':''}`} onClick={()=>setSelectedMonth(i+1)}>{m}</button>;
        })}
      </div>
      <div className="month-editor">
        <h3 className="month-editor-title">{MONTHS[selectedMonth-1]} のプラン</h3>
        <label className="field-label">月のテーマ</label>
        <input className="theme-input" placeholder="例：健康習慣を確立する月" value={cur.theme} onChange={e=>updateAction(selectedMonth,'theme',e.target.value)} />
        <label className="field-label">タスク</label>
        {(cur.tasks||['','','']).map((task,idx)=>(
          <div className="task-row" key={idx}>
            <span className="task-num">✓</span>
            <input className="task-input" placeholder={`タスク ${idx+1}`} value={task} onChange={e=>updateTask(selectedMonth,idx,e.target.value)} />
          </div>
        ))}
      </div>
      <div className="year-summary">
        <h3 className="visual-title">📊 年間プラン一覧</h3>
        <div className="summary-grid">
          {MONTHS.map((m,i)=>{
            const a=actions[String(i+1)];
            return (
              <div key={i} className={`summary-card ${selectedMonth===i+1?'selected':''}`} onClick={()=>setSelectedMonth(i+1)}>
                <div className="summary-month">{m}</div>
                <div className="summary-theme">{a?.theme||'—'}</div>
                <div className="summary-tasks">{(a?.tasks||[]).filter(Boolean).length} タスク</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfilePage({profile,setProfile,onSave}) {
  const [local,setLocal] = useState({...profile});
  function handleSave(){ setProfile(local); onSave(local); }
  return (
    <div className="profile-page">
      <h2 className="page-title">👤 プロフィール</h2>
      <p className="page-sub">あなたの名前とアイコンを設定しましょう</p>
      <div className="profile-card">
        <div className="profile-preview">
          <span className="profile-emoji-big">{local.emoji}</span>
          <span className="profile-name-preview">{local.nickname||'ニックネーム未設定'}</span>
        </div>
        <label className="field-label">ニックネーム</label>
        <input className="profile-input" placeholder="例：まさひこ" value={local.nickname} onChange={e=>setLocal(l=>({...l,nickname:e.target.value}))} />
        <label className="field-label">絵文字アイコン</label>
        <div className="emoji-grid">
          {EMOJI_LIST.map(em=>(
            <button key={em} className={`emoji-btn ${local.emoji===em?'selected':''}`} onClick={()=>setLocal(l=>({...l,emoji:em}))}>{em}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={handleSave}>プロフィールを保存</button>
      </div>
    </div>
  );
}
