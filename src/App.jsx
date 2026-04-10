import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LoginPage from './LoginPage';
import FutureMapApp from './FutureMapApp';

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u || null));
  }, []);

  if (user === undefined) {
    return (
      <div style={{
        minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg, #1a5035, #4caf78)',
        fontFamily:"'Noto Sans JP',sans-serif",
      }}>
        <div style={{ textAlign:'center', color:'rgba(255,255,255,0.8)' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>🗺️</div>
          <p style={{ fontSize:'14px', letterSpacing:'0.1em' }}>起動中...</p>
        </div>
      </div>
    );
  }

  return user ? <FutureMapApp user={user} /> : <LoginPage />;
}
