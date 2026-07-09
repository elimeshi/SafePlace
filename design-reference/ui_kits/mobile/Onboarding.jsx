// Safe-Place mobile UI kit — 3-step onboarding wizard (master §6.2).
// Step 1 welcome · Step 2 account + gender · Step 3 read-only defaults.
const { Button, TextField, GenderChoice, Checkbox, Toggle } = window.SafePlaceDesignSystem_58efd0;

function ProgressBar({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '0 24px', marginBottom: 8 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? 'var(--color-primary)' : 'var(--ink-200)', transition: 'background var(--dur-base) var(--ease-standard)' }} />
      ))}
    </div>
  );
}

function Wordmark({ size = 40 }) {
  return (
    <div style={{ fontFamily: 'Rubik', fontWeight: 700, fontSize: size, color: 'var(--blue-600)', letterSpacing: '-.01em' }}>
      Safe<span style={{ color: 'var(--terracotta-500)' }}>·</span>Place
    </div>
  );
}

function StepWelcome({ onNext }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, gap: 20 }}>
      <div className="sp-rise" style={{ animationDelay: '0ms' }}><Wordmark size={44} /></div>
      <div className="sp-rise" style={{ animationDelay: '90ms', fontSize: 18, color: 'var(--ink-500)', fontWeight: 500 }}>מקום שמור</div>
      <p className="sp-rise" style={{ animationDelay: '180ms', font: 'var(--type-body)', color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.7 }}>
        מרחב חברתי שמכבד את אורח חייך — אתה שולט במה שאתה רואה, ובמה שאתה חולק.
      </p>
      <div className="sp-rise" style={{ animationDelay: '280ms', display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300, marginTop: 12 }}>
        <Button variant="cta" size="lg" halo block onClick={onNext}>יצירת חשבון</Button>
        <Button variant="secondary" size="lg" block>כניסה לחשבון קיים</Button>
      </div>
    </div>
  );
}

function StepAccount({ onNext, data, setData }) {
  const set = k => e => setData({ ...data, [k]: e.target.value });
  const ready = data.name && data.contact && data.password && data.gender && data.agree;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 18, overflowY: 'auto' }}>
      <h2 className="sp-rise" style={{ font: 'var(--type-h2)', color: 'var(--text-primary)' }}>פרטי החשבון שלך</h2>
      <div className="sp-rise" style={{ animationDelay: '80ms', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextField label="שם מלא" value={data.name} onChange={set('name')} valid={data.name && data.name.length > 1} />
        <TextField label="אימייל או מספר טלפון" value={data.contact} onChange={set('contact')} />
        <TextField label="סיסמה" type="password" value={data.password} onChange={set('password')} />
      </div>
      <div className="sp-rise" style={{ animationDelay: '160ms' }}>
        <div style={{ font: 'var(--type-label)', color: 'var(--text-muted)', marginBottom: 8 }}>בחירת חשבון</div>
        <GenderChoice value={data.gender} onChange={g => setData({ ...data, gender: g })} />
      </div>
      <div className="sp-rise" style={{ animationDelay: '240ms' }}>
        <Checkbox checked={!!data.agree} onChange={v => setData({ ...data, agree: v })}>
          קראתי ואני מסכים ל<a href="#">תנאי השימוש</a> ול<a href="#">מדיניות הפרטיות</a>
        </Checkbox>
      </div>
      <div style={{ flex: 1 }} />
      <Button variant="cta" size="lg" halo={ready} block disabled={!ready} onClick={onNext}>המשך</Button>
    </div>
  );
}

function StepDefaults({ onDone, data }) {
  const male = data.gender === 'male';
  // Mirrors resolveDefaultFilterSettings from @safeplace/visibility-policy.
  const defaults = male
    ? [
        { label: 'אינך רואה תוכן הכולל נשים', on: true },
        { label: 'אינך רואה חשבונות שהוגדרו כנשיים', on: true },
        { label: 'הצגת פוסטים מוצעים בפיד', on: true },
      ]
    : [
        { label: 'רואה את כל התוכן במרחב הציבורי', on: true },
        { label: 'הצגת פוסטים מוצעים בפיד', on: true },
        { label: 'סינון תוכן — כבוי כברירת מחדל', on: false },
      ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 18 }}>
      <h2 className="sp-rise" style={{ font: 'var(--type-h2)', color: 'var(--text-primary)' }}>ברירות המחדל שלך</h2>
      <p className="sp-rise" style={{ animationDelay: '80ms', font: 'var(--type-body)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        הגדרנו עבורך את ההעדפות הבאות. תוכל לשנותן בכל עת באזור האישי.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
        {defaults.map((d, i) => (
          <div key={i} className="sp-rise" style={{ animationDelay: `${160 + i * 110}ms`, display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
            <Toggle readOnly checked={d.on} />
            <span style={{ font: 'var(--type-body-strong)', color: 'var(--text-primary)' }}>{d.label}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <p style={{ font: 'var(--type-meta)', color: 'var(--text-muted)', textAlign: 'center' }}>אלו הגדרות שהותאמו — לא כלל. ניתן לשנות בכל עת.</p>
      <Button variant="cta" size="lg" halo block onClick={onDone}>הבנתי, המשך</Button>
    </div>
  );
}

function Onboarding({ onFinish }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({ name: '', contact: '', password: '', gender: '', agree: false });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--white)', paddingTop: 12 }}>
      {step > 0 && <ProgressBar step={step} />}
      <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && <StepAccount data={data} setData={setData} onNext={() => setStep(2)} />}
        {step === 2 && <StepDefaults data={data} onDone={onFinish} />}
      </div>
    </div>
  );
}

window.SPOnboarding = Onboarding;
