import { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CATEGORIES, TABS, INITIAL_DATA, THEME_LABELS } from './initialData';
import { exportToExcel } from './excelExport';

const GREEN = { 50:'#f0f9f4', 200:'#a8d5b8', 400:'#5aaa7a', 600:'#2e7d50', 800:'#1a5035' };

function monthKey(year, month) { return year+'_'+String(month).padStart(2,'0'); }
function monthLabel(year, month) { return year+'年'+month+'月'; }
function parseMonthKey(key) { const [y,m]=key.split('_'); return {year:parseInt(y),month:parseInt(m)}; }

export default function FutureMapApp({ user }) {
  const now = new Date();
  const todayKey = monthKey(now.getFullYear(), now.getMonth()+1);
  const [currentTab, setCurrentTab] = useState(0);
  const [data, setData] = useState(null);
  const [monthKeys, setMonthKeys] = useState([]);
  const [activeMonthKey, setActiveMonthKey] = useState(todayKey);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [editText, setEditText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [saveTimer, setSaveTimer] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newYear, setNewYear] = useState(now.getFullYear());
  const [newMonth, setNewMonth] = useState(now.getMonth()+1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'users', user.uid, 'futuremap', 'data');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const content = snap.data().content;
          let migrated = { ...content };
          if (content.month && !Object.keys(content).some(k=>k.startsWith('month_'))) {
            migrated[todayKey] = content.month;
            delete migrated.month;
          }
          setData(migrated);
          const mKeys = Object.keys(migrated).filter(k=>k.startsWith('month_')).sort();
          setMonthKeys(mKeys);
          if (mKeys.length > 0 && !mKeys.includes(todayKey)) {
            setActiveMonthKey(mKeys[mKeys.length-1]);
          }
        } else {
          const initData = { ...INITIAL_DATA, [todayKey]: INITIAL_DATA.month };
          delete initData.month;
          setData(initData);
          setMonthKeys([todayKey]);
        }
      } catch(e) {
        console.error(e);
        const initData = { ...INITIAL_DATA, [todayKey]: INITIAL_DATA.month };
        delete initData.month;
        setData(initData);
        setMonthKeys([todayKey]);
      }
      setLoading(false);
    };
    load();
  }, [user.uid]);

  const saveToFirestore = useCallback(async (newData) => {
    setSaving(true);
    try {
      const ref = doc(db, 'users', user.uid, 'futuremap', 'data');
      await setDoc(ref, { content: newData, updatedAt: serverTimestamp() });
      setLastSaved(new Date());
    } catch(e) { console.error(e); }
    setSaving(false);
  }, [user.uid]);

  const updateData = (tabId, key, value) => {
    setData(prev => {
      const next = { ...prev, [tabId]: { ...prev[tabId], [key]: value } };
      if (saveTimer) clearTimeout(saveTimer);
      const t = setTimeout(() => saveToFirestore(next), 1500);
      setSaveTimer(t);
      return next;
    });
  };

  const addMonth = (sourceKey) => {
    const nk = monthKey(newYear, newMonth);
    if (monthKeys.includes(nk)) {
      setActiveMonthKey(nk); setCurrentTab(0); setShowAddModal(false); return;
    }
    const sourceData = sourceKey ? { ...(data[sourceKey]||{}) } : {};
    setData(prev => {
      const next = { ...prev, [nk]: sourceData };
      const newKeys = [...new Set([...monthKeys, nk])].sort();
      setMonthKeys(newKeys);
      saveToFirestore(next);
      return next;
    });
    setActiveMonthKey(nk); setCurrentTab(0); setShowAddModal(false);
  };

  const openModal = (key) => {
    const tabId = currentTab===0 ? activeMonthKey : TABS[currentTab].id;
    setEditingCard({ key, tabId });
    setEditText((data?.[tabId]?.[key])||'');
  };

  const saveModal = () => {
    if (!editingCard) return;
    updateData(editingCard.tabId, editingCard.key, editText);
    setEditingCard(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportData = { ...data, month: data[activeMonthKey]||{} };
      await exportToExcel(exportData, user.displayName||user.email);
    } catch(e) { alert('エクスポートに失敗しました: '+e.message); }
    setExporting(false);
  };

  if (loading) return <Loading />;

  const tab = TABS[currentTab];
  const tabId = currentTab===0 ? activeMonthKey : tab.id;
  const tabData = data?.[tabId]||{};
  const isMonthTab = currentTab===0;
  const {year:activeYear, month:activeMonth} = parseMonthKey(activeMonthKey);
  const isToday = activeMonthKey===todayKey;
  const themeLabel = isMonthTab ? (monthLabel(activeYear,activeMonth)+'のテーマ&感情') : THEME_LABELS[tab.id];
  const copyOptions = [...monthKeys].sort().reverse().slice(0,5);
  const newKey = monthKey(newYear, newMonth);
  const alreadyExists = monthKeys.includes(newKey);

  return (
    <div style={{ minHeight:'100vh', background:'#f4f8f5', fontFamily:"'Noto Sans JP',sans-serif" }}>
      <header style={{ background:'linear-gradient(135deg,'+GREEN[800]+' 0%,'+GREEN[600]+' 60%,'+GREEN[400]+' 100%)', padding:'0', position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 12px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'14px 24px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:'20px', fontWeight:'700', margin:0, letterSpacing:'0.08em' }}>🗺️ フューチャーマップ</h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'11px', margin:'2px 0 0', letterSpacing:'0.1em' }}>FUTURE MAP — Life Design</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', paddingTop:'2px' }}>
            {saving?<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>保存中...</span>:lastSaved?<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)' }}>{lastSaved.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} 保存済み</span>:null}
            <button onClick={handleExport} disabled={exporting} style={{ padding:'7px 14px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit' }}>📊 {exporting?'出力中...':'Excel出力'}</button>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#fff', overflow:'hidden' }}>
                {user.photoURL?<img src={user.photoURL} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(user.displayName?.[0]||user.email?.[0]||'?').toUpperCase()}
              </div>
              <span style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.displayName||user.email}</span>
              <button onClick={()=>signOut(auth)} style={{ padding:'5px 10px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'6px', color:'rgba(255,255,255,0.7)', fontSize:'11px', cursor:'pointer', fontFamily:'inherit' }}>ログアウト</button>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'2px', padding:'10px 24px 0', overflowX:'auto', alignItems:'flex-end' }}>
          {monthKeys.map(mk=>{
            const {year:y,month:m}=parseMonthKey(mk);
            const isActive=currentTab===0&&activeMonthKey===mk;
            const isTodayMk=mk===todayKey;
            return(
              <button key={mk} onClick={()=>{setCurrentTab(0);setActiveMonthKey(mk);}}
                style={{ padding:'8px 14px 10px', border:'none', borderRadius:'9px 9px 0 0', fontFamily:'inherit', fontSize:'12px', fontWeight:isActive?'700':'400', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', background:isActive?'#f4f8f5':'rgba(255,255,255,0.12)', color:isActive?GREEN[800]:'rgba(255,255,255,0.8)' }}>
                {y}年{m}月{isTodayMk&&<span style={{ display:'inline-block', marginLeft:'3px', width:'5px', height:'5px', borderRadius:'50%', background:isActive?GREEN[400]:'rgba(255,255,255,0.9)', verticalAlign:'middle', marginBottom:'1px' }}/>}
              </button>
            );
          })}
          <button onClick={()=>{setNewYear(now.getFullYear());setNewMonth(now.getMonth()+1);setShowAddModal(true);}}
            style={{ padding:'7px 13px 9px', border:'1px dashed rgba(255,255,255,0.5)', borderBottom:'none', borderRadius:'9px 9px 0 0', fontFamily:'inherit', fontSize:'13px', fontWeight:'700', cursor:'pointer', background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.9)', marginLeft:'2px' }}>
            ＋
          </button>
          <div style={{ width:'1px', background:'rgba(255,255,255,0.25)', margin:'0 6px', alignSelf:'stretch', marginBottom:0 }}/>
          {TABS.slice(1).map((t,i)=>{
            const isActive=currentTab===i+1;
            return(
              <button key={t.id} onClick={()=>setCurrentTab(i+1)}
                style={{ padding:'9px 16px 11px', border:'none', borderRadius:'9px 9px 0 0', fontFamily:'inherit', fontSize:'13px', fontWeight:isActive?'700':'500', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', background:isActive?'#f4f8f5':'rgba(255,255,255,0.12)', color:isActive?GREEN[800]:'rgba(255,255,255,0.75)' }}>
                {t.label}<span style={{ display:'inline-block', marginLeft:'5px', padding:'1px 6px', borderRadius:'10px', fontSize:'10px', background:isActive?'rgba(46,125,80,0.12)':'rgba(255,255,255,0.15)', color:isActive?GREEN[600]:'rgba(255,255,255,0.6)' }}>{t.period}</span>
              </button>
            );
          })}
        </div>
      </header>
      <main style={{ padding:'20px 24px 40px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
          {isMonthTab?(
            <>
              <span style={{ fontSize:'16px', fontWeight:'700', color:GREEN[800] }}>{monthLabel(activeYear,activeMonth)}</span>
              {isToday&&<span style={{ fontSize:'11px', background:GREEN[400], color:'#fff', padding:'2px 9px', borderRadius:'10px', fontWeight:'600' }}>今月</span>}
            </>
          ):(
            <span style={{ fontSize:'13px', fontWeight:'600', color:GREEN[600], letterSpacing:'0.06em' }}>{tab.label} — {tab.period}</span>
          )}
          <div style={{ flex:1, height:'1px', background:'linear-gradient(to right,rgba(46,125,80,0.25),transparent)' }}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
          {CATEGORIES.map(cat=>{
            const label=cat.key==='theme'?themeLabel:cat.label;
            const content=tabData[cat.key]||'';
            const isTheme=cat.isTheme;
            return(
              <div key={cat.key} onClick={()=>openModal(cat.key)}
                style={{ background:'#fff', borderRadius:'14px', border:'1px solid '+(isTheme?'rgba(212,168,67,0.25)':'rgba(76,175,120,0.18)'), cursor:'pointer', display:'flex', flexDirection:'column', minHeight:'180px', transition:'all 0.18s', overflow:'hidden' }}
                onMouseOver={e=>{e.currentTarget.style.borderColor=isTheme?'#d4a843':GREEN[400];e.currentTarget.style.boxShadow='0 4px 18px '+(isTheme?'rgba(212,168,67,0.15)':'rgba(76,175,120,0.15)');e.currentTarget.style.transform='translateY(-2px)';}}
                onMouseOut={e=>{e.currentTarget.style.borderColor=isTheme?'rgba(212,168,67,0.25)':'rgba(76,175,120,0.18)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
                <div style={{ padding:'10px 14px 8px', background:isTheme?'linear-gradient(to right,#faf3e0,#fff)':'linear-gradient(to right,#f0f9f4,#fff)', borderBottom:'1px solid '+(isTheme?'rgba(212,168,67,0.15)':'rgba(76,175,120,0.12)'), display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ width:'28px', height:'28px', borderRadius:'8px', flexShrink:0, background:isTheme?'rgba(212,168,67,0.15)':'rgba(76,175,120,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>{cat.icon}</span>
                  <span style={{ fontSize:'13px', fontWeight:'700', color:isTheme?'#8a5d0a':GREEN[800], letterSpacing:'0.04em' }}>{label}</span>
                </div>
                <div style={{ padding:'12px 14px', flex:1 }}>
                  {content?<p style={{ fontSize:'12px', lineHeight:'1.85', color:'#4a5568', whiteSpace:'pre-wrap', margin:0, fontWeight:'300', display:'-webkit-box', WebkitLineClamp:7, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{content}</p>:<p style={{ fontSize:'12px', color:'#c0c0c0', fontStyle:'italic', margin:0 }}>クリックして入力...</p>}
                </div>
                <div style={{ padding:'6px 14px 9px', display:'flex', justifyContent:'flex-end', borderTop:'1px solid rgba(76,175,120,0.07)' }}>
                  <span style={{ fontSize:'11px', color:isTheme?'#d4a843':GREEN[600], background:isTheme?'rgba(212,168,67,0.08)':'rgba(76,175,120,0.08)', padding:'3px 9px', borderRadius:'5px', fontWeight:'500' }}>編集</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      {showAddModal&&(
        <div onClick={()=>setShowAddModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:'18px', width:'100%', maxWidth:'440px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            <div style={{ padding:'18px 20px 16px', background:'linear-gradient(135deg,'+GREEN[800]+','+GREEN[600]+')', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ fontSize:'22px' }}>📅</div>
              <div>
                <div style={{ fontSize:'16px', fontWeight:'700', color:'#fff' }}>月のアクションプランを追加</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', marginTop:'2px' }}>年月を選んで作成してください</div>
              </div>
              <button onClick={()=>setShowAddModal(false)} style={{ marginLeft:'auto', width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
            <div style={{ padding:'22px 20px 20px' }}>
              <div style={{ marginBottom:'20px' }}>
                <label style={{ fontSize:'12px', color:'#666', fontWeight:'600', display:'block', marginBottom:'10px', letterSpacing:'0.04em' }}>① 追加する年月を選択</label>
                <div style={{ display:'flex', gap:'10px' }}>
                  <select value={newYear} onChange={e=>setNewYear(parseInt(e.target.value))}
                    style={{ flex:1, padding:'10px 12px', border:'1px solid '+GREEN[400], borderRadius:'9px', fontFamily:'inherit', fontSize:'14px', fontWeight:'600', color:GREEN[800], cursor:'pointer', outline:'none', background:'#fff' }}>
                    {[now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1].map(y=><option key={y} value={y}>{y}年</option>)}
                  </select>
                  <select value={newMonth} onChange={e=>setNewMonth(parseInt(e.target.value))}
                    style={{ flex:1, padding:'10px 12px', border:'1px solid '+GREEN[400], borderRadius:'9px', fontFamily:'inherit', fontSize:'14px', fontWeight:'600', color:GREEN[800], cursor:'pointer', outline:'none', background:'#fff' }}>
                    {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}
                  </select>
                </div>
                {alreadyExists&&<p style={{ fontSize:'12px', color:'#d4860a', marginTop:'8px', background:'#fff8e1', padding:'6px 10px', borderRadius:'7px' }}>⚠️ {monthLabel(newYear,newMonth)}は既に存在します。選択すると移動します。</p>}
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#666', fontWeight:'600', display:'block', marginBottom:'10px', letterSpacing:'0.04em' }}>② コピー元を選択（任意）</label>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {copyOptions.map(mk=>{
                    const {year:y,month:m}=parseMonthKey(mk);
                    return(
                      <button key={mk} onClick={()=>addMonth(mk)}
                        style={{ padding:'11px 16px', border:'1px solid '+GREEN[400], borderRadius:'10px', background:'rgba(76,175,120,0.04)', color:GREEN[800], fontSize:'14px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:'10px' }}
                        onMouseOver={e=>{e.currentTarget.style.background='rgba(76,175,120,0.1)';e.currentTarget.style.borderColor=GREEN[600];}}
                        onMouseOut={e=>{e.currentTarget.style.background='rgba(76,175,120,0.04)';e.currentTarget.style.borderColor=GREEN[400];}}>
                        <span>📋</span>
                        <span>{monthLabel(y,m)} のデータをコピー</span>
                        {mk===todayKey&&<span style={{ marginLeft:'auto', fontSize:'10px', background:GREEN[400], color:'#fff', padding:'1px 7px', borderRadius:'8px' }}>今月</span>}
                      </button>
                    );
                  })}
                  {copyOptions.length>0&&<div style={{ height:'1px', background:'#efefef', margin:'2px 0' }}/>}
                  <button onClick={()=>addMonth(null)}
                    style={{ padding:'11px 16px', border:'1px solid #e0e0e0', borderRadius:'10px', background:'#fff', color:'#777', fontSize:'14px', fontWeight:'500', cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'center', gap:'10px' }}
                    onMouseOver={e=>{e.currentTarget.style.background='#f8f8f8';}}
                    onMouseOut={e=>{e.currentTarget.style.background='#fff';}}>
                    <span>📝</span><span>白紙から作成する</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingCard&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setEditingCard(null);}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'#fff', borderRadius:'18px', width:'100%', maxWidth:'580px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            <div style={{ padding:'18px 20px 16px', background:'linear-gradient(135deg,'+GREEN[800]+','+GREEN[600]+')', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>{CATEGORIES.find(c=>c.key===editingCard.key)?.icon}</div>
              <div>
                <div style={{ fontSize:'16px', fontWeight:'700', color:'#fff' }}>{editingCard.key==='theme'?themeLabel:CATEGORIES.find(c=>c.key===editingCard.key)?.label}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>{isMonthTab?monthLabel(activeYear,activeMonth):(tab.label+' — '+tab.period)}</div>
              </div>
              <button onClick={()=>setEditingCard(null)} style={{ marginLeft:'auto', width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>×</button>
            </div>
            <div style={{ padding:'20px' }}>
              <label style={{ fontSize:'12px', color:'#666', fontWeight:'500', display:'block', marginBottom:'8px' }}>目標・行動・ビジョンを入力</label>
              <textarea value={editText} onChange={e=>setEditText(e.target.value)} autoFocus rows={10} style={{ width:'100%', border:'1px solid rgba(76,175,120,0.3)', borderRadius:'10px', padding:'12px 14px', fontFamily:'inherit', fontSize:'13px', lineHeight:'1.85', color:'#3a3a3a', resize:'vertical', outline:'none', boxSizing:'border-box' }} onFocus={e=>e.target.style.borderColor=GREEN[400]} onBlur={e=>e.target.style.borderColor='rgba(76,175,120,0.3)'}/>
            </div>
            <div style={{ padding:'12px 20px 18px', display:'flex', gap:'10px', justifyContent:'flex-end', borderTop:'1px solid #f0f0f0' }}>
              <button onClick={()=>setEditingCard(null)} style={{ padding:'9px 20px', border:'1px solid #e0e0e0', background:'#fff', borderRadius:'9px', fontFamily:'inherit', fontSize:'13px', cursor:'pointer', color:'#666' }}>キャンセル</button>
              <button onClick={saveModal} style={{ padding:'9px 24px', background:GREEN[600], border:'none', borderRadius:'9px', fontFamily:'inherit', fontSize:'13px', fontWeight:'700', cursor:'pointer', color:'#fff' }}>保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (<div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1a5035,#2e7d50)', fontFamily:"'Noto Sans JP',sans-serif", flexDirection:'column', gap:'16px' }}>
    <div style={{ fontSize:'40px' }}>🗺️</div>
    <p style={{ color:'rgba(255,255,255,0.8)', fontSize:'14px', letterSpacing:'0.1em' }}>読み込み中...</p>
  </div>);
}
