import { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleGoogle = async () => {
    setLoading(true); setError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { setError('Googleログインに失敗しました'); }
    setLoading(false);
  };
  const handleEmail = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (mode === 'login') { await signInWithEmailAndPassword(auth, email, password); }
      else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(cred.user, { displayName });
      }
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'メールアドレスが見つかりません',
        'auth/wrong-password': 'パスワードが間違っています',
        'auth/email-already-in-use': 'このメールアドレスは既に登録済みです',
        'auth/weak-password': 'パスワードは6文字以上で入力してください',
        'auth/invalid-email': 'メールアドレスの形式が正しくありません',
        'auth/invalid-credential': 'メールアドレスまたはパスワードが間違っています',
      };
      setError(msgs[err.code] || `エラー: ${err.message}`);
    }
    setLoading(false);
  };
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1a5035 0%,#2e7d50 50%,#4caf78 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:"'Noto Sans JP',sans-serif" }}>
      <div style={{ background:'#fff', borderRadius:'20px', padding:'40px', width:'100%', maxWidth:'420px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontSize:'36px', marginBottom:'8px' }}>🗺️</div>
          <h1 style={{ fontSize:'24px', fontWeight:'700', color:'#1a5035', margin:'0 0 4px', letterSpacing:'0.08em' }}>フューチャーマップ</h1>
          <p style={{ fontSize:'12px', color:'#888', letterSpacing:'0.12em', margin:0 }}>FUTURE MAP — Life Design</p>
        </div>
        <div style={{ display:'flex', background:'#f0f9f4', borderRadius:'10px', padding:'4px', marginBottom:'24px' }}>
          {['login','signup'].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError('');}} style={{ flex:1, padding:'8px', border:'none', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:'600', transition:'all 0.2s', background:mode===m?'#fff':'transparent', color:mode===m?'#1a5035':'#888', boxShadow:mode===m?'0 1px 4px rgba(0,0,0,0.1)':'none' }}>
              {m==='login'?'ログイン':'新規登録'}
            </button>
          ))}
        </div>
        <form onSubmit={handleEmail}>
          {mode==='signup'&&(<input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="お名前（表示名）" style={inputStyle}/>)}
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="メールアドレス" required style={inputStyle}/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="パスワード（6文字以上）" required style={{...inputStyle,marginBottom:'20px'}}/>
          {error&&(<div style={{ background:'#fff5f5', border:'1px solid #fed7d7', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#c53030', marginBottom:'14px' }}>{error}</div>)}
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'13px', background:loading?'#a0c4b0':'#2e7d50', border:'none', borderRadius:'10px', cursor:loading?'not-allowed':'pointer', fontFamily:'inherit', fontSize:'15px', fontWeight:'700', color:'#fff' }}>
            {loading?'処理中...':(mode==='login'?'ログイン':'登録する')}
          </button>
        </form>
      </div>
    </div>
  );
}
const inputStyle={width:'100%',padding:'11px 14px',border:'1px solid #e0e0e0',borderRadius:'10px',fontFamily:"'Noto Sans JP',sans-serif",fontSize:'14px',color:'#333',marginBottom:'12px',outline:'none',boxSizing:'border-box',transition:'border-color 0.2s'};
