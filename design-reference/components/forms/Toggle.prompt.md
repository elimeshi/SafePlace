**Toggle** — switch. Interactive in Settings; `readOnly` for the onboarding step-3 defaults presentation (the user is *informed*, not asked — spec §6.2.3). RTL: "on" slides the knob to the right.

```jsx
<Toggle readOnly checked label="אינך רואה תוכן הכולל נשים" />
<Toggle checked={sugg} onChange={setSugg} label="הצג פוסטים מוצעים" description="תוכן מקבוצות שאינך עוקב אחריהן" />
```
