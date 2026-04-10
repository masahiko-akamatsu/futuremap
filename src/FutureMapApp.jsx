import { useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CATEGORIES, TABS, INITIAL_DATA, THEME_LABELS } from './initialData';
import { exportToExcel } from './excelExport';

const GREEN = { 50:'#f0f9f4', 200:'#a8d5b8', 400:'#5aaa7a', 600:'#2e7d50', 800:'#1a5035' };

export default function FutureMapApp({ user }) {
  const [currentTab, setCurrentTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [editText, setEditText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [saveTimer, setSaveTimer] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'users', user.uid, 'futuremap', 'data');
        const snap = await getDoc(ref);
        if (snap.exists()) { setData(snap.data().content); }
        else { setData(JSON.parse(JSON.stringify(INITIAL_DATA))); }
      } catch (e) { console.error(e); setData(JSON.parse(JSON.stringify(INITIAL_DATA))); }
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
    } catch (e) { console.error('Save error:', e); }
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

  const openModal = (key) => {
    const tabId = TABS[currentTab].id;
    setEditingCard({ key, tabId });
    setEditText((data?.[tabId]?.[key]) || '');
  };

  const saveModal = () => {
    if (!editingCard) return;
    updateData(editingCard.tabId, editingCard.key, editText);
    setEditingCard(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportToExcel(data, user.displayName || user.email); }
    catch (e) { alert('エクスポートに失敗しました: ' + e.message); }
    setExporting(false);
  };

  if (loading) return <Loading />;

  const tab = TABS[currentTab];
  const tabData = data?.[tab.id] || {};
  const themeLabel = THEME_LABELS[tab.id];

  return (
    <div style={{ minHeight:'100vh', background:'#f4f8f5', fontFamily:"'Noto Sans JP',sans-serif" }}>
      <header style={{ background:`linear-gradient(135deg,${GREEN[800]} 0%,${GREEN[600]} 60%,${GREEN[400]} 100%)`, padding:'0', position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 12px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'14px 24px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ color:'#fff', fontSize:'20px', fontWeight:'700', margin:0, letterSpacing:'0.08em' }}>🗺️ フューチャーマップ</h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'11px', margin:'2px 0 0', letterSpacing:'0.1em' }}>FUTURE MAP — Life Design</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', paddingTop:'2px' }}>
            {saving?(<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)' }}>保存中...</span>):lastSaved?(<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)' }}>{lastSaved.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} 保存済み</span>):null}
            <button onClick={handleExport} disabled={exporting} style={{ padding:'7px 14px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'5px' }}>
              📊 {exporting?'エクスポート中...':'Excel出力'}
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color:'#fff', overflow:'hidden' }}>
                {user.photoURL?<img src={user.photoURL} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(user.displayName?.[0]||user.email?.[0]||'?').toUpperCase()}
              </div>
              <span style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.displayName||user.email}</span>
              <button onClick={()=>signOut(auth)} style={{ padding:'5px 10px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'6px', color:'rgba(255,255,255,0.7)', fontSize:'11px', cursor:'pointer', fontFamily:'inherit' }}>ログアウト</button>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'3px', padding:'10px 24px 0', overflowX:'auto' }}>
          {TABS.map((t,i)=>(
            <button key={t.id} onClick={()=>setCurrentTab(i)} style={{ padding:'9px 20px 11px', border:'none', borderRadius:'9px 9px 0 0', fontFamily:'inherit', fontSize:'13px', fontWeight:i===currentTab?'700':'500', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.2s', background:i===currentTab?'#f4f8f5':'rgba(255,255,255,0.12)', color:i===currentTab?GREEN[800]:'rgba(255,255,255,0.75)' }}>
              {t.label}<span style={{ display:'inline-block', marginLeft:'6px', padding:'1px 7px', borderRadius:'10px', fontSize:'10px', fontWeight:'400', background:i===currentTab?'rgba(46,125,80,0.12)':'rgba(255,255,255,0.15)', color:i===currentTab?GREEN[600]:'rgba(255,255,255,0.6)' }}>{t.period}</span>
            </button>
          ))}
        </div>
      </header>
      <main style={{ padding:'20px 24px 40px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
          <span style={{ fontSize:'13px', fontWeight:'600', color:GREEN[600], letterSpacing:'0.06em' }}>{tab.label} — {tab.period}</span>
          <div style={{ flex:1, height:'1px', background:'linear-gradient(to right,rgba(46,125,80,0.25),transparent)' }}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
          {CATEGORIES.map(cat=>{
            const label = cat.key==='theme'?themeLabel:cat.label;
            const content = tabData[cat.key]||'';
            const isTheme = cat.isTheme;
            return(
              <div key={cat.key} onClick={()=>openModal(cat.key)} style={{ background:'#fff', borderRadius:'14px', border:`1px solid ${isTheme?'rgba(212,168,67,0.25)':'rgba(76,175,120,0.18)'}`, cursor:'pointer', display:'flex', flexDirection:'column', minHeight:'180px', transition:'all 0.18s', overflow:'hidden' }} onMouseOver={e=>{e.currentTarget.style.borderColor=isTheme?'#d4a843':GREEN[400];e.currentTarget.style.boxShadow=`0 4px 18px ${isTheme?'rgba(212,168,67,0.15)':'rgba(76,175,120,0.15)'}`;e.currentTarget.style.transform='translateY(-2px)';}} onMouseOut={e=>{e.currentTarget.style.borderColor=isTheme?'rgba(212,168,67,0.25)':'rgba(76,175,120,0.18)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
                <div style={{ padding:'10px 14px 8px', background:isTheme?'linear-gradient(to right,#faf3e0,#fff)':'linear-gradient(to right,#f0f9f4,#fff)', borderBottom:`1px solid ${isTheme?'rgba(212,168,67,0.15)':'rgba(76,175,120,0.12)'}`, display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ width:'28px', height:'28px', borderRadius:'8px', flexShrink:0, background:isTheme?'rgba(212,168,67,0.15)':'rgba(76,175,120,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>{cat.icon}</span>
                  <span style={{ fontSize:'13px', fontWeight:'700', color:isTheme?'#8a5d0a':GREEN[800], letterSpacing:'0.04em' }}>{label}</span>
                </div>
                <div style={{ padding:'12px 14px', flex:1 }}>
                  {content?(<p style={{ fontSize:'12px', lineHeight:'1.85', color:'#4a5568', whiteSpace:'pre-wrap', margin:0, fontWeight:'300', display:'-webkit-box', WebkitLineClamp:7, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{content}</p>):(<p style={{ fontSize:'12px', color:'#c0c0c0', fontStyle:'italic', margin:0 }}>クリックして入力...</p>)}
                </div>
                <div style={{ padding:'6px 14px 9px', display:'flex', justifyContent:'flex-end', borderTop:'1px solid rgba(76,175,120,0.07)' }}>
                  <span style={{ fontSize:'11px', color:isTheme?'#d4a843':GREEN[600], background:isTheme?'rgba(212,168,67,0.08)':'rgba(76,175,120,0.08)', padding:'3px 9px', borderRadius:'5px', fontWeight:'500' }}>編集</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      {editingCard&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setEditingCard(null);}} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'#fff', borderRadius:'18px', width:'100%', maxWidth:'580px', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            <div style={{ padding:'18px 20px 16px', background:`linear-gradient(135deg,${GREEN[800]},${GREEN[600]})`, display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>{CATEGORIES.find(c=>c.key===editingCard.key)?.icon}</div>
              <div>
                <div style={{ fontSize:'16px', fontWeight:'700', color:'#fff', letterSpacing:'0.04em' }}>{editingCard.key==='theme'?themeLabel:CATEGORIES.find(c=>c.key===editingCard.key)?.label}</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>{tab.label} — {tab.period}</div>
              </div>
              <button onClick={()=>setEditingCard(null)} style={{ marginLeft:'auto', width:'30px', height:'30px', borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>×</button>
            </div>
            <div style={{ padding:'20px' }}>
              <label style={{ fontSize:'12px', color:'#666', fontWeight:'500', display:'block', marginBottom:'8px', letterSpacing:'0.04em' }}>目標・行動・ビジョンを入力</label>
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
