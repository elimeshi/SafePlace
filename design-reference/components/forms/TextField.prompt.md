**TextField** — floating-label input, RTL. Focus draws the accent border and floats the label; pass `valid` to show the success check (spec §6.3.2).

```jsx
<TextField label="שם מלא" value={name} onChange={e => setName(e.target.value)} valid={name.length > 1} />
<TextField label="אימייל או טלפון" type="email" error="כתובת לא תקינה" />
```
