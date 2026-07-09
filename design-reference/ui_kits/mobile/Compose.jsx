// Safe-Place mobile UI kit — post creation screen (post-creation-spec §3).
// Text-first writing area, exposure field, attachments bar. Demonstrates the
// neutral women-detected upload notice (master §4.4.2) via the media button.
const { Avatar, Icon, Button, SystemNotice } = window.SafePlaceDesignSystem_58efd0;

const EXPOSURE = [
  { value: 'public', label: 'ציבורי', icon: 'users' },
  { value: 'followers', label: 'עוקבים בלבד', icon: 'user' },
  { value: 'group', label: 'קבוצה ספציפית', icon: 'home' },
  { value: 'family', label: 'מרחב משפחתי', icon: 'lock' },
];

function Compose({ onClose }) {
  const [text, setText] = React.useState('');
  const [exposure, setExposure] = React.useState('public');
  const [pickerOpen, setPicker] = React.useState(false);
  const [notice, setNotice] = React.useState(false);
  const [hasMedia, setHasMedia] = React.useState(false);
  const cur = EXPOSURE.find(e => e.value === exposure);

  const attach = (
    { media: () => { setNotice(true); }, }
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--white)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--ink-100)' }}>
        <button className="sp-iconbtn" onClick={onClose} style={{ color: 'var(--ink-700)' }}><Icon name="x" size={22} /></button>
        <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>פוסט חדש</span>
        <Button size="sm" disabled={!text.trim()}>פרסם</Button>
      </div>

      {/* Identity + exposure */}
      <div style={{ display: 'flex', gap: 12, padding: '16px', alignItems: 'flex-start' }}>
        <Avatar name="שרה ל." size={44} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>שרה ל.</span>
          <button onClick={() => setPicker(!pickerOpen)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--surface-sunken)', border: '1px solid var(--blue-200)', borderRadius: 999, color: 'var(--blue-700)', font: 'var(--type-label)', cursor: 'pointer' }}>
            <Icon name={cur.icon} size={13} /> {cur.label} <Icon name="chevron-down" size={13} />
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div style={{ margin: '0 16px 8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', font: 'var(--type-label)', color: 'var(--text-muted)', background: 'var(--ink-050)' }}>מי יראה את זה?</div>
          {EXPOSURE.map(e => (
            <button key={e.value} onClick={() => { setExposure(e.value); setPicker(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', background: e.value === exposure ? 'var(--blue-050)' : 'transparent', border: 'none', borderTop: '1px solid var(--ink-100)', cursor: 'pointer', font: 'var(--type-body)', color: 'var(--text-primary)' }}>
              <Icon name={e.icon} size={18} color="var(--blue-600)" /> {e.label}
              {e.value === exposure && <span style={{ marginInlineStart: 'auto' }}><Icon name="check" size={18} color="var(--color-primary)" /></span>}
            </button>
          ))}
        </div>
      )}

      {/* Writing area */}
      <textarea
        value={text} onChange={e => setText(e.target.value)}
        placeholder="מה תרצה לשתף?"
        style={{ flex: 1, margin: '0 16px', border: 'none', outline: 'none', resize: 'none', font: 'var(--type-body)', lineHeight: 1.7, color: 'var(--text-primary)', background: 'transparent' }}
      />

      {hasMedia && (
        <div style={{ margin: '0 16px 12px', position: 'relative' }}>
          <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80" alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
        </div>
      )}

      {notice && (
        <div style={{ margin: '0 16px 12px' }}>
          <SystemNotice tone="info" title="זוהו נשים במדיה שהעלית"
            confirmLabel="אישור" cancelLabel="חזרה"
            onConfirm={() => { setNotice(false); setHasMedia(true); }}
            onCancel={() => setNotice(false)}>
            עליך לדעת שבעקבות זאת משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי.
          </SystemNotice>
        </div>
      )}

      {/* Attachments bar */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 12px', borderTop: '1px solid var(--ink-100)' }}>
        {[['image', 'מדיה', () => setNotice(true)], ['poll', 'סקר'], ['map-pin', 'מיקום'], ['tag', 'תיוג']].map(([ic, lbl, fn]) => (
          <button key={ic} onClick={fn} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', font: 'var(--type-meta)', cursor: 'pointer' }}>
            <Icon name={ic} size={20} color="var(--blue-600)" /> {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

window.SPCompose = Compose;
