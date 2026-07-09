/* @ds-bundle: {"format":4,"namespace":"SafePlaceDesignSystem_58efd0","components":[{"name":"Avatar","sourcePath":"components/content/Avatar.jsx"},{"name":"Icon","sourcePath":"components/content/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/content/Icon.jsx"},{"name":"InteractionBar","sourcePath":"components/content/InteractionBar.jsx"},{"name":"SourceLabel","sourcePath":"components/content/SourceLabel.jsx"},{"name":"SystemNotice","sourcePath":"components/feedback/SystemNotice.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"GenderChoice","sourcePath":"components/forms/GenderChoice.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"Toggle","sourcePath":"components/forms/Toggle.jsx"},{"name":"PostCard","sourcePath":"components/surfaces/PostCard.jsx"}],"sourceHashes":{"components/content/Avatar.jsx":"1998e739673f","components/content/Icon.jsx":"5191b3f92245","components/content/InteractionBar.jsx":"9c4ceb143523","components/content/SourceLabel.jsx":"a9ddff1e2feb","components/feedback/SystemNotice.jsx":"c39cdee31299","components/forms/Button.jsx":"9121be7e75ea","components/forms/Checkbox.jsx":"b52c0bef8373","components/forms/GenderChoice.jsx":"d4e628e6a5a1","components/forms/TextField.jsx":"8f07aa9cb77e","components/forms/Toggle.jsx":"619e3a0ff0b2","components/surfaces/PostCard.jsx":"2f1551e25827","ui_kits/mobile/Compose.jsx":"f768aa521943","ui_kits/mobile/Feed.jsx":"492327151d47","ui_kits/mobile/Onboarding.jsx":"603cc5b54a18"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SafePlaceDesignSystem_58efd0 = window.SafePlaceDesignSystem_58efd0 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/content/Avatar.jsx
try { (() => {
/**
 * Avatar. Round profile image. Optional colored ring = an unseen status
 * in the stories rail (feed-spec §2.1.2 — ring disappears once viewed).
 * Falls back to an initial on a soft blue tint when no image.
 */
function Avatar({
  src,
  name = '',
  size = 44,
  ring = false,
  ringColor,
  style
}) {
  const initial = name.trim().charAt(0) || '·';
  const ringWidth = ring ? Math.max(2, Math.round(size * 0.06)) : 0;
  const pad = ring ? Math.max(2, Math.round(size * 0.05)) : 0;
  const inner = size - (ringWidth + pad) * 2;
  const img = /*#__PURE__*/React.createElement("span", {
    style: {
      width: ring ? inner : size,
      height: ring ? inner : size,
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--blue-100)',
      color: 'var(--blue-700)',
      font: `var(--weight-semibold) ${Math.round((ring ? inner : size) * 0.42)}px/1 var(--font-sans)`,
      flex: '0 0 auto'
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initial);
  if (!ring) return React.cloneElement(img, {
    style: {
      ...img.props.style,
      ...style
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: size,
      height: size,
      borderRadius: 'var(--radius-full)',
      padding: pad,
      background: `linear-gradient(135deg, ${ringColor || 'var(--color-accent)'}, var(--blue-400))`,
      flex: '0 0 auto',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: ringWidth,
      borderRadius: 'var(--radius-full)',
      background: 'var(--white)',
      display: 'grid',
      placeItems: 'center'
    }
  }, img));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/content/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — thin wrapper over a curated subset of Lucide outline glyphs
 * (https://lucide.dev, ISC license). Safe-Place ships no icon set of its
 * own; Lucide's 2px-stroke, rounded, geometric style matches the product's
 * clean/restrained Instagram-like aesthetic. 24×24, currentColor stroke.
 *
 * Group icons (the categorized gallery of hundreds in feed-spec §2.2.4) are
 * NOT part of this set — those are chosen per-group by admins and are out of
 * scope for the component library.
 */
const GLYPHS = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  comment: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  poll: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
};
function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  color = 'currentColor',
  style,
  ...rest
}) {
  const inner = GLYPHS[name];
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      flex: '0 0 auto',
      display: 'block',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: inner || ''
    }
  }, rest));
}
const ICON_NAMES = Object.keys(GLYPHS);
Object.assign(__ds_scope, { Icon, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Icon.jsx", error: String((e && e.message) || e) }); }

// components/content/InteractionBar.jsx
try { (() => {
/**
 * InteractionBar — the minimal action row at the bottom of a post card
 * (feed-spec §4.1, master §5.2.2). Deliberately restrained: like, comment,
 * share, save. No public like COUNT pressure beyond a quiet number
 * (CLAUDE.md §8 — no social-pressure UI). RTL: actions read right-to-left.
 */
function InteractionBar({
  likes = 0,
  comments = 0,
  liked = false,
  saved = false,
  onLike,
  onComment,
  onShare,
  onSave,
  style
}) {
  const Action = ({
    icon,
    label,
    count,
    active,
    activeColor,
    onClick
  }) => {
    const [hover, setHover] = React.useState(false);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      "aria-label": label,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 10px',
        minHeight: 40,
        background: hover ? 'var(--surface-sunken)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        color: active ? activeColor || 'var(--color-primary)' : 'var(--text-secondary)',
        font: 'var(--type-meta)',
        transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: 20,
      style: active && icon === 'heart' ? {
        fill: 'currentColor'
      } : undefined
    }), count != null && count > 0 && /*#__PURE__*/React.createElement("span", {
      className: "sp-numeric"
    }, count));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      ...style
    }
  }, /*#__PURE__*/React.createElement(Action, {
    icon: "heart",
    label: "\u05DC\u05D9\u05D9\u05E7",
    count: likes,
    active: liked,
    activeColor: "var(--danger)",
    onClick: onLike
  }), /*#__PURE__*/React.createElement(Action, {
    icon: "comment",
    label: "\u05EA\u05D2\u05D5\u05D1\u05D4",
    count: comments,
    onClick: onComment
  }), /*#__PURE__*/React.createElement(Action, {
    icon: "share",
    label: "\u05E9\u05D9\u05EA\u05D5\u05E3",
    onClick: onShare
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Action, {
    icon: "bookmark",
    label: "\u05E9\u05DE\u05D9\u05E8\u05D4",
    active: saved,
    onClick: onSave
  }));
}
Object.assign(__ds_scope, { InteractionBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/InteractionBar.jsx", error: String((e && e.message) || e) }); }

// components/content/SourceLabel.jsx
try { (() => {
/**
 * SourceLabel — the small colored tag under a poster's name that tells you,
 * at a glance, where a post comes from (feed-spec §2.3.4–2.3.5, §4.2).
 * ~20px tall, rounded, generous padding, SOFT color fill (never full
 * saturation). Three kinds:
 *   - group      → group color + icon + group name
 *   - public     → neutral slate-blue "פוסט ציבורי", no icon
 *   - suggested  → warm amber "מוצע עבורך"
 */
function SourceLabel({
  kind = 'group',
  name,
  color,
  icon = 'users',
  style
}) {
  const config = {
    group: {
      text: name || 'קבוצה',
      bg: 'color-mix(in srgb, ' + (color || 'var(--group-blue)') + ' 16%, white)',
      fg: 'color-mix(in srgb, ' + (color || 'var(--group-blue)') + ' 78%, black)',
      showIcon: true
    },
    public: {
      text: 'פוסט ציבורי',
      bg: 'color-mix(in srgb, var(--label-neutral) 18%, white)',
      fg: 'color-mix(in srgb, var(--label-neutral) 82%, black)',
      showIcon: false
    },
    suggested: {
      text: 'מוצע עבורך',
      bg: 'color-mix(in srgb, var(--label-suggested) 20%, white)',
      fg: 'color-mix(in srgb, var(--label-suggested) 80%, black)',
      showIcon: false
    }
  }[kind];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: '0 10px',
      borderRadius: 'var(--radius-md)',
      background: config.bg,
      color: config.fg,
      font: 'var(--type-label)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, config.showIcon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 13,
    strokeWidth: 2.4
  }), config.text);
}
Object.assign(__ds_scope, { SourceLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SourceLabel.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Safe-Place Button.
 * Primary = deep blue by default; the ONE warm terracotta accent is
 * reserved for the single most important CTA per screen (spec §6.3.5),
 * exposed as variant="cta" with an optional idle breathing halo (§6.3.2).
 */
function Button({
  variant = 'primary',
  size = 'md',
  halo = false,
  block = false,
  disabled = false,
  type = 'button',
  onClick,
  style,
  children,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '8px 16px',
      font: 'var(--text-sm)',
      radius: 'var(--radius-md)',
      minH: 36
    },
    md: {
      padding: '11px 22px',
      font: 'var(--text-base)',
      radius: 'var(--radius-md)',
      minH: 44
    },
    lg: {
      padding: '15px 28px',
      font: 'var(--text-lg)',
      radius: 'var(--radius-lg)',
      minH: 52
    }
  }[size];
  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: 'var(--text-on-primary)',
      border: '1px solid transparent',
      '--hover-bg': 'var(--color-primary-hover)',
      '--active-bg': 'var(--color-primary-active)'
    },
    cta: {
      background: 'var(--color-accent)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent',
      '--hover-bg': 'var(--color-accent-hover)',
      '--active-bg': 'var(--color-accent-active)'
    },
    secondary: {
      background: 'var(--white)',
      color: 'var(--color-primary)',
      border: '1px solid var(--border-strong)',
      '--hover-bg': 'var(--surface-sunken)',
      '--active-bg': 'var(--blue-100)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid transparent',
      '--hover-bg': 'var(--surface-sunken)',
      '--active-bg': 'var(--blue-100)'
    },
    danger: {
      background: 'var(--white)',
      color: 'var(--danger)',
      border: '1px solid var(--danger)',
      '--hover-bg': 'var(--danger-050)',
      '--active-bg': '#f6dcdc'
    }
  }[variant];
  const [state, setState] = React.useState('rest');
  const bg = disabled ? undefined : state === 'active' ? variants['--active-bg'] : state === 'hover' ? variants['--hover-bg'] : variants.background;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setState('hover'),
    onMouseLeave: () => setState('rest'),
    onMouseDown: () => setState('active'),
    onMouseUp: () => setState('hover'),
    style: {
      display: block ? 'flex' : 'inline-flex',
      width: block ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-sm)',
      minHeight: sizes.minH,
      padding: sizes.padding,
      font: `var(--weight-semibold) ${sizes.font}/1 var(--font-sans)`,
      letterSpacing: 'var(--tracking-label)',
      borderRadius: sizes.radius,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transform: state === 'active' && !disabled ? 'scale(var(--press-scale))' : 'scale(1)',
      transition: 'background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)',
      animation: halo && !disabled ? 'sp-cta-halo var(--cta-halo-cycle) var(--ease-standard) infinite' : undefined,
      ...variants,
      background: bg,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/feedback/SystemNotice.jsx
try { (() => {
/**
 * SystemNotice — a neutral, factual message block. Its defining use is the
 * upload alert when a man's media is classified as containing women
 * (master §3.5 / §4.4.2): "זוהו נשים במדיה שהעלית..." — NOT preachy, NOT
 * blocking, just informs and lets the user decide (אישור / חזרה).
 * Also used for the Settings dangerous-zone warnings (double-confirm flows).
 *
 * tones: info (neutral blue) · warning (dangerous-zone amber) · danger.
 */
function SystemNotice({
  tone = 'info',
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  style
}) {
  const tones = {
    info: {
      bg: 'var(--surface-sunken)',
      border: 'var(--blue-200)',
      icon: 'info',
      iconColor: 'var(--color-primary)'
    },
    warning: {
      bg: 'var(--warning-050)',
      border: 'color-mix(in srgb, var(--warning) 35%, white)',
      icon: 'shield-check',
      iconColor: 'var(--warning)'
    },
    danger: {
      bg: 'var(--danger-050)',
      border: 'color-mix(in srgb, var(--danger) 35%, white)',
      icon: 'lock',
      iconColor: 'var(--danger)'
    }
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      gap: 'var(--space-md)',
      padding: 'var(--space-lg)',
      background: tones.bg,
      border: `1px solid ${tones.border}`,
      borderRadius: 'var(--radius-lg)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: tones.icon,
    size: 22,
    color: tones.iconColor,
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
      flex: 1
    }
  }, title && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, title), children && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-meta)',
      color: 'var(--text-secondary)',
      lineHeight: 1.6
    }
  }, children), (confirmLabel || cancelLabel) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-sm)',
      marginTop: 'var(--space-xs)'
    }
  }, confirmLabel && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: tone === 'danger' ? 'danger' : 'primary',
    onClick: onConfirm
  }, confirmLabel), cancelLabel && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "secondary",
    onClick: onCancel
  }, cancelLabel))));
}
Object.assign(__ds_scope, { SystemNotice });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/SystemNotice.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/**
 * Safe-Place checkbox — used for the single terms-of-service consent on
 * onboarding step 2 (spec §6.2.2). Label may contain links.
 */
function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  id,
  children,
  style
}) {
  const reactId = React.useId();
  const boxId = id || reactId;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: boxId,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-md)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    role: "checkbox",
    "aria-checked": checked,
    id: boxId,
    style: {
      flex: '0 0 auto',
      marginTop: 1,
      width: 22,
      height: 22,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-sm)',
      border: `1.5px solid ${checked ? 'var(--color-primary)' : 'var(--border-strong)'}`,
      background: checked ? 'var(--color-primary)' : 'var(--white)',
      color: 'var(--white)',
      font: 'var(--weight-bold) 13px/1 var(--font-sans)',
      transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)'
    }
  }, checked ? '✓' : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-meta)',
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, children));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/GenderChoice.jsx
try { (() => {
/**
 * Gender selection — the two large "door" buttons from onboarding step 2
 * (spec §6.2.2 / §6.3.2). Presented NEUTRALLY: no loaded explanation here,
 * the meaning is deferred to step 3. On hover: soft grey fill. On select:
 * emphasized border + thickened background — "pressing a door", not
 * "ticking a form option". Fully symmetric — same treatment for both.
 */
function GenderChoice({
  value,
  onChange,
  options,
  style
}) {
  const opts = options || [{
    value: 'male',
    label: 'גבר'
  }, {
    value: 'female',
    label: 'אישה'
  }];
  const [hover, setHover] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-md)',
      ...style
    }
  }, opts.map(opt => {
    const selected = value === opt.value;
    const isHover = hover === opt.value;
    return /*#__PURE__*/React.createElement("button", {
      key: opt.value,
      type: "button",
      onClick: () => onChange && onChange(opt.value),
      onMouseEnter: () => setHover(opt.value),
      onMouseLeave: () => setHover(null),
      "aria-pressed": selected,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-sm)',
        minHeight: 108,
        padding: 'var(--space-xl)',
        font: 'var(--weight-semibold) var(--text-xl)/1 var(--font-display)',
        color: selected ? 'var(--color-primary)' : 'var(--text-primary)',
        background: selected ? 'var(--blue-050)' : isHover ? 'var(--ink-050)' : 'var(--white)',
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)'
      }
    }, opt.label);
  }));
}
Object.assign(__ds_scope, { GenderChoice });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/GenderChoice.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Safe-Place text field with floating label (spec §6.3.2).
 * On focus: thin accent-colored border + the label rises and shrinks.
 * On valid entry: a small check appears at the field's end (start side in RTL).
 * RTL-first.
 */
function TextField({
  label,
  value,
  onChange,
  type = 'text',
  valid = false,
  error,
  id,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const fieldId = id || reactId;
  const floated = focused || value != null && String(value).length > 0;
  const borderColor = error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      position: 'absolute',
      right: 14,
      top: floated ? 8 : '50%',
      transform: floated ? 'translateY(0)' : 'translateY(-50%)',
      font: floated ? 'var(--type-label)' : 'var(--type-body)',
      color: error ? 'var(--danger)' : focused ? 'var(--color-primary)' : 'var(--text-muted)',
      pointerEvents: 'none',
      transition: 'all var(--dur-fast) var(--ease-standard)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    type: type,
    value: value,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: '100%',
      minHeight: 56,
      padding: floated ? '24px 14px 8px' : '16px 14px',
      font: 'var(--type-body)',
      color: 'var(--text-primary)',
      background: 'var(--white)',
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-sm)',
      outline: 'none',
      boxShadow: focused ? 'var(--shadow-focus)' : 'none',
      transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)'
    }
  }, rest)), valid && !error && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 20,
      height: 20,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 'var(--radius-full)',
      background: 'var(--success)',
      color: 'var(--white)',
      font: 'var(--weight-bold) 12px/1 var(--font-sans)'
    }
  }, "\u2713")), error && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-meta)',
      color: 'var(--danger)'
    }
  }, error));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Toggle.jsx
try { (() => {
/**
 * Safe-Place toggle switch. Used for the content-filter defaults display
 * (onboarding step 3 — READ-ONLY, spec §6.2.3) and in Settings (interactive).
 * Set readOnly for the onboarding "presentation of what was configured".
 */
function Toggle({
  checked = false,
  onChange,
  readOnly = false,
  disabled = false,
  label,
  description,
  id,
  style
}) {
  const reactId = React.useId();
  const switchId = id || reactId;
  const active = checked;
  const knob = /*#__PURE__*/React.createElement("span", {
    role: readOnly ? undefined : 'switch',
    "aria-checked": active,
    "aria-readonly": readOnly || undefined,
    onClick: () => !readOnly && !disabled && onChange && onChange(!active),
    style: {
      position: 'relative',
      flex: '0 0 auto',
      width: 46,
      height: 28,
      borderRadius: 'var(--radius-full)',
      background: active ? 'var(--color-primary)' : 'var(--ink-300)',
      cursor: readOnly || disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'background var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      right: active ? 3 : 21,
      /* RTL: on = knob to the right */
      width: 22,
      height: 22,
      borderRadius: 'var(--radius-full)',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-sm)',
      transition: 'right var(--dur-base) var(--ease-standard)'
    }
  }));
  if (!label) return knob;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: switchId,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)',
      cursor: readOnly || disabled ? 'default' : 'pointer',
      ...style
    }
  }, knob, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-meta)',
      color: 'var(--text-secondary)'
    }
  }, description)));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/PostCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PostCard — the core feed unit. "Facebook-lite": a self-contained white
 * card with a subtle frame and breathing room around it (master §5.2.1,
 * feed-spec §4). Header (avatar + name + time + ⋯), colored source label,
 * body text, optional media, interaction row.
 *
 * `filtered` renders the modest placeholder state instead of the media —
 * the UI layer of the visibility system (CLAUDE.md invariant #2: UI is
 * defense-in-depth; real enforcement is server/DB-side).
 */
function PostCard({
  post = {},
  filtered = false,
  style
}) {
  const {
    author = {},
    time = '',
    source,
    body,
    media,
    likes = 0,
    comments = 0,
    liked = false,
    saved = false
  } = post;
  return /*#__PURE__*/React.createElement("article", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      maxWidth: 'var(--feed-column)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-md)',
      padding: 'var(--space-lg) var(--space-lg) var(--space-md)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    src: author.avatar,
    name: author.name,
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, author.name), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-meta)',
      color: 'var(--text-muted)'
    }
  }, "\xB7 ", time)), source && /*#__PURE__*/React.createElement(__ds_scope.SourceLabel, _extends({}, source, {
    style: {
      alignSelf: 'flex-start'
    }
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      padding: 4,
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more-horizontal",
    size: 20
  }))), body && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--space-lg) var(--space-md)',
      font: 'var(--type-body)',
      color: 'var(--text-primary)',
      lineHeight: 1.65
    }
  }, body), media && !filtered && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ink-050)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: media,
    alt: "",
    style: {
      display: 'block',
      width: '100%',
      maxHeight: 460,
      objectFit: 'cover'
    }
  })), media && filtered && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-sm)',
      padding: 'var(--space-3xl) var(--space-lg)',
      background: 'repeating-linear-gradient(135deg, var(--blue-050), var(--blue-050) 12px, var(--surface-sunken) 12px, var(--surface-sunken) 24px)',
      color: 'var(--text-secondary)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "eye",
    size: 26,
    color: "var(--blue-400)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, "\u05DE\u05D3\u05D9\u05D4 \u05DE\u05E1\u05D5\u05E0\u05E0\u05EA \u05DC\u05E4\u05D9 \u05D4\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05E9\u05DC\u05DA"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-meta)',
      maxWidth: 320
    }
  }, "\u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05EA \u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05D4\u05E6\u05E8\u05D9\u05DB\u05D4 \u05D1\u05D0\u05D6\u05D5\u05E8 \u05D4\u05D0\u05D9\u05E9\u05D9 \u05D1\u05DB\u05DC \u05E2\u05EA.")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-sm) var(--space-md)',
      borderTop: '1px solid var(--ink-100)',
      marginTop: media ? 0 : 'var(--space-xs)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.InteractionBar, {
    likes: likes,
    comments: comments,
    liked: liked,
    saved: saved
  })));
}
Object.assign(__ds_scope, { PostCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/PostCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Compose.jsx
try { (() => {
// Safe-Place mobile UI kit — post creation screen (post-creation-spec §3).
// Text-first writing area, exposure field, attachments bar. Demonstrates the
// neutral women-detected upload notice (master §4.4.2) via the media button.
const {
  Avatar,
  Icon,
  Button,
  SystemNotice
} = window.SafePlaceDesignSystem_58efd0;
const EXPOSURE = [{
  value: 'public',
  label: 'ציבורי',
  icon: 'users'
}, {
  value: 'followers',
  label: 'עוקבים בלבד',
  icon: 'user'
}, {
  value: 'group',
  label: 'קבוצה ספציפית',
  icon: 'home'
}, {
  value: 'family',
  label: 'מרחב משפחתי',
  icon: 'lock'
}];
function Compose({
  onClose
}) {
  const [text, setText] = React.useState('');
  const [exposure, setExposure] = React.useState('public');
  const [pickerOpen, setPicker] = React.useState(false);
  const [notice, setNotice] = React.useState(false);
  const [hasMedia, setHasMedia] = React.useState(false);
  const cur = EXPOSURE.find(e => e.value === exposure);
  const attach = {
    media: () => {
      setNotice(true);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "sp-iconbtn",
    onClick: onClose,
    style: {
      color: 'var(--ink-700)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, "\u05E4\u05D5\u05E1\u05D8 \u05D7\u05D3\u05E9"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    disabled: !text.trim()
  }, "\u05E4\u05E8\u05E1\u05DD")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      padding: '16px',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "\u05E9\u05E8\u05D4 \u05DC.",
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, "\u05E9\u05E8\u05D4 \u05DC."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPicker(!pickerOpen),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      background: 'var(--surface-sunken)',
      border: '1px solid var(--blue-200)',
      borderRadius: 999,
      color: 'var(--blue-700)',
      font: 'var(--type-label)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: cur.icon,
    size: 13
  }), " ", cur.label, " ", /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 13
  })))), pickerOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 16px 8px',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 14px',
      font: 'var(--type-label)',
      color: 'var(--text-muted)',
      background: 'var(--ink-050)'
    }
  }, "\u05DE\u05D9 \u05D9\u05E8\u05D0\u05D4 \u05D0\u05EA \u05D6\u05D4?"), EXPOSURE.map(e => /*#__PURE__*/React.createElement("button", {
    key: e.value,
    onClick: () => {
      setExposure(e.value);
      setPicker(false);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '11px 14px',
      background: e.value === exposure ? 'var(--blue-050)' : 'transparent',
      border: 'none',
      borderTop: '1px solid var(--ink-100)',
      cursor: 'pointer',
      font: 'var(--type-body)',
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: e.icon,
    size: 18,
    color: "var(--blue-600)"
  }), " ", e.label, e.value === exposure && /*#__PURE__*/React.createElement("span", {
    style: {
      marginInlineStart: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "var(--color-primary)"
  }))))), /*#__PURE__*/React.createElement("textarea", {
    value: text,
    onChange: e => setText(e.target.value),
    placeholder: "\u05DE\u05D4 \u05EA\u05E8\u05E6\u05D4 \u05DC\u05E9\u05EA\u05E3?",
    style: {
      flex: 1,
      margin: '0 16px',
      border: 'none',
      outline: 'none',
      resize: 'none',
      font: 'var(--type-body)',
      lineHeight: 1.7,
      color: 'var(--text-primary)',
      background: 'transparent'
    }
  }), hasMedia && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 16px 12px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80",
    alt: "",
    style: {
      width: '100%',
      height: 160,
      objectFit: 'cover',
      borderRadius: 'var(--radius-lg)'
    }
  })), notice && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '0 16px 12px'
    }
  }, /*#__PURE__*/React.createElement(SystemNotice, {
    tone: "info",
    title: "\u05D6\u05D5\u05D4\u05D5 \u05E0\u05E9\u05D9\u05DD \u05D1\u05DE\u05D3\u05D9\u05D4 \u05E9\u05D4\u05E2\u05DC\u05D9\u05EA",
    confirmLabel: "\u05D0\u05D9\u05E9\u05D5\u05E8",
    cancelLabel: "\u05D7\u05D6\u05E8\u05D4",
    onConfirm: () => {
      setNotice(false);
      setHasMedia(true);
    },
    onCancel: () => setNotice(false)
  }, "\u05E2\u05DC\u05D9\u05DA \u05DC\u05D3\u05E2\u05EA \u05E9\u05D1\u05E2\u05E7\u05D1\u05D5\u05EA \u05D6\u05D0\u05EA \u05DE\u05E9\u05EA\u05DE\u05E9\u05D9\u05DD \u05E8\u05D1\u05D9\u05DD \u05D1\u05E8\u05E9\u05EA \u05DC\u05D0 \u05D9\u05D5\u05DB\u05DC\u05D5 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05EA\u05D5\u05DB\u05DF \u05D4\u05DE\u05D3\u05D9\u05D4 \u05E9\u05DC\u05DA \u05D1\u05E4\u05D5\u05E1\u05D8 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      padding: '10px 12px',
      borderTop: '1px solid var(--ink-100)'
    }
  }, [['image', 'מדיה', () => setNotice(true)], ['poll', 'סקר'], ['map-pin', 'מיקום'], ['tag', 'תיוג']].map(([ic, lbl, fn]) => /*#__PURE__*/React.createElement("button", {
    key: ic,
    onClick: fn,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '9px 12px',
      background: 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-secondary)',
      font: 'var(--type-meta)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 20,
    color: "var(--blue-600)"
  }), " ", lbl))));
}
window.SPCompose = Compose;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Compose.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Feed.jsx
try { (() => {
// Safe-Place mobile UI kit — Main Feed screen.
// Composes design-system components (PostCard, Avatar, SourceLabel, Icon).
// RTL, mobile-first (master §5.2, feed-spec §2).
const {
  Avatar,
  SourceLabel,
  Icon,
  PostCard
} = window.SafePlaceDesignSystem_58efd0;
const STORIES = [{
  name: 'שרה ל.',
  color: 'var(--group-terra)'
}, {
  name: 'משפ׳ כהן',
  color: 'var(--group-sage)'
}, {
  name: 'רבקה',
  color: 'var(--group-plum)'
}, {
  name: 'מרים ט.',
  color: 'var(--group-indigo)'
}, {
  name: 'חנה',
  color: 'var(--group-brick)'
}];
const SPACES = [{
  name: 'שכונת רמות',
  color: 'var(--group-indigo)',
  icon: 'home',
  last: 'משפחת רוזנברג',
  time: 'לפני שעה',
  preview: 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=400&q=80'
}, {
  name: 'חסדי הקהילה',
  color: 'var(--group-sage)',
  icon: 'users',
  last: 'דוד מ.',
  time: 'לפני 3 שעות',
  text: 'תודה לכל מי שתרם השבוע 🙏'
}, {
  name: 'בית כנסת מרכזי',
  color: 'var(--group-clay)',
  icon: 'home',
  last: 'הגבאי',
  time: 'אתמול',
  text: 'זמני תפילה לשבת הקרובה'
}];
const POSTS = [{
  author: {
    name: 'משפחת רוזנברג'
  },
  time: 'לפני שעתיים',
  source: {
    kind: 'group',
    name: 'שכונת רמות',
    color: 'var(--group-indigo)',
    icon: 'home'
  },
  body: 'תודה ענקית לכל המתנדבים שהגיעו אתמול לחלוקת החבילות לקראת החג. הקהילה שלנו פשוט מדהימה 💙',
  media: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?w=800&q=80',
  likes: 42,
  comments: 8
}, {
  author: {
    name: 'הרב אליהו כ.'
  },
  time: 'לפני 4 שעות',
  source: {
    kind: 'public'
  },
  body: 'מחשבה קצרה לפרשת השבוע: לפעמים הדבר הגדול ביותר שאפשר לתת לזולת הוא פשוט להקשיב. שבת שלום לכולם.',
  likes: 128,
  comments: 23,
  liked: true
}, {
  author: {
    name: 'גמ״ח הסעות'
  },
  time: 'לפני 6 שעות',
  source: {
    kind: 'suggested'
  },
  body: 'נפתחה קבוצה חדשה לתיאום נסיעות בין הערים. הצטרפו כדי לחסוך ולעזור אחד לשני.',
  media: 'x',
  filtered: true,
  likes: 15,
  comments: 3
}];
const FOLLOW = [{
  name: 'שיעורי הרב לוי',
  followers: '2.4k'
}, {
  name: 'לוח קהילתי',
  followers: '890'
}, {
  name: 'חדשות השכונה',
  followers: '5.1k'
}];
function AppBar({
  compact
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'Rubik',
      fontWeight: 700,
      fontSize: 22,
      color: 'var(--blue-600)',
      letterSpacing: '-.01em'
    }
  }, "Safe", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--terracotta-500)'
    }
  }, "\xB7"), "Place"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      color: 'var(--ink-700)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "sp-iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 22
  })), /*#__PURE__*/React.createElement("button", {
    className: "sp-iconbtn",
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 6,
      insetInlineStart: 6,
      width: 8,
      height: 8,
      borderRadius: 999,
      background: 'var(--terracotta-500)',
      border: '1.5px solid #fff'
    }
  }))));
}
function StoriesRail({
  onCreate
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "sp-hscroll",
    style: {
      display: 'flex',
      gap: 14,
      padding: '14px 16px',
      borderBottom: '1px solid var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCreate,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      background: 'none',
      border: 'none',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 60,
      height: 60,
      borderRadius: 999,
      display: 'grid',
      placeItems: 'center',
      background: 'var(--blue-050)',
      border: '2px dashed var(--blue-300)',
      color: 'var(--blue-600)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 24
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-secondary)'
    }
  }, "\u05D9\u05E6\u05D9\u05E8\u05D4")), STORIES.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: s.name,
    size: 60,
    ring: true,
    ringColor: s.color
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-secondary)',
      maxWidth: 60,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, s.name))));
}
function SpacesRail() {
  return /*#__PURE__*/React.createElement("div", {
    className: "sp-hscroll",
    style: {
      display: 'flex',
      gap: 12,
      padding: '14px 16px',
      borderBottom: '1px solid var(--ink-100)'
    }
  }, SPACES.map((sp, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 150,
      flex: '0 0 auto',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-subtle)',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      background: sp.color
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: sp.icon,
    size: 16,
    color: "#fff"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: '#fff',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, sp.name)), sp.preview ? /*#__PURE__*/React.createElement("img", {
    src: sp.preview,
    alt: "",
    style: {
      width: '100%',
      height: 74,
      objectFit: 'cover',
      display: 'block'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      height: 74,
      padding: 10,
      font: 'var(--type-meta)',
      color: 'var(--text-secondary)',
      background: 'var(--ink-050)',
      overflow: 'hidden'
    }
  }, sp.text), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '7px 10px',
      font: 'var(--type-label)',
      color: 'var(--text-muted)'
    }
  }, sp.last, " \xB7 ", sp.time))));
}
function FollowRail() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px',
      background: 'var(--surface-sunken)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)',
      marginBottom: 10
    }
  }, "\u05D4\u05E6\u05E2\u05D5\u05EA \u05DC\u05DE\u05E2\u05E7\u05D1"), /*#__PURE__*/React.createElement("div", {
    className: "sp-hscroll",
    style: {
      display: 'flex',
      gap: 12
    }
  }, FOLLOW.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 130,
      flex: '0 0 auto',
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 14,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: f.name,
    size: 52
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '100%'
    }
  }, f.name), /*#__PURE__*/React.createElement("div", {
    className: "sp-numeric",
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-muted)'
    }
  }, f.followers, " \u05E2\u05D5\u05E7\u05D1\u05D9\u05DD"), /*#__PURE__*/React.createElement("button", {
    style: {
      width: '100%',
      padding: '7px',
      border: '1px solid var(--color-primary)',
      background: 'transparent',
      color: 'var(--color-primary)',
      borderRadius: 'var(--radius-md)',
      font: 'var(--type-label)',
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "\u05E2\u05E7\u05D5\u05D1")))));
}
function BottomTabs({
  onCreate
}) {
  const Tab = ({
    icon,
    active
  }) => /*#__PURE__*/React.createElement("button", {
    className: "sp-iconbtn",
    style: {
      color: active ? 'var(--color-primary)' : 'var(--ink-400)',
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 24,
    strokeWidth: active ? 2.4 : 2
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      borderTop: '1px solid var(--ink-100)',
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement(Tab, {
    icon: "home",
    active: true
  }), /*#__PURE__*/React.createElement(Tab, {
    icon: "search"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onCreate,
    className: "sp-iconbtn",
    style: {
      flex: 1,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 14,
      background: 'var(--color-primary)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 24
  }))), /*#__PURE__*/React.createElement(Tab, {
    icon: "bell"
  }), /*#__PURE__*/React.createElement(Tab, {
    icon: "user"
  }));
}
function Feed({
  onCreate
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--surface-muted)'
    }
  }, /*#__PURE__*/React.createElement(AppBar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement(StoriesRail, {
    onCreate: onCreate
  }), /*#__PURE__*/React.createElement(SpacesRail, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: 14
    }
  }, POSTS.map((p, i) => /*#__PURE__*/React.createElement(PostCard, {
    key: i,
    post: p,
    filtered: p.filtered,
    style: {
      maxWidth: '100%'
    }
  }))), /*#__PURE__*/React.createElement(FollowRail, null)), /*#__PURE__*/React.createElement(BottomTabs, {
    onCreate: onCreate
  }));
}
window.SPFeed = Feed;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Feed.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Onboarding.jsx
try { (() => {
// Safe-Place mobile UI kit — 3-step onboarding wizard (master §6.2).
// Step 1 welcome · Step 2 account + gender · Step 3 read-only defaults.
const {
  Button,
  TextField,
  GenderChoice,
  Checkbox,
  Toggle
} = window.SafePlaceDesignSystem_58efd0;
function ProgressBar({
  step
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      padding: '0 24px',
      marginBottom: 8
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      background: i <= step ? 'var(--color-primary)' : 'var(--ink-200)',
      transition: 'background var(--dur-base) var(--ease-standard)'
    }
  })));
}
function Wordmark({
  size = 40
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'Rubik',
      fontWeight: 700,
      fontSize: size,
      color: 'var(--blue-600)',
      letterSpacing: '-.01em'
    }
  }, "Safe", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--terracotta-500)'
    }
  }, "\xB7"), "Place");
}
function StepWelcome({
  onNext
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 32,
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sp-rise",
    style: {
      animationDelay: '0ms'
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 44
  })), /*#__PURE__*/React.createElement("div", {
    className: "sp-rise",
    style: {
      animationDelay: '90ms',
      fontSize: 18,
      color: 'var(--ink-500)',
      fontWeight: 500
    }
  }, "\u05DE\u05E7\u05D5\u05DD \u05E9\u05DE\u05D5\u05E8"), /*#__PURE__*/React.createElement("p", {
    className: "sp-rise",
    style: {
      animationDelay: '180ms',
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      maxWidth: 300,
      lineHeight: 1.7
    }
  }, "\u05DE\u05E8\u05D7\u05D1 \u05D7\u05D1\u05E8\u05EA\u05D9 \u05E9\u05DE\u05DB\u05D1\u05D3 \u05D0\u05EA \u05D0\u05D5\u05E8\u05D7 \u05D7\u05D9\u05D9\u05DA \u2014 \u05D0\u05EA\u05D4 \u05E9\u05D5\u05DC\u05D8 \u05D1\u05DE\u05D4 \u05E9\u05D0\u05EA\u05D4 \u05E8\u05D5\u05D0\u05D4, \u05D5\u05D1\u05DE\u05D4 \u05E9\u05D0\u05EA\u05D4 \u05D7\u05D5\u05DC\u05E7."), /*#__PURE__*/React.createElement("div", {
    className: "sp-rise",
    style: {
      animationDelay: '280ms',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      width: '100%',
      maxWidth: 300,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "cta",
    size: "lg",
    halo: true,
    block: true,
    onClick: onNext
  }, "\u05D9\u05E6\u05D9\u05E8\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    block: true
  }, "\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF \u05E7\u05D9\u05D9\u05DD")));
}
function StepAccount({
  onNext,
  data,
  setData
}) {
  const set = k => e => setData({
    ...data,
    [k]: e.target.value
  });
  const ready = data.name && data.contact && data.password && data.gender && data.agree;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: 24,
      gap: 18,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sp-rise",
    style: {
      font: 'var(--type-h2)',
      color: 'var(--text-primary)'
    }
  }, "\u05E4\u05E8\u05D8\u05D9 \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05DA"), /*#__PURE__*/React.createElement("div", {
    className: "sp-rise",
    style: {
      animationDelay: '80ms',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "\u05E9\u05DD \u05DE\u05DC\u05D0",
    value: data.name,
    onChange: set('name'),
    valid: data.name && data.name.length > 1
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D0\u05D5 \u05DE\u05E1\u05E4\u05E8 \u05D8\u05DC\u05E4\u05D5\u05DF",
    value: data.contact,
    onChange: set('contact')
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "\u05E1\u05D9\u05E1\u05DE\u05D4",
    type: "password",
    value: data.password,
    onChange: set('password')
  })), /*#__PURE__*/React.createElement("div", {
    className: "sp-rise",
    style: {
      animationDelay: '160ms'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-muted)',
      marginBottom: 8
    }
  }, "\u05D1\u05D7\u05D9\u05E8\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF"), /*#__PURE__*/React.createElement(GenderChoice, {
    value: data.gender,
    onChange: g => setData({
      ...data,
      gender: g
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "sp-rise",
    style: {
      animationDelay: '240ms'
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: !!data.agree,
    onChange: v => setData({
      ...data,
      agree: v
    })
  }, "\u05E7\u05E8\u05D0\u05EA\u05D9 \u05D5\u05D0\u05E0\u05D9 \u05DE\u05E1\u05DB\u05D9\u05DD \u05DC", /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u05EA\u05E0\u05D0\u05D9 \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9"), " \u05D5\u05DC", /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "cta",
    size: "lg",
    halo: ready,
    block: true,
    disabled: !ready,
    onClick: onNext
  }, "\u05D4\u05DE\u05E9\u05DA"));
}
function StepDefaults({
  onDone,
  data
}) {
  const male = data.gender === 'male';
  // Mirrors resolveDefaultFilterSettings from @safeplace/visibility-policy.
  const defaults = male ? [{
    label: 'אינך רואה תוכן הכולל נשים',
    on: true
  }, {
    label: 'אינך רואה חשבונות שהוגדרו כנשיים',
    on: true
  }, {
    label: 'הצגת פוסטים מוצעים בפיד',
    on: true
  }] : [{
    label: 'רואה את כל התוכן במרחב הציבורי',
    on: true
  }, {
    label: 'הצגת פוסטים מוצעים בפיד',
    on: true
  }, {
    label: 'סינון תוכן — כבוי כברירת מחדל',
    on: false
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: 24,
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "sp-rise",
    style: {
      font: 'var(--type-h2)',
      color: 'var(--text-primary)'
    }
  }, "\u05D1\u05E8\u05D9\u05E8\u05D5\u05EA \u05D4\u05DE\u05D7\u05D3\u05DC \u05E9\u05DC\u05DA"), /*#__PURE__*/React.createElement("p", {
    className: "sp-rise",
    style: {
      animationDelay: '80ms',
      font: 'var(--type-body)',
      color: 'var(--text-secondary)',
      lineHeight: 1.6
    }
  }, "\u05D4\u05D2\u05D3\u05E8\u05E0\u05D5 \u05E2\u05D1\u05D5\u05E8\u05DA \u05D0\u05EA \u05D4\u05D4\u05E2\u05D3\u05E4\u05D5\u05EA \u05D4\u05D1\u05D0\u05D5\u05EA. \u05EA\u05D5\u05DB\u05DC \u05DC\u05E9\u05E0\u05D5\u05EA\u05DF \u05D1\u05DB\u05DC \u05E2\u05EA \u05D1\u05D0\u05D6\u05D5\u05E8 \u05D4\u05D0\u05D9\u05E9\u05D9."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      marginTop: 6
    }
  }, defaults.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sp-rise",
    style: {
      animationDelay: `${160 + i * 110}ms`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      background: 'var(--white)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)'
    }
  }, /*#__PURE__*/React.createElement(Toggle, {
    readOnly: true,
    checked: d.on
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body-strong)',
      color: 'var(--text-primary)'
    }
  }, d.label)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-meta)',
      color: 'var(--text-muted)',
      textAlign: 'center'
    }
  }, "\u05D0\u05DC\u05D5 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E9\u05D4\u05D5\u05EA\u05D0\u05DE\u05D5 \u2014 \u05DC\u05D0 \u05DB\u05DC\u05DC. \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05E0\u05D5\u05EA \u05D1\u05DB\u05DC \u05E2\u05EA."), /*#__PURE__*/React.createElement(Button, {
    variant: "cta",
    size: "lg",
    halo: true,
    block: true,
    onClick: onDone
  }, "\u05D4\u05D1\u05E0\u05EA\u05D9, \u05D4\u05DE\u05E9\u05DA"));
}
function Onboarding({
  onFinish
}) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    name: '',
    contact: '',
    password: '',
    gender: '',
    agree: false
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--white)',
      paddingTop: 12
    }
  }, step > 0 && /*#__PURE__*/React.createElement(ProgressBar, {
    step: step
  }), /*#__PURE__*/React.createElement("div", {
    key: step,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, step === 0 && /*#__PURE__*/React.createElement(StepWelcome, {
    onNext: () => setStep(1)
  }), step === 1 && /*#__PURE__*/React.createElement(StepAccount, {
    data: data,
    setData: setData,
    onNext: () => setStep(2)
  }), step === 2 && /*#__PURE__*/React.createElement(StepDefaults, {
    data: data,
    onDone: onFinish
  })));
}
window.SPOnboarding = Onboarding;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Onboarding.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.InteractionBar = __ds_scope.InteractionBar;

__ds_ns.SourceLabel = __ds_scope.SourceLabel;

__ds_ns.SystemNotice = __ds_scope.SystemNotice;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.GenderChoice = __ds_scope.GenderChoice;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.PostCard = __ds_scope.PostCard;

})();
