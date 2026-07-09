**SystemNotice** — neutral, factual message block. Its signature use is the women-detected upload alert (master §4.4.2) — informs, never blocks or preaches. Also the Settings dangerous-zone confirmations.

```jsx
<SystemNotice tone="info" title="זוהו נשים במדיה שהעלית"
  confirmLabel="אישור" cancelLabel="חזרה" onConfirm={publish} onCancel={back}>
  משתמשים רבים ברשת לא יוכלו לראות את תוכן המדיה שלך בפוסט הנוכחי.
</SystemNotice>
```
Tones: `info` · `warning` (dangerous-zone) · `danger`.
