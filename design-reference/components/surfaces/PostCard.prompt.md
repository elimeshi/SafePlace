**PostCard** — the core feed unit ("Facebook-lite": white, subtle frame, breathing room). Composes Avatar + SourceLabel + InteractionBar. Pass `filtered` to render the modest filtered-media placeholder (UI defense-in-depth per CLAUDE.md invariant #2).

```jsx
<PostCard post={{
  author: { name: 'משפחת כהן' }, time: 'לפני שעתיים',
  source: { kind: 'group', name: 'שכונת רמות', color: 'var(--group-indigo)' },
  body: 'תודה לכל המתנדבים...', media: 'photo.jpg', likes: 42, comments: 8,
}} />
```
