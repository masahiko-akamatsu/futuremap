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

const CATEGORIES = [
  { key: 'home',     label: '居住環境',        icon: '🏠' },
  { key: 'study',    label: '学び',            icon: '📚' },
  { key: 'hobby',    label: '趣味・余暇・遊び',  icon: '🎯' },
  { key: 'family',   label: '家族・パートナー',  icon: '👨‍👩‍👧' },
  { key: 'theme',    label: '人生のテーマ&感情', icon: '✨', wide: true },
  { key: 'health',   label: '健康',            icon: '💚' },
  { key: 'relation', label: '人間性・人間関係',  icon: '🤝' },
  { key: 'work',     label: '仕事・社会貢献',   icon: '💼' },
  { key: 'money',    label: 'お金・物欲',       icon: '💴' },
];

const HORIZONS = [
  { key: 'y1',  label: '1年後',  sub: '2026年12月31日（58歳）', icon: '🌱' },
  { key: 'y3',  label: '3年後',  sub: '2028年12月31日（60歳）', icon: '🌿' },
  { key: 'y10', label: '10年後', sub: '2035年12月31日（67歳）', icon: '🌳' },
];

const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const EMOJI_LIST = ['😊','🚀','🌸','⭐','🔥','💪','🎯','🌈','🦋','🌺','🎨','🏆','💡','🌙','🌊'];

const MONTH_CATS = [
  { key: 'home',     label: '居住環境',        icon: '🏠' },
  { key: 'study',    label: '学び',            icon: '📚' },
  { key: 'hobby',    label: '趣味・余暇・遊び',  icon: '🎯' },
  { key: 'family',   label: '家族・パートナー',  icon: '👨‍👩‍👧' },
  { key: 'theme',    label: '今月のテーマ&感情', icon: '✨', wide: true },
  { key: 'health',   label: '健康',            icon: '💚' },
  { key: 'relation', label: '人間性・人間関係',  icon: '🤝' },
  { key: 'work',     label: '仕事・社会貢献',   icon: '💼' },
  { key: 'money',    label: 'お金・物欲',       icon: '💴' },
];

function emptyCategories() {
  return Object.fromEntries(CATEGORIES.map(c => [c.key, '']));
}
function emptyMonthCategories() {
  return Object.fromEntries(MONTH_CATS.map(c => [c.key, '']));
}

const DEFAULT_GOALS = {
  y1:  emptyCategories(),
  y3:  emptyCategories(),
  y10: emptyCategories(),
};
const DEFAULT_ACTIONS = () =>
  Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), emptyMonthCategories()]));

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('map');
  const [authMode, setAuthMode] = useState('login');
  const [profile, setProfile] = useState({ nickname: '', emoji: '😊' });
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
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.profile) setProfile(d.profile);
        if (d.goals)   setGoals(d.goals);
        if (d.actions) setActions(d.actions);
      }
    } catch (e) { console.error(e); }
  }

  const saveAll = useCallback(async (p, g, a) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        profile: p ?? profile, goals: g ?? goals, actions: a ?? actions,
        updatedAt: serverTimestamp()
      }, { merge: true });
      showToast('保存しました ✓');
    } catch (e) { showToast('保存エラー: ' + e.message); }
    finally { setSaving(false); }
  }, [user, profile, goals, actions]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function handleAuth(e) {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const password = e.target.password.value;
    try {
      if (authMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('登録完了！');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('ログインしました');
      }
    } catch (err) { showToast(err.message); }
  }

  async function handleLogout() {
    await signOut(auth);
    setGoals(deepClone(DEFAULT_GOALS));
    setActions(DEFAULT_ACTIONS());
    setProfile({ nickname: '', emoji: '😊' });
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    HORIZONS.forEach(h => {
      const rows = [['カテゴリ', '内容']];
      CATEGORIES.forEach(c => rows.push([c.label, goals[h.key]?.[c.key] || '']));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), h.label);
    });
    const actRows = [['月', ...MONTH_CATS.map(c => c.label)]];
    MONTHS.forEach((m, i) => {
      const a = actions[String(i + 1)] || emptyMonthCategories();
      actRows.push([m, ...MONTH_CATS.map(c => a[c.key] || '')]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actRows), '月次アクション');
    XLSX.writeFile(wb, 'futuremap_export.xlsx');
    showToast('Excelをダウンロードしました');
  }

  function importExcel(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const LABEL_TO_KEY = {
          '居住環境': 'home', '学び': 'study', '趣味・余暇・遊び': 'hobby',
          '家族・パートナー': 'family', '人生のテーマ&感情': 'theme',
          '今月のテーマ&感情': 'theme', 'テーマ&感情': 'theme',
          '健康': 'health', '人間性・人間関係': 'relation',
          '仕事・社会貢献': 'work', 'お金・物欲': 'money',
        };
        function parseGridSheet(rows) {
          const result = {};
          [[2,3],[4,5],[6,7]].forEach(([li, di]) => {
            if (li >= rows.length) return;
            const labels = rows[li];
            const data   = rows[di] || [];
            [1,2,3].forEach(col => {
              const label = labels[col];
              const value = data[col];
              if (label && LABEL_TO_KEY[label]) {
                result[LABEL_TO_KEY[label]] = String(value || '');
              }
            });
          });
          return result;
        }
        function parseAppSheet(rows) {
          const result = {};
          rows.slice(1).forEach(row => {
            const key = LABEL_TO_KEY[row[0]];
            if (key) result[key] = String(row[1] || '');
          });
          return result;
        }
        const ng = deepClone(DEFAULT_GOALS);
        const ORIG_SHEET = {
          y1:  ['フューチャーマップ(1年後2026年の外側) ', 'フューチャーマップ(1年後2026年の外側)'],
          y3:  ['フューチャーマップ(3年後2028年の外側)'],
          y10: ['フューチャーマップ(Life Goals10years)'],
        };
        HORIZONS.forEach(h => {
          if (wb.Sheets[h.label]) {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[h.label], { header: 1 });
            Object.assign(ng[h.key], parseAppSheet(rows));
            return;
          }
          const candidates = ORIG_SHEET[h.key] || [];
          for (const name of candidates) {
            if (wb.Sheets[name]) {
              const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
              Object.assign(ng[h.key], parseGridSheet(rows));
              break;
            }
          }
        });
        setGoals(ng);
        const na = DEFAULT_ACTIONS();
        if (wb.Sheets['月次アクション']) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets['月次アクション'], { header: 1 });
          rows.slice(1).forEach(row => {
            const mi = MONTHS.indexOf(row[0]);
            if (mi >= 0) {
              const k = String(mi + 1);
              MONTH_CATS.forEach((c, ci) => { na[k][c.key] = String(row[ci + 1] || ''); });
            }
          });
        }
        wb.SheetNames.forEach(name => {
          const m = name.match(/^(\d+)月アクション$/);
          if (!m) return;
          const mi = parseInt(m[1]) - 1;
          if (mi < 0 || mi > 11) return;
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
          const data = parseGridSheet(rows);
          Object.assign(na[String(mi + 1)], data);
        });
        setActions(na);
        showToast('Excelを取り込みました ✓'); e.target.value = '';
      } catch (err) { showToast('読み込みエラー: ' + err.message); }
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
          <button className={page === 'map' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('map')}>マップ</button>
          <button className={page === 'actions' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('actions')}>月次アクション</button>
          <button className={page === 'profile' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('profile')}>プロフィール</button>
        </nav>
        <div className="header-right">
          <span className="user-badge">{profile.emoji} {profile.nickname || user.email}</span>
          <button className="btn-logout" onClick={handleLogout}>ログアウト</button>
        </div>
      </header>
      <div className="toolbar">
        <label className="btn-tool">📥 Excelインポート<input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display: 'none' }} /></label>
        <button className="btn-tool" onClick={exportExcel}>📤 Excelエクスポート</button>
        <button className="btn-save" onClick={() => saveAll()} disabled={saving}>{saving ? '保存中…' : '💾 保存'}</button>
      </div>
      <main className="main">
        {page === 'map'     && <MapPage goals={goals} setGoals={setGoals} />}
        {page === 'actions' && <ActionsPage actions={actions} setActions={setActions} />}
        {page === 'profile' && <ProfilePage profile={profile} setProfile={setProfile} onSave={(p) => saveAll(p, null, null)} />}
      </main>
    </div>
  );
}

function AuthPage({ authMode, setAuthMode, onSubmit }) {
  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">🗺️</div>
        <h1 className="auth-title">FutureMap</h1>
        <p className="auth-sub">あなたの未来を描こう</p>
        <form onSubmit={onSubmit} className="auth-form">
          <input name="email" type="email" placeholder="メールアドレス" required className="auth-input" />
          <input name="password" type="password" placeholder="パスワード（6文字以上）" required className="auth-input" />
          <button type="submit" className="auth-submit">{authMode === 'login' ? 'ログイン' : 'アカウント作成'}</button>
        </form>
        <button className="auth-toggle" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
          {authMode === 'login' ? '→ 新規登録はこちら' : '→ ログインはこちら'}
        </button>
      </div>
    </div>
  );
}

function MapPage({ goals, setGoals }) {
  const [activeHorizon, setActiveHorizon] = useState('y1');

  function updateCat(horizonKey, catKey, value) {
    setGoals(prev => ({
      ...prev,
      [horizonKey]: { ...prev[horizonKey], [catKey]: value }
    }));
  }

  const h = HORIZONS.find(x => x.key === activeHorizon);
  const data = goals[activeHorizon] || emptyCategories();

  return (
    <div className="map-page">
      <h2 className="page-title">🗺️ フューチャーマップ</h2>
      <p className="page-sub">1年後・3年後・10年後のビジョンを描きましょう</p>

      <div className="horizon-tabs">
        {HORIZONS.map(hz => (
          <button
            key={hz.key}
            className={`horizon-tab${activeHorizon === hz.key ? ' active' : ''}`}
            onClick={() => setActiveHorizon(hz.key)}
          >
            <span className="htab-icon">{hz.icon}</span>
            <span className="htab-label">{hz.label}</span>
            <span className="htab-sub">{hz.sub}</span>
          </button>
        ))}
      </div>

      <div className="horizon-panel">
        <div className="horizon-panel-header">
          <span>{h.icon}</span>
          <span className="hp-title">{h.label} — {h.sub}</span>
        </div>
        <div className="cat-grid">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className={`cat-card${cat.wide ? ' cat-wide' : ''}`}>
              <div className="cat-label">
                <span className="cat-icon">{cat.icon}</span>
                {cat.label}
              </div>
              <textarea
                className="cat-textarea"
                placeholder={`${cat.label}の目標・ビジョンを入力…`}
                value={data[cat.key] || ''}
                onChange={e => updateCat(activeHorizon, cat.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionsPage({ actions, setActions }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  function updateCat(month, catKey, value) {
    setActions(prev => ({
      ...prev,
      [String(month)]: { ...prev[String(month)], [catKey]: value }
    }));
  }

  const cur = actions[String(selectedMonth)] || emptyMonthCategories();

  return (
    <div className="actions-page">
      <h2 className="page-title">📅 月次アクションプラン</h2>
      <p className="page-sub">月ごとの9カテゴリを設定しましょう</p>
      <div className="month-grid">
        {MONTHS.map((m, i) => {
          const a = actions[String(i + 1)];
          const hasData = a && Object.values(a).some(Boolean);
          return (
            <button
              key={i}
              className={`month-btn${selectedMonth === i + 1 ? ' active' : ''}${hasData ? ' has-data' : ''}`}
              onClick={() => setSelectedMonth(i + 1)}
            >{m}</button>
          );
        })}
      </div>
      <div className="month-editor">
        <div className="month-editor-header">
          <span className="month-editor-title">{MONTHS[selectedMonth - 1]}</span>
          <span className="month-editor-sub">のアクションプラン</span>
        </div>
        <div className="cat-grid">
          {MONTH_CATS.map(cat => (
            <div key={cat.key} className={`cat-card${cat.wide ? ' cat-wide' : ''}`}>
              <div className="cat-label">
                <span className="cat-icon">{cat.icon}</span>
                {cat.label}
              </div>
              <textarea
                className="cat-textarea"
                placeholder={`${cat.label}の今月のアクション…`}
                value={cur[cat.key] || ''}
                onChange={e => updateCat(selectedMonth, cat.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="year-summary">
        <h3 className="visual-title">📊 年間プラン一覧</h3>
        <div className="summary-grid">
          {MONTHS.map((m, i) => {
            const a = actions[String(i + 1)];
            const filled = a ? Object.values(a).filter(Boolean).length : 0;
            return (
              <div
                key={i}
                className={`summary-card${selectedMonth === i + 1 ? ' selected' : ''}`}
                onClick={() => setSelectedMonth(i + 1)}
              >
                <div className="summary-month">{m}</div>
                <div className="summary-theme">{a?.theme || '—'}</div>
                <div className="summary-tasks">{filled} / 9 入力済</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ profile, setProfile, onSave }) {
  const [local, setLocal] = useState({ ...profile });
  function handleSave() { setProfile(local); onSave(local); }
  return (
    <div className="profile-page">
      <h2 className="page-title">👤 プロフィール</h2>
      <p className="page-sub">あなたの名前とアイコンを設定しましょう</p>
      <div className="profile-card">
        <div className="profile-preview">
          <span className="profile-emoji-big">{local.emoji}</span>
          <span className="profile-name-preview">{local.nickname || 'ニックネーム未設定'}</span>
        </div>
        <label className="field-label">ニックネーム</label>
        <input className="profile-input" placeholder="例：まさひこ" value={local.nickname} onChange={e => setLocal(l => ({ ...l, nickname: e.target.value }))} />
        <label className="field-label">絵文字アイコン</label>
        <div className="emoji-grid">
          {EMOJI_LIST.map(em => (
            <button key={em} className={`emoji-btn${local.emoji === em ? ' selected' : ''}`} onClick={() => setLocal(l => ({ ...l, emoji: em }))}>{em}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={handleSave}>プロフィールを保存</button>
      </div>
    </div>
  );
}
