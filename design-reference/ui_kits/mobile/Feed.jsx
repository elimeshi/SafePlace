// Safe-Place mobile UI kit — Main Feed screen.
// Composes design-system components (PostCard, Avatar, SourceLabel, Icon).
// RTL, mobile-first (master §5.2, feed-spec §2).
const { Avatar, SourceLabel, Icon, PostCard } = window.SafePlaceDesignSystem_58efd0;

const STORIES = [
  { name: 'שרה ל.', color: 'var(--group-terra)' },
  { name: 'משפ׳ כהן', color: 'var(--group-sage)' },
  { name: 'רבקה', color: 'var(--group-plum)' },
  { name: 'מרים ט.', color: 'var(--group-indigo)' },
  { name: 'חנה', color: 'var(--group-brick)' },
];

const SPACES = [
  { name: 'שכונת רמות', color: 'var(--group-indigo)', icon: 'home', last: 'משפחת רוזנברג', time: 'לפני שעה', preview: 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=400&q=80' },
  { name: 'חסדי הקהילה', color: 'var(--group-sage)', icon: 'users', last: 'דוד מ.', time: 'לפני 3 שעות', text: 'תודה לכל מי שתרם השבוע 🙏' },
  { name: 'בית כנסת מרכזי', color: 'var(--group-clay)', icon: 'home', last: 'הגבאי', time: 'אתמול', text: 'זמני תפילה לשבת הקרובה' },
];

const POSTS = [
  {
    author: { name: 'משפחת רוזנברג' }, time: 'לפני שעתיים',
    source: { kind: 'group', name: 'שכונת רמות', color: 'var(--group-indigo)', icon: 'home' },
    body: 'תודה ענקית לכל המתנדבים שהגיעו אתמול לחלוקת החבילות לקראת החג. הקהילה שלנו פשוט מדהימה 💙',
    media: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?w=800&q=80',
    likes: 42, comments: 8,
  },
  {
    author: { name: 'הרב אליהו כ.' }, time: 'לפני 4 שעות',
    source: { kind: 'public' },
    body: 'מחשבה קצרה לפרשת השבוע: לפעמים הדבר הגדול ביותר שאפשר לתת לזולת הוא פשוט להקשיב. שבת שלום לכולם.',
    likes: 128, comments: 23, liked: true,
  },
  {
    author: { name: 'גמ״ח הסעות' }, time: 'לפני 6 שעות',
    source: { kind: 'suggested' },
    body: 'נפתחה קבוצה חדשה לתיאום נסיעות בין הערים. הצטרפו כדי לחסוך ולעזור אחד לשני.',
    media: 'x', filtered: true,
    likes: 15, comments: 3,
  },
];

const FOLLOW = [
  { name: 'שיעורי הרב לוי', followers: '2.4k' },
  { name: 'לוח קהילתי', followers: '890' },
  { name: 'חדשות השכונה', followers: '5.1k' },
];

function AppBar({ compact }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--ink-100)',
    }}>
      <span style={{ fontFamily: 'Rubik', fontWeight: 700, fontSize: 22, color: 'var(--blue-600)', letterSpacing: '-.01em' }}>
        Safe<span style={{ color: 'var(--terracotta-500)' }}>·</span>Place
      </span>
      <div style={{ display: 'flex', gap: 6, color: 'var(--ink-700)' }}>
        <button className="sp-iconbtn"><Icon name="search" size={22} /></button>
        <button className="sp-iconbtn" style={{ position: 'relative' }}>
          <Icon name="bell" size={22} />
          <span style={{ position: 'absolute', top: 6, insetInlineStart: 6, width: 8, height: 8, borderRadius: 999, background: 'var(--terracotta-500)', border: '1.5px solid #fff' }} />
        </button>
      </div>
    </div>
  );
}

function StoriesRail({ onCreate }) {
  return (
    <div className="sp-hscroll" style={{ display: 'flex', gap: 14, padding: '14px 16px', borderBottom: '1px solid var(--ink-100)' }}>
      <button onClick={onCreate} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
        <span style={{ width: 60, height: 60, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--blue-050)', border: '2px dashed var(--blue-300)', color: 'var(--blue-600)' }}>
          <Icon name="plus" size={24} />
        </span>
        <span style={{ font: 'var(--type-label)', color: 'var(--text-secondary)' }}>יצירה</span>
      </button>
      {STORIES.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Avatar name={s.name} size={60} ring ringColor={s.color} />
          <span style={{ font: 'var(--type-label)', color: 'var(--text-secondary)', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
        </div>
      ))}
    </div>
  );
}

function SpacesRail() {
  return (
    <div className="sp-hscroll" style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--ink-100)' }}>
      {SPACES.map((sp, i) => (
        <div key={i} style={{ width: 150, flex: '0 0 auto', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--white)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: sp.color }}>
            <Icon name={sp.icon} size={16} color="#fff" />
            <span style={{ font: 'var(--type-label)', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.name}</span>
          </div>
          {sp.preview
            ? <img src={sp.preview} alt="" style={{ width: '100%', height: 74, objectFit: 'cover', display: 'block' }} />
            : <div style={{ height: 74, padding: 10, font: 'var(--type-meta)', color: 'var(--text-secondary)', background: 'var(--ink-050)', overflow: 'hidden' }}>{sp.text}</div>}
          <div style={{ padding: '7px 10px', font: 'var(--type-label)', color: 'var(--text-muted)' }}>{sp.last} · {sp.time}</div>
        </div>
      ))}
    </div>
  );
}

function FollowRail() {
  return (
    <div style={{ padding: '16px', background: 'var(--surface-sunken)' }}>
      <div style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)', marginBottom: 10 }}>הצעות למעקב</div>
      <div className="sp-hscroll" style={{ display: 'flex', gap: 12 }}>
        {FOLLOW.map((f, i) => (
          <div key={i} style={{ width: 130, flex: '0 0 auto', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 14, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar name={f.name} size={52} />
            <div style={{ font: 'var(--type-label)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{f.name}</div>
            <div className="sp-numeric" style={{ font: 'var(--type-label)', color: 'var(--text-muted)' }}>{f.followers} עוקבים</div>
            <button style={{ width: '100%', padding: '7px', border: '1px solid var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)', font: 'var(--type-label)', fontWeight: 600, cursor: 'pointer' }}>עקוב</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomTabs({ onCreate }) {
  const Tab = ({ icon, active }) => (
    <button className="sp-iconbtn" style={{ color: active ? 'var(--color-primary)' : 'var(--ink-400)', flex: 1 }}>
      <Icon name={icon} size={24} strokeWidth={active ? 2.4 : 2} />
    </button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderTop: '1px solid var(--ink-100)', background: 'var(--white)' }}>
      <Tab icon="home" active />
      <Tab icon="search" />
      <button onClick={onCreate} className="sp-iconbtn" style={{ flex: 1, color: '#fff' }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--color-primary)', display: 'grid', placeItems: 'center' }}><Icon name="plus" size={24} /></span>
      </button>
      <Tab icon="bell" />
      <Tab icon="user" />
    </div>
  );
}

function Feed({ onCreate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-muted)' }}>
      <AppBar />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: 'var(--white)' }}>
          <StoriesRail onCreate={onCreate} />
          <SpacesRail />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14 }}>
          {POSTS.map((p, i) => <PostCard key={i} post={p} filtered={p.filtered} style={{ maxWidth: '100%' }} />)}
        </div>
        <FollowRail />
      </div>
      <BottomTabs onCreate={onCreate} />
    </div>
  );
}

window.SPFeed = Feed;
