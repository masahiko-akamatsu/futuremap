import { useState, useEffect, useCallback, useRef } from "react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const MONTHS_JP = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
const C = {
  sky:  { bg:"#e0f2f1", accent:"#4db6a4" },
  teal: { bg:"#e0f7fa", accent:"#26a69a" },
  gold: { bg:"#f1f8e9", accent:"#7cb342" },
  sage: { bg:"#f9fbe7", accent:"#8bc34a" },
  rose: { bg:"#e8f5e9", accent:"#5a9e6f" },
  pink: { bg:"#fce4ec", accent:"#e57373" },
};
const TOASTS = ["✅ すばらしい！達成しました🌸","🌟 やったね！Keep going!","💕 素敵！どんどん進んでいます","🎉 最高！一歩前進！","✨ 確実に積み上がってます！"];

// カテゴリ名→セクションIDのマッピング
const CAT_MAP = {
  "居住環境":       "living",
  "学び":           "learning",
  "趣味・余暇・遊び":"hobby",
  "家族・パートナー":"family",
  "今月のテーマ&感情":"theme_cat",
  "人生のテーマ&感情":"theme_cat",
  "健康":           "health",
  "人間性・人間関係":"relation",
  "仕事・社会貢献":  "work",
  "お金・物欲":     "money",
};

const SEC_META = {
  hobby:    { name:"趣味・余暇・遊び", icon:"✈️", color:"sky"  },
  health:   { name:"健康",            icon:"💪", color:"teal" },
  money:    { name:"お金・物欲",      icon:"💰", color:"gold" },
  learning: { name:"学び",            icon:"📚", color:"sage" },
  work:     { name:"仕事・社会貢献",  icon:"💼", color:"rose" },
  living:   { name:"居住環境",        icon:"🏡", color:"gold" },
  family:   { name:"家族・パートナー",icon:"❤️", color:"pink" },
  relation: { name:"人間性・人間関係",icon:"🌸", color:"teal" },
};

const DEFAULT_MONTHLY_SECTIONS = [
  { id:"hobby",   name:"趣味・余暇・遊び", icon:"✈️", color:"sky",  tasks:[] },
  { id:"health",  name:"健康",            icon:"💪", color:"teal", tasks:[] },
  { id:"money",   name:"お金・物欲",      icon:"💰", color:"gold", tasks:[] },
  { id:"learning",name:"学び",            icon:"📚", color:"sage", tasks:[] },
  { id:"work",    name:"仕事・社会貢献",  icon:"💼", color:"rose", tasks:[] },
  { id:"living",  name:"居住環境",        icon:"🏡", color:"gold", tasks:[] },
  { id:"family",  name:"家族・パートナー",icon:"❤️", color:"pink", tasks:[] },
  { id:"relation",name:"人間性・人間関係",icon:"🌸", color:"teal", tasks:[] },
];

const makeBlankMonthly = (year, month) => ({
  year, month,
  theme:"", themeSub:"",
  emotionTags:[],
  health:[
    {label:"食事",value:""},{label:"就寝",value:""},
    {label:"起床",value:""},{label:"運動",value:""},
    {label:"朝活",value:""},{label:"目標体重",value:""},
    {label:"体脂肪率",value:""},{label:"タニタ年齢",value:""},
  ],
  sections: DEFAULT_MONTHLY_SECTIONS.map(s=>({...s, tasks:[]})),
  checked:{}, openSecs:{}, updatedAt:null,
});

const VISION_DATA = {
  "1year":{
    title:"1年後",subtitle:"2026年12月31日（58歳）",icon:"🌱",
    theme:"愛と慈悲のフォトン — 愛と悦びで女神を優しく包む男神の大地になった！",
    sections:[
      {id:"living", name:"居住環境",        icon:"🏡",color:"rose",content:"【心地よい豊かな生活】\n石垣島と淡路島に家族旅行\n実家の龍野で自家製野菜を栽培\n（自然の恵に感謝する）"},
      {id:"learning",name:"学び",           icon:"📚",color:"sage",content:"【女神覚醒・まぐ愛1年】\n【ホリアカ・ファシリ1年】\n【九星気学鑑定士デビュー】\n【スピリチュアル講座】\n生涯現役！学び続けている悦び！"},
      {id:"hobby",  name:"趣味・余暇・遊び", icon:"✈️",color:"sky", content:"【愛し愛される世界】\n【まぐ愛の創造】\n【九星気学・スピ】\nコミュニティー運営する\n【中国旅行】池州・九華山・黄山・西安\n覚醒・目覚めて生きる！"},
      {id:"family", name:"家族・パートナー", icon:"❤️",color:"pink",content:"両親が元気に暮らしている\n年2回、妻とランチデート\n年２回、家族国内旅行\n娘、息子夫婦とお祝い会\n家族愛に溢れるパートナー"},
      {id:"health", name:"健康",            icon:"💪",color:"teal",content:"●まぐ愛・スロセを楽しむ！\n食事：四毒抜き和食を楽しむ\n睡眠：7時間睡眠/昼寝\n運動：おはヨガ！\n朝活：ソウルシンク瞑想\n体重：60kg、体脂肪率17%\nタニタ年齢：45歳！"},
      {id:"relation",name:"人間性・人間関係",icon:"🌸",color:"teal",content:"横田セイゴ、中山とメール\n喜びを与える（愛と慈悲）\nエゴを手放す（中庸）\n毎朝いちごさん🍓メッセージ\n優しく包む・愛し愛される\n男神の大地です。"},
      {id:"work",   name:"仕事・社会貢献",   icon:"💼",color:"rose",content:"【独立起業・法人設立】\n愛情コーチングセミナー\nカイゼンリーダー人財育成\nまさひこジュニア育成講座\nSNS10万人フォロー達成！\n【収入10%寄付】国境なき医師団・雲南省"},
      {id:"money",  name:"お金・物欲",       icon:"💰",color:"gold",content:"年収：1000万円（副業）\n車：レクサスRXに！\n温泉付きセカンドハウス\n淡路シーサイドマンションに泊まってみた"},
    ]
  },
  "3year":{
    title:"3年後",subtitle:"2028年12月31日（60歳）",icon:"🌿",
    theme:"愛と慈悲のフォトン — 愛と悦びで女神を優しく包む男神の大地になった！",
    sections:[
      {id:"living", name:"居住環境",        icon:"🏡",color:"rose",content:"【心地よい豊かな生活】\n石垣島と淡路島にセカンドハウスを所有\n海が見えるハウス\n温泉付きハウス\n自家製野菜を栽培\n（自然の恵に感謝する）"},
      {id:"learning",name:"学び",           icon:"📚",color:"sage",content:"【女神覚醒・まぐ愛コーチ】\n【ホリアカ・ファシリ3年】\n【九星気学・鑑定士】\n【スピリチュアル講座】\n生涯現役！学び続けている悦び！"},
      {id:"hobby",  name:"趣味・余暇・遊び", icon:"✈️",color:"sky", content:"【愛し愛される世界】\n【まぐ愛の創造】\n【九星気学】\nコミュニティー運営する\n覚醒・目覚めて生きる\n次元上昇・スピリチュアル\n宇宙旅行に行く（アミ）"},
      {id:"family", name:"家族・パートナー", icon:"❤️",color:"pink",content:"両親が元気に暮らしている\n毎週、妻とランチデート\n年２回、家族海外旅行\n娘夫婦、息子夫婦とお祝い会\n孫に誕生日プレゼント\n家族愛に溢れるパートナー"},
      {id:"health", name:"健康",            icon:"💪",color:"teal",content:"●まぐ愛・スロセを楽しむ！\n食事：四毒抜き和食を楽しむ\n睡眠：7時間睡眠/昼寝\n運動：おはヨガ！\n朝活：ソウルシンク瞑想\n体重：60kg、体脂肪率17%\nタニタ年齢：50歳！"},
      {id:"relation",name:"人間性・人間関係",icon:"🌸",color:"teal",content:"喜びを与える（愛と慈悲）\nエゴを手放す（中庸）\nビューティフル・ステイト！\n家族友人から頼られる存在\n優しく包む・愛し愛される\n男神の大地です。\n両親と良好・幸せな関係\n愛フォトンでいっぱい！"},
      {id:"work",   name:"仕事・社会貢献",   icon:"💼",color:"rose",content:"愛情コーチングセミナーを開催\n多くの方に学びを提供\n企業カイゼンリーダー\n愛ある人財教育\nまさひこジュニア育成講座\n収入10%寄付\n国境なき医師団、雲南省"},
      {id:"money",  name:"お金・物欲",       icon:"💰",color:"gold",content:"年収：10億円\n車：レクサスLCスポーツ\nオートバイ：H２ SX SE\n温泉付きセカンドハウス\n淡路シーサイドマンション\n自家用ジェット\n自家用ロケット"},
    ]
  },
  "10year":{
    title:"10年後",subtitle:"2035年12月31日（67歳）",icon:"🌳",
    theme:"愛と慈悲のフォトン — 愛と悦びで女神を優しく包む男神の大地になった！",
    sections:[
      {id:"living", name:"居住環境",        icon:"🏡",color:"rose",content:"【心地よい豊かな生活】\n石垣島と淡路島にセカンドハウスを所有\n海が見えるハウス\n温泉付きハウス\n自家製野菜を栽培している\n（自然の恵に感謝する）"},
      {id:"learning",name:"学び",           icon:"📚",color:"sage",content:"【女神覚醒・まぐ愛コーチ】\n【ホリアカ・ファシリ】\n【九星気学・鑑定士】\n【スピリチュアル講座】\n生涯現役！学び続けている悦び！"},
      {id:"hobby",  name:"趣味・余暇・遊び", icon:"✈️",color:"sky", content:"【愛し愛される世界】\n【まぐ愛の創造】\n【インド瞑想クンダリーニ】\nパートナーと悦び合う\n直感・霊性を高める\n覚醒・目覚めて生きる\n次元上昇・スピリチュアル\n宇宙旅行に行く（アミ）"},
      {id:"family", name:"家族・パートナー", icon:"❤️",color:"pink",content:"両親が元気に暮らしている\n毎週、妻とランチデート\n年２回、家族海外旅行\n娘夫婦、息子夫婦とお祝い会\n孫に誕生日プレゼント\n家族愛に溢れるパートナー"},
      {id:"health", name:"健康",            icon:"💪",color:"teal",content:"●まぐ愛・スロセを楽しむ！\n食事：四毒抜き和食を楽しむ\n睡眠：7時間睡眠/昼寝\n運動：おはヨガ！\n朝活：ソウルシンク瞑想\n体重：60kg、体脂肪率16%\nタニタ年齢：55歳！"},
      {id:"relation",name:"人間性・人間関係",icon:"🌸",color:"teal",content:"喜びを与える（愛と慈悲）\nエゴを手放す（中庸）\nビューティフル・ステイト！\n家族友人から頼られる存在\n優しく包む・愛し愛される\n男神の大地です。\n両親と良好・幸せな関係\n愛フォトンでいっぱい！"},
      {id:"work",   name:"仕事・社会貢献",   icon:"💼",color:"rose",content:"仕事を通じて世の中に貢献\nnote/Line毎日更新\nまぐ愛noteを配信する\n法人設立する\n愛情パートナーコーチ Xライブ\n寄付をする 医師団：雲南省"},
      {id:"money",  name:"お金・物欲",       icon:"💰",color:"gold",content:"年収：10億円\n車：レクサスLCスポーツ\nオートバイ：H２ SX SE\n温泉付きセカンドハウス\n淡路シーサイドマンション\n自家用ジェット\n自家用ロケット"},
    ]
  }
};

// ========== Excel パース関数 ==========
function parseExcelSheet(sheetData, sheetName) {
  // sheetData: XLSX.utils.sheet_to_json(ws, {header:1, defval:''}) の結果
  const title = sheetData[0]?.[0] ? String(sheetData[0][0]) : sheetName;
  const isMonthly = sheetName.includes("アクション") || sheetName.includes("月");

  const catMap = {};
  // 行2,3 / 行4,5 / 行6,7 のペアを読む
  [[2,3],[4,5],[6,7]].forEach(([rL,rC])=>{
    for(let c=1;c<=3;c++){
      const label = sheetData[rL]?.[c] ? String(sheetData[rL][c]).trim() : "";
      const content = sheetData[rC]?.[c] ? String(sheetData[rC][c]) : "";
      if(label) catMap[label] = content.replace(/\\n/g,"\n").trim();
    }
  });

  // テーマ抽出（今月のテーマ&感情 or 人生のテーマ&感情）
  let theme = "";
  let emotionTags = [];
  const themeKey = Object.keys(catMap).find(k=>k.includes("テーマ"));
  if(themeKey) {
    const raw = catMap[themeKey];
    const lines = raw.split("\n").map(l=>l.trim()).filter(Boolean);
    theme = lines[0] || "";
    // 感情タグっぽい行を抽出
    emotionTags = lines.filter(l=>
      l.startsWith("☆")||l.startsWith("●")||
      l.includes("ワクワク")||l.includes("幸せ")||l.includes("悦び")||l.includes("♪")
    ).map(l=>l.replace(/^[☆●]/,"").trim());
    delete catMap[themeKey];
  }

  // セクション生成
  const sections = DEFAULT_MONTHLY_SECTIONS.map(sec => {
    const matchKey = Object.keys(catMap).find(k=>{
      const mapped = CAT_MAP[k];
      return mapped === sec.id;
    });
    const raw = matchKey ? catMap[matchKey] : "";
    const tasks = raw
      ? raw.split("\n").map(l=>l.replace(/^[🔲□■・]/,"").trim()).filter(Boolean)
      : [];
    return { ...sec, tasks };
  });

  // 健康セクション → healthフィールドに変換
  const healthSec = sections.find(s=>s.id==="health");
  const healthItems = [];
  if(healthSec?.tasks?.length) {
    healthSec.tasks.forEach(t=>{
      const ci = t.indexOf("：");
      const ci2 = t.indexOf(":");
      const sep = ci>=0?ci:ci2;
      if(sep>=0){
        healthItems.push({label:t.slice(0,sep).trim(),value:t.slice(sep+1).trim()});
      } else {
        healthItems.push({label:t,value:""});
      }
    });
  }

  return { title, theme, emotionTags, sections, healthItems, isMonthly, catMap };
}

export default function App() {
  const [user,setUser]           = useState(undefined);
  const [activeTab,setActiveTab] = useState("monthly");
  const [data,setData]           = useState(null);
  const [saving,setSaving]       = useState(false);
  const [toast,setToast]         = useState({show:false,msg:""});
  const [editOpen,setEditOpen]   = useState(false);
  const [logoutConfirm,setLogoutConfirm] = useState(false);
  const [excelOpen,setExcelOpen] = useState(false);
  const toastTimer = useRef(null);
  const now = new Date();
  const [year,setYear]   = useState(now.getFullYear());
  const [month,setMonth] = useState(now.getMonth()+1);

  useEffect(()=>{ return onAuthStateChanged(auth,u=>setUser(u??null)); },[]);

  useEffect(()=>{
    if(!user) return;
    setData(null);
    const docId=`${user.uid}_${year}_${String(month).padStart(2,"0")}`;
    getDoc(doc(db,"futuremaps",docId)).then(snap=>{
      setData(snap.exists()?snap.data():makeBlankMonthly(year,month));
    });
  },[user,year,month]);

  const persist = useCallback(async(patch)=>{
    if(!user||!data) return;
    setSaving(true);
    const docId=`${user.uid}_${year}_${String(month).padStart(2,"0")}`;
    const next={...data,...patch,uid:user.uid,updatedAt:serverTimestamp()};
    try{ await setDoc(doc(db,"futuremaps",docId),next); setData(next); }
    catch(e){ console.error(e); }
    setSaving(false);
  },[user,data,year,month]);

  const toggleTask=(secId,idx)=>{
    const key=`${secId}:${idx}`;
    const nc={...data.checked,[key]:!data.checked[key]};
    persist({checked:nc});
    if(!data.checked[key]){
      const msg=TOASTS[Math.floor(Math.random()*TOASTS.length)];
      setToast({show:true,msg});
      clearTimeout(toastTimer.current);
      toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),2600);
    }
  };

  const toggleSec=(id)=>{ persist({openSecs:{...data.openSecs,[id]:!data.openSecs[id]}}); };

  const changeMonth=(dir)=>{
    if(dir===-1){ if(month===1){setYear(y=>y-1);setMonth(12);}else setMonth(m=>m-1); }
    else { if(month===12){setYear(y=>y+1);setMonth(1);}else setMonth(m=>m+1); }
  };

  // Excel インポート完了ハンドラ
  const handleExcelImport = useCallback((parsed) => {
    const patch = {
      sections: parsed.sections,
      checked: {},
      openSecs: {},
    };
    if(parsed.theme) patch.theme = parsed.theme;
    if(parsed.emotionTags?.length) patch.emotionTags = parsed.emotionTags;
    if(parsed.healthItems?.length) {
      patch.health = parsed.healthItems.length > 0
        ? parsed.healthItems
        : data?.health || [];
    }
    persist(patch);
    setExcelOpen(false);
    setToast({show:true,msg:"📊 Excelからインポートしました！"});
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(t=>({...t,show:false})),3000);
  },[persist,data]);

  if(user===undefined) return <Splash msg="読み込み中..." />;
  if(user===null)      return <LoginScreen />;
  if(activeTab==="monthly" && !data) return <Splash msg="データを取得中..." />;

  const TABS=[
    {id:"monthly",label:"📅 毎月"},
    {id:"1year",  label:"🌱 1年後"},
    {id:"3year",  label:"🌿 3年後"},
    {id:"10year", label:"🌳 10年後"},
  ];

  return (
    <div style={{fontFamily:"'Zen Maru Gothic',sans-serif",background:"#f1f8f4",minHeight:"100vh",color:"#1a3c2a",maxWidth:640,margin:"0 auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&family=Shippori+Mincho:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .rh:hover{background:rgba(56,161,105,.05);}
        .rh:active{background:rgba(56,161,105,.1);}
        .sh:hover{background:rgba(56,161,105,.03);}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:#b7e4c7;border-radius:2px;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes toastIn{from{transform:translateX(-50%) translateY(70px)}to{transform:translateX(-50%) translateY(0)}}
        @keyframes toastOut{from{transform:translateX(-50%) translateY(0)}to{transform:translateX(-50%) translateY(70px)}}
        .ti{animation:toastIn .4s cubic-bezier(.34,1.56,.64,1) forwards;}
        .to{animation:toastOut .3s ease forwards;}
        .sb{animation:fadeIn .22s ease;}
        .mi{animation:slideUp .3s cubic-bezier(.34,1.56,.64,1);}
        textarea:focus,input:focus{border-color:#38a169!important;box-shadow:0 0 0 3px rgba(56,161,105,.15);outline:none;}
        .xl-drop{border:2px dashed #b7e4c7;border-radius:14px;padding:2rem 1.5rem;text-align:center;cursor:pointer;transition:all .2s;background:#f0fdf4;}
        .xl-drop:hover,.xl-drop.over{border-color:#38a169;background:#e8f5e9;}
        .xl-sheet-btn{padding:7px 14px;border-radius:20px;border:1px solid #b7e4c7;cursor:pointer;font-size:12px;font-family:'Zen Maru Gothic',sans-serif;background:white;color:#2d6a4f;transition:all .15s;margin:4px;}
        .xl-sheet-btn.active{background:#38a169;color:white;border-color:#38a169;}
      `}</style>

      {/* HEADER */}
      <header style={{background:"linear-gradient(135deg,#1b4332,#2d6a4f 55%,#1b4332)",color:"#f0faf4",padding:"16px 18px 0",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,rgba(56,161,105,.25),transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,position:"relative",zIndex:1}}>
          <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:17,fontWeight:700,color:"#d4edda"}}>🌿 フューチャーマップ</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {saving&&<span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>保存中…</span>}
            {activeTab==="monthly"&&(
              <button onClick={()=>setExcelOpen(true)}
                style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",color:"rgba(255,255,255,.9)",padding:"4px 10px",borderRadius:16,fontSize:11,fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                📊 Excel
              </button>
            )}
            <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"2px solid rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>👤</div>
            <button onClick={()=>setLogoutConfirm(true)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.18)",color:"rgba(255,255,255,.75)",padding:"4px 10px",borderRadius:16,fontSize:11,fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer"}}>ログアウト</button>
          </div>
        </div>
        <div style={{display:"flex",gap:3,position:"relative",zIndex:1}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{flex:1,padding:"9px 3px",border:"none",cursor:"pointer",fontFamily:"'Zen Maru Gothic',sans-serif",fontSize:11,fontWeight:700,borderRadius:"8px 8px 0 0",transition:"all .2s",
                background:activeTab===t.id?"#f1f8f4":"rgba(255,255,255,.1)",
                color:activeTab===t.id?"#1b4332":"rgba(255,255,255,.75)"}}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab==="monthly"
        ? <MonthlyView data={data} year={year} month={month} changeMonth={changeMonth} toggleTask={toggleTask} toggleSec={toggleSec} onEdit={()=>setEditOpen(true)}/>
        : <VisionView visionKey={activeTab}/>
      }

      {/* TOAST */}
      {toast.msg&&(
        <div className={toast.show?"ti":"to"} style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%) translateY(70px)",background:"linear-gradient(135deg,#38a169,#2d6a4f)",color:"white",padding:"11px 22px",borderRadius:28,fontSize:13,fontWeight:700,boxShadow:"0 6px 22px rgba(56,161,105,.4)",zIndex:1000,whiteSpace:"nowrap"}}>
          {toast.msg}
        </div>
      )}

      {/* EDIT */}
      {editOpen&&data&&(
        <EditModal data={data} onSave={patch=>{persist(patch);setEditOpen(false);}} onClose={()=>setEditOpen(false)}/>
      )}

      {/* EXCEL IMPORT */}
      {excelOpen&&(
        <ExcelImportModal
          year={year} month={month}
          onImport={handleExcelImport}
          onClose={()=>setExcelOpen(false)}
        />
      )}

      {/* LOGOUT */}
      {logoutConfirm&&(
        <div onClick={()=>setLogoutConfirm(false)} style={{position:"fixed",inset:0,background:"rgba(26,60,42,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,textAlign:"center",boxShadow:"0 8px 32px rgba(26,60,42,.2)"}}>
            <div style={{fontSize:36,marginBottom:12}}>🌿</div>
            <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:17,fontWeight:700,color:"#1a3c2a",marginBottom:8}}>ログアウトしますか？</div>
            <div style={{fontSize:12,color:"#7aab8a",marginBottom:24,lineHeight:1.7}}>データはクラウドに保存されています。<br/>次回ログイン時も続きから使えます。</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setLogoutConfirm(false)} style={{flex:1,background:"rgba(26,60,42,.07)",border:"none",borderRadius:11,padding:"12px",fontSize:13,fontWeight:700,color:"#2d5a3d",fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer"}}>キャンセル</button>
              <button onClick={()=>{signOut(auth);setLogoutConfirm(false);}} style={{flex:1,background:"linear-gradient(135deg,#38a169,#2d6a4f)",border:"none",borderRadius:11,padding:"12px",fontSize:13,fontWeight:700,color:"white",fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer",boxShadow:"0 4px 12px rgba(56,161,105,.3)"}}>ログアウト</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Excel インポートモーダル ==========
function ExcelImportModal({year,month,onImport,onClose}){
  const [step,setStep]           = useState("drop"); // drop | preview
  const [sheets,setSheets]       = useState([]);
  const [activeSheet,setActiveSheet] = useState(null);
  const [parsed,setParsed]       = useState(null);
  const [err,setErr]             = useState("");
  const [xlsxLib,setXlsxLib]    = useState(null);
  const dropRef = useRef(null);
  const fileRef = useRef(null);

  // XLSX を動的ロード
  useEffect(()=>{
    if(window.XLSX){ setXlsxLib(window.XLSX); return; }
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>setXlsxLib(window.XLSX);
    document.head.appendChild(s);
  },[]);

  const processFile=(file)=>{
    if(!file||!xlsxLib){ setErr("ファイルを選択してください"); return; }
    if(!file.name.match(/\.xlsx?$/i)){ setErr("xlsx ファイルを選択してください"); return; }
    setErr("");
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const wb=xlsxLib.read(e.target.result,{type:"array"});
        const sheetList=wb.SheetNames.map(name=>{
          const ws=wb.Sheets[name];
          const data=xlsxLib.utils.sheet_to_json(ws,{header:1,defval:""});
          return {name,data};
        });
        setSheets(sheetList);
        // アクションシートを優先選択
        const monthlySheet=sheetList.find(s=>s.name.includes("アクション"))||sheetList[0];
        setActiveSheet(monthlySheet.name);
        setParsed(parseExcelSheet(monthlySheet.data,monthlySheet.name));
        setStep("preview");
      }catch(ex){ setErr("読み込みエラー: "+ex.message); }
    };
    reader.readAsArrayBuffer(file);
  };

  const selectSheet=(name)=>{
    setActiveSheet(name);
    const s=sheets.find(s=>s.name===name);
    if(s) setParsed(parseExcelSheet(s.data,s.name));
  };

  const onDrop=(e)=>{
    e.preventDefault();
    dropRef.current?.classList.remove("over");
    processFile(e.dataTransfer.files[0]);
  };

  const btn={flex:1,border:"none",borderRadius:11,padding:"11px",fontSize:13,fontWeight:700,fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer"};

  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(26,60,42,.55)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div className="mi" style={{background:"#f4fbf6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:640,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{width:38,height:4,background:"#7aab8a",borderRadius:2,margin:"14px auto 0",opacity:.4}}/>
        <div style={{padding:"12px 18px 10px",borderBottom:"1px solid rgba(56,161,105,.13)"}}>
          <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:16,fontWeight:700,color:"#2d6a4f"}}>
            📊 Excel からインポート
          </div>
          <div style={{fontSize:11,color:"#7aab8a",marginTop:3}}>
            {year}年{MONTHS_JP[month-1]}のアクションプランを読み込みます
          </div>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"14px 18px"}}>
          {step==="drop"&&(
            <>
              <div ref={dropRef} className="xl-drop"
                onDragOver={e=>{e.preventDefault();dropRef.current?.classList.add("over")}}
                onDragLeave={()=>dropRef.current?.classList.remove("over")}
                onDrop={onDrop}
                onClick={()=>fileRef.current?.click()}>
                <div style={{fontSize:36,marginBottom:10}}>📊</div>
                <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:14,fontWeight:700,color:"#2d6a4f",marginBottom:6}}>
                  Excelファイルをドロップ
                </div>
                <div style={{fontSize:12,color:"#7aab8a",marginBottom:12}}>
                  FutureMap202604.xlsx などをここにドラッグ
                </div>
                <div style={{display:"inline-block",background:"#38a169",color:"white",padding:"8px 20px",borderRadius:20,fontSize:12,fontWeight:700,fontFamily:"'Zen Maru Gothic',sans-serif"}}>
                  ファイルを選択
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls"
                  style={{display:"none"}}
                  onChange={e=>processFile(e.target.files[0])}/>
              </div>
              {err&&<div style={{marginTop:10,fontSize:12,color:"#e53e3e",background:"#fff5f5",borderRadius:8,padding:"8px 12px"}}>{err}</div>}
              {!xlsxLib&&<div style={{marginTop:8,fontSize:11,color:"#7aab8a",textAlign:"center"}}>ライブラリ読み込み中...</div>}
            </>
          )}

          {step==="preview"&&parsed&&(
            <>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:11,color:"#7aab8a",marginBottom:6}}>シートを選択：</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {sheets.map(s=>(
                    <button key={s.name} className={`xl-sheet-btn${activeSheet===s.name?" active":""}`}
                      onClick={()=>selectSheet(s.name)}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* テーマプレビュー */}
              {parsed.theme&&(
                <div style={{background:"#e8f5e9",border:"1px solid #b7e4c7",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                  <div style={{fontSize:11,color:"#5a9e6f",fontWeight:700,marginBottom:4}}>💕 テーマ</div>
                  <div style={{fontSize:12,color:"#1a3c2a",lineHeight:1.7}}>{parsed.theme}</div>
                </div>
              )}

              {/* セクションプレビュー */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                {parsed.sections.filter(s=>s.tasks.length>0).map(sec=>{
                  const col=C[sec.color]||C.rose;
                  return(
                    <div key={sec.id} style={{background:"white",border:"1px solid rgba(56,161,105,.15)",borderRadius:10,padding:"9px 11px"}}>
                      <div style={{fontSize:11,fontWeight:700,color:col.accent,marginBottom:5}}>{sec.icon} {sec.name}</div>
                      {sec.tasks.slice(0,4).map((t,i)=>(
                        <div key={i} style={{fontSize:11,color:"#1a3c2a",lineHeight:1.6,borderBottom:i<Math.min(sec.tasks.length,4)-1?"1px solid rgba(56,161,105,.07)":"none",padding:"2px 0"}}>
                          • {t}
                        </div>
                      ))}
                      {sec.tasks.length>4&&<div style={{fontSize:10,color:"#7aab8a",marginTop:3}}>他 {sec.tasks.length-4} 件…</div>}
                    </div>
                  );
                })}
              </div>

              {parsed.sections.every(s=>s.tasks.length===0)&&(
                <div style={{textAlign:"center",padding:"20px",color:"#7aab8a",fontSize:13}}>
                  タスクデータが見つかりませんでした。<br/>別のシートを選んでください。
                </div>
              )}
            </>
          )}
        </div>

        <div style={{padding:"10px 18px 30px",display:"flex",gap:9,borderTop:"1px solid rgba(56,161,105,.13)"}}>
          <button onClick={step==="preview"?()=>setStep("drop"):onClose}
            style={{...btn,background:"rgba(26,60,42,.07)",color:"#2d5a3d"}}>
            {step==="preview"?"← 戻る":"キャンセル"}
          </button>
          {step==="preview"&&parsed&&(
            <button onClick={()=>onImport(parsed)}
              style={{...btn,flex:2,background:"linear-gradient(135deg,#38a169,#2d6a4f)",color:"white",boxShadow:"0 4px 12px rgba(56,161,105,.3)"}}>
              📥 このシートをインポート
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthlyView({data,year,month,changeMonth,toggleTask,toggleSec,onEdit}){
  const sections=data.sections||[], checked=data.checked||{}, openSecs=data.openSecs||{};
  const total=sections.reduce((a,s)=>a+s.tasks.length,0);
  const done=sections.reduce((a,s)=>a+s.tasks.filter((_,i)=>checked[`${s.id}:${i}`]).length,0);
  const pct=total?Math.round(done/total*100):0;
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#1b4332,#2d6a4f 55%,#1b4332)",padding:"14px 18px 18px",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:10,position:"relative",zIndex:1}}>
          <button onClick={()=>changeMonth(-1)} style={{background:"rgba(255,255,255,.1)",border:"none",color:"rgba(255,255,255,.75)",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:16}}>‹</button>
          <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:17,color:"#d4edda",fontWeight:600,textAlign:"center"}}>{year}年 {MONTHS_JP[month-1]}</div>
          <button onClick={()=>changeMonth(1)} style={{background:"rgba(255,255,255,.1)",border:"none",color:"rgba(255,255,255,.75)",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:16}}>›</button>
        </div>
        <div style={{position:"relative",zIndex:1,marginBottom:10}}>
          {data.theme
            ?<div style={{fontFamily:"'Shippori Mincho',serif",fontSize:12,color:"#a8d8b9",marginBottom:5,lineHeight:1.6}}>💕 {data.theme}</div>
            :<div style={{fontSize:11,color:"rgba(255,255,255,.3)",fontStyle:"italic"}}>— 今月のテーマを設定してください —</div>
          }
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {(data.emotionTags||[]).map((t,i)=>(
              <span key={i} style={{background:"rgba(56,161,105,.2)",border:"1px solid rgba(56,161,105,.3)",color:"#a8d8b9",padding:"2px 8px",borderRadius:12,fontSize:10}}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:4}}>
            <span>今月の達成率</span>
            <span style={{color:"#d4edda",fontWeight:700}}>{pct}% ({done}/{total})</span>
          </div>
          <div style={{background:"rgba(255,255,255,.12)",borderRadius:6,height:7,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:6,width:`${pct}%`,background:"linear-gradient(90deg,#38a169,#68d391)",transition:"width .7s"}}/>
          </div>
        </div>
        <button onClick={onEdit} style={{position:"absolute",bottom:16,right:18,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.18)",color:"rgba(255,255,255,.75)",padding:"5px 12px",borderRadius:16,fontSize:11,fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer",zIndex:1}}>✏️ 編集</button>
      </div>
      <div style={{padding:"12px 12px 30px"}}>
        {(data.health||[]).some(h=>h.value)&&(
          <div style={{background:"linear-gradient(135deg,#f0fdf4,#e8f5e9)",border:"1.5px solid #b7e4c7",borderRadius:14,padding:13,marginBottom:11,boxShadow:"0 2px 8px rgba(26,60,42,.06)"}}>
            <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:12,fontWeight:700,color:"#2d6a4f",marginBottom:9}}>💪 健康目標</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {(data.health||[]).filter(h=>h.value).map((h,i)=>(
                <div key={i} style={{background:"white",borderRadius:8,padding:"7px 10px",border:"1px solid rgba(56,161,105,.15)"}}>
                  <div style={{fontSize:9,color:"#7aab8a",marginBottom:1}}>{h.label}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#1a3c2a"}}>{h.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {sections.map(sec=>{
          const col=C[sec.color]||C.rose;
          const d=sec.tasks.filter((_,i)=>checked[`${sec.id}:${i}`]).length;
          const sp=sec.tasks.length?Math.round(d/sec.tasks.length*100):0;
          const isOpen=openSecs[sec.id]!==false;
          return (
            <div key={sec.id} style={{background:"white",borderRadius:13,marginBottom:9,boxShadow:"0 2px 8px rgba(26,60,42,.06)",border:"1px solid rgba(56,161,105,.1)",overflow:"hidden"}}>
              <div className="sh" onClick={()=>toggleSec(sec.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 13px",cursor:"pointer",userSelect:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:8,background:col.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{sec.icon}</div>
                  <div>
                    <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:13,fontWeight:700,color:col.accent}}>{sec.name}</div>
                    <div style={{fontSize:10,color:"#7aab8a",marginTop:1}}>{d} / {sec.tasks.length} 完了</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:42,height:5,borderRadius:3,background:"rgba(26,60,42,.08)",overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,width:`${sp}%`,background:col.accent,transition:"width .4s"}}/>
                  </div>
                  <div style={{fontSize:10,color:"#7aab8a",transform:isOpen?"rotate(180deg)":"rotate(0)",transition:"transform .25s"}}>▼</div>
                </div>
              </div>
              {isOpen&&(
                <div className="sb" style={{padding:"2px 13px 10px",borderTop:"1px solid rgba(56,161,105,.09)"}}>
                  {sec.tasks.length===0
                    ?<div style={{fontSize:12,color:"#7aab8a",padding:"10px 4px",fontStyle:"italic"}}>タスクがありません。✏️ 編集から追加してください。</div>
                    :sec.tasks.map((task,i)=>{
                      const isDone=!!checked[`${sec.id}:${i}`];
                      return (
                        <div key={i} className="rh" onClick={()=>toggleTask(sec.id,i)}
                          style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 4px",
                            borderBottom:i<sec.tasks.length-1?"1px solid rgba(56,161,105,.08)":"none",cursor:"pointer"}}>
                          <div style={{width:20,height:20,borderRadius:6,flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"white",background:isDone?col.accent:"transparent",border:isDone?`2px solid ${col.accent}`:"2px solid #b7e4c7",transition:"all .2s"}}>{isDone?"✓":""}</div>
                          <div style={{fontSize:13,lineHeight:1.55,flex:1,color:isDone?"#7aab8a":"#1a3c2a",textDecoration:isDone?"line-through":"none"}}>{task}</div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          );
        })}
        <div style={{textAlign:"center",fontSize:11,color:"#7aab8a",paddingTop:6}}>✨ タップでチェック ／ セクションをタップで折りたたみ</div>
      </div>
    </div>
  );
}

function VisionView({visionKey}){
  const v=VISION_DATA[visionKey];
  if(!v) return null;
  const [openSecs,setOpenSecs]=useState(Object.fromEntries(v.sections.map(s=>[s.id,true])));
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#1b4332,#2d6a4f 55%,#1b4332)",padding:"16px 18px 18px"}}>
        <div style={{textAlign:"center",marginBottom:10}}>
          <div style={{fontSize:32,marginBottom:4}}>{v.icon}</div>
          <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:18,fontWeight:700,color:"#d4edda"}}>{v.title}のビジョン</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.55)",marginTop:2}}>{v.subtitle}</div>
        </div>
        <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#a8d8b9",lineHeight:1.7,textAlign:"center",fontFamily:"'Shippori Mincho',serif"}}>💕 {v.theme}</div>
      </div>
      <div style={{padding:"12px 12px 30px"}}>
        {v.sections.map(sec=>{
          const col=C[sec.color]||C.rose;
          const isOpen=openSecs[sec.id]!==false;
          return (
            <div key={sec.id} style={{background:"white",borderRadius:13,marginBottom:9,boxShadow:"0 2px 8px rgba(26,60,42,.06)",border:"1px solid rgba(56,161,105,.1)",overflow:"hidden"}}>
              <div className="sh" onClick={()=>setOpenSecs(p=>({...p,[sec.id]:!p[sec.id]}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 13px",cursor:"pointer",userSelect:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:30,height:30,borderRadius:8,background:col.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{sec.icon}</div>
                  <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:13,fontWeight:700,color:col.accent}}>{sec.name}</div>
                </div>
                <div style={{fontSize:10,color:"#7aab8a",transform:isOpen?"rotate(180deg)":"rotate(0)",transition:"transform .25s"}}>▼</div>
              </div>
              {isOpen&&(
                <div className="sb" style={{padding:"4px 13px 12px",borderTop:"1px solid rgba(56,161,105,.09)"}}>
                  {sec.content.split("\n").map((line,i)=>(
                    <div key={i} style={{fontSize:13,lineHeight:1.7,color:"#1a3c2a",padding:"3px 0",borderBottom:i<sec.content.split("\n").length-1?"1px solid rgba(56,161,105,.06)":"none"}}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoginScreen(){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [info,setInfo]=useState("");
  const [loading,setLoading]=useState(false);
  const ERR_MAP={"auth/email-already-in-use":"このメールアドレスは既に登録されています","auth/invalid-email":"メールアドレスの形式が正しくありません","auth/weak-password":"パスワードは6文字以上にしてください","auth/user-not-found":"メールアドレスまたはパスワードが間違っています","auth/wrong-password":"メールアドレスまたはパスワードが間違っています","auth/invalid-credential":"メールアドレスまたはパスワードが間違っています","auth/too-many-requests":"しばらく時間をおいてからお試しください"};
  const handle=async()=>{
    setError("");setInfo("");setLoading(true);
    try{
      if(mode==="register") await createUserWithEmailAndPassword(auth,email,password);
      else if(mode==="login") await signInWithEmailAndPassword(auth,email,password);
      else{ await sendPasswordResetEmail(auth,email); setInfo("パスワードリセットメールを送信しました"); }
    }catch(e){ setError(ERR_MAP[e.code]||"エラーが発生しました"); }
    setLoading(false);
  };
  const inp={width:"100%",padding:"12px 14px",borderRadius:10,fontSize:14,fontFamily:"'Zen Maru Gothic',sans-serif",color:"#1a3c2a",border:"1.5px solid #b7e4c7",background:"white",outline:"none",marginBottom:10,display:"block"};
  const titles={login:"ログイン",register:"新規登録",reset:"パスワードをリセット"};
  const btnLabels={login:"ログイン",register:"登録する",reset:"リセットメールを送信"};
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f1f8f4",fontFamily:"'Zen Maru Gothic',sans-serif",padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;700&family=Shippori+Mincho:wght@700&display=swap');`}</style>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:10}}>🌿</div>
          <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:22,fontWeight:700,color:"#1a3c2a",marginBottom:4}}>フューチャーマップ</div>
          <div style={{fontSize:12,color:"#7aab8a",lineHeight:1.7}}>毎月の目標を管理して<br/>「愛し愛される人生」を実現する</div>
        </div>
        <div style={{background:"white",borderRadius:18,padding:"24px 22px",boxShadow:"0 4px 24px rgba(56,161,105,.12)",border:"1px solid #d4edda"}}>
          <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:16,fontWeight:700,color:"#2d6a4f",marginBottom:18,textAlign:"center"}}>{titles[mode]}</div>
          <input type="email" placeholder="メールアドレス" value={email} onChange={e=>setEmail(e.target.value)} style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          {mode!=="reset"&&<input type="password" placeholder="パスワード（6文字以上）" value={password} onChange={e=>setPassword(e.target.value)} style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>}
          {error&&<div style={{fontSize:12,color:"#e53e3e",marginBottom:10,background:"#fff5f5",borderRadius:8,padding:"8px 12px"}}>{error}</div>}
          {info&&<div style={{fontSize:12,color:"#2d6a4f",marginBottom:10,background:"#f0fdf4",borderRadius:8,padding:"8px 12px"}}>{info}</div>}
          <button onClick={handle} disabled={loading} style={{width:"100%",background:"linear-gradient(135deg,#38a169,#2d6a4f)",color:"white",border:"none",borderRadius:11,padding:"13px",fontSize:14,fontWeight:700,fontFamily:"'Zen Maru Gothic',sans-serif",cursor:loading?"default":"pointer",boxShadow:"0 4px 14px rgba(56,161,105,.3)",marginBottom:14,opacity:loading?.7:1}}>{loading?"処理中...":btnLabels[mode]}</button>
          <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
            {mode==="login"&&<>
              <button onClick={()=>{setMode("register");setError("");setInfo("");}} style={{background:"none",border:"none",color:"#38a169",fontSize:13,cursor:"pointer",fontFamily:"'Zen Maru Gothic',sans-serif"}}>アカウントをお持ちでない方はこちら →</button>
              <button onClick={()=>{setMode("reset");setError("");setInfo("");}} style={{background:"none",border:"none",color:"#7aab8a",fontSize:12,cursor:"pointer",fontFamily:"'Zen Maru Gothic',sans-serif"}}>パスワードをお忘れの方</button>
            </>}
            {mode!=="login"&&<button onClick={()=>{setMode("login");setError("");setInfo("");}} style={{background:"none",border:"none",color:"#38a169",fontSize:13,cursor:"pointer",fontFamily:"'Zen Maru Gothic',sans-serif"}}>← ログインに戻る</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Splash({msg}){
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f1f8f4",fontFamily:"'Zen Maru Gothic',sans-serif",color:"#7aab8a",fontSize:14}}>🌿 {msg}</div>;
}

function EditModal({data,onSave,onClose}){
  const [tab,setTab]=useState("tasks");
  const [theme,setTheme]=useState(data.theme||"");
  const [themeSub,setThemeSub]=useState(data.themeSub||"");
  const [etText,setEtText]=useState((data.emotionTags||[]).join("、"));
  const [htText,setHtText]=useState((data.health||[]).map(h=>`${h.label}: ${h.value}`).join("\n"));
  const [secTexts,setSecTexts]=useState(Object.fromEntries((data.sections||[]).map(s=>[s.id,s.tasks.join("\n")])));
  const save=()=>{
    const emotionTags=etText.split(/[、,，]/).map(t=>t.trim()).filter(Boolean);
    const health=htText.split("\n").map(line=>{const ci=line.indexOf(":");return ci<0?{label:line.trim(),value:""}:{label:line.slice(0,ci).trim(),value:line.slice(ci+1).trim()};}).filter(h=>h.label);
    const sections=(data.sections||[]).map(s=>({...s,tasks:(secTexts[s.id]||"").split("\n").map(t=>t.trim()).filter(Boolean)}));
    const checked={...(data.checked||{})};
    sections.forEach(s=>{const old=(data.sections||[]).find(x=>x.id===s.id);if(old)for(let i=s.tasks.length;i<old.tasks.length;i++)delete checked[`${s.id}:${i}`];});
    onSave({theme,themeSub,emotionTags,health,sections,checked});
  };
  const TABS=[{id:"tasks",label:"📋 タスク"},{id:"health",label:"💪 健康"},{id:"theme",label:"💭 テーマ"}];
  const ta={width:"100%",border:"1.5px solid #b7e4c7",borderRadius:9,padding:"9px 11px",fontSize:12,fontFamily:"'Zen Maru Gothic',sans-serif",color:"#1a3c2a",background:"white",resize:"vertical",lineHeight:1.8,display:"block"};
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(26,60,42,.55)",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div className="mi" style={{background:"#f4fbf6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:640,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{width:38,height:4,background:"#7aab8a",borderRadius:2,margin:"14px auto 0",opacity:.4}}/>
        <div style={{padding:"12px 18px 0"}}>
          <div style={{fontFamily:"'Shippori Mincho',serif",fontSize:16,fontWeight:700,color:"#2d6a4f",marginBottom:10}}>✏️ 今月の目標を編集</div>
          <div style={{display:"flex",gap:5,marginBottom:12}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"5px 13px",borderRadius:18,border:"none",cursor:"pointer",fontSize:11,fontFamily:"'Zen Maru Gothic',sans-serif",fontWeight:600,background:tab===t.id?"#38a169":"rgba(26,60,42,.07)",color:tab===t.id?"white":"#2d5a3d",transition:"all .2s"}}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"0 18px 18px",flex:1}}>
          {tab==="theme"&&[{label:"今月のテーマ",val:theme,set:setTheme,rows:2,hint:""},{label:"サブテーマ",val:themeSub,set:setThemeSub,rows:2,hint:""},{label:"感情タグ（カンマ・読点区切り）",val:etText,set:setEtText,rows:2,hint:"例: ワクワク、幸せ、ツイてる♪"}].map(f=>(
            <div key={f.label} style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#2d5a3d",marginBottom:5}}>{f.label}</div>
              <textarea value={f.val} onChange={e=>f.set(e.target.value)} rows={f.rows} style={ta}/>
              {f.hint&&<div style={{fontSize:10,color:"#7aab8a",marginTop:2}}>{f.hint}</div>}
            </div>
          ))}
          {tab==="health"&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#2d5a3d",marginBottom:5}}>健康目標（各行: ラベル: 値）</div>
              <textarea value={htText} onChange={e=>setHtText(e.target.value)} rows={10} style={ta}/>
              <div style={{fontSize:10,color:"#7aab8a",marginTop:2}}>例: 就寝: 22:00</div>
            </div>
          )}
          {tab==="tasks"&&(data.sections||[]).map(sec=>{
            const col=C[sec.color]||C.rose;
            return (
              <div key={sec.id} style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:col.accent,marginBottom:5,display:"flex",alignItems:"center",gap:4}}>{sec.icon} {sec.name}</div>
                <textarea value={secTexts[sec.id]||""} onChange={e=>setSecTexts(p=>({...p,[sec.id]:e.target.value}))} rows={Math.max(3,(secTexts[sec.id]||"").split("\n").length+1)} style={ta}/>
                <div style={{fontSize:10,color:"#7aab8a",marginTop:2}}>1行に1タスク</div>
              </div>
            );
          })}
        </div>
        <div style={{padding:"10px 18px 30px",display:"flex",gap:9,borderTop:"1px solid rgba(56,161,105,.13)"}}>
          <button onClick={onClose} style={{background:"rgba(26,60,42,.07)",color:"#2d5a3d",border:"none",borderRadius:11,padding:"11px 18px",fontSize:13,fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer"}}>キャンセル</button>
          <button onClick={save} style={{flex:1,background:"linear-gradient(135deg,#38a169,#2d6a4f)",color:"white",border:"none",borderRadius:11,padding:"11px",fontSize:13,fontWeight:700,fontFamily:"'Zen Maru Gothic',sans-serif",cursor:"pointer",boxShadow:"0 4px 12px rgba(56,161,105,.3)"}}>💾 保存する</button>
        </div>
      </div>
    </div>
  );
}
