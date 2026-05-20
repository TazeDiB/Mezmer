const fs = require('fs');

// Patch App.jsx
let appPath = 'd:/Taze/Programming/mezmer-dev/src/App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');

appContent = appContent.replace(
  'AUDIO_COLOR_MODES_LIST as j0,',
  'AUDIO_COLOR_MODES_LIST as j0,\n  RANDOMIZER_THEMES,'
);

appContent = appContent.replace(
  'const [$, M] = React.useState(1)', // wait, finding where to inject state
  ''
);
// Find React.useEffect(() => { $.current = M...
// Or just find `const [I, j] = React.useState(null);`
appContent = appContent.replace(
  'const [I, j] = React.useState(null);',
  'const [I, j] = React.useState(null), [activeTheme, setActiveTheme] = React.useState("chaotic");'
);

// Inject into Controls props
appContent = appContent.replace(
  'onRandomize: k,',
  'onRandomize: k, activeTheme: activeTheme, setActiveTheme: setActiveTheme,'
);

// Update k callback dependencies to include activeTheme
appContent = appContent.replace(
  '[s, vs, cd, Dc, Bi, hi, y, p, A, f, fe, Ue]);',
  '[s, vs, cd, Dc, Bi, hi, y, p, A, f, fe, Ue, activeTheme]);'
);

// Replace vs referencing inside k
// "vs.filter"
appContent = appContent.replace(/vs\.filter/g, '(RANDOMIZER_THEMES[activeTheme]?.patterns || vs).filter');

// Replace Bi referencing inside k
// "Bi[Math.floor"
appContent = appContent.replace(/Bi\[Math\.floor/g, '(RANDOMIZER_THEMES[activeTheme]?.colors || Bi)[Math.floor');
appContent = appContent.replace(/\* Bi\.length/g, '* (RANDOMIZER_THEMES[activeTheme]?.colors || Bi).length');

// Replace Dc (visualModes) referencing inside k
appContent = appContent.replace(/Dc\[Math\.floor/g, '(RANDOMIZER_THEMES[activeTheme]?.visualModes || Dc)[Math.floor');
appContent = appContent.replace(/\* Dc\.length/g, '* (RANDOMIZER_THEMES[activeTheme]?.visualModes || Dc).length');

fs.writeFileSync(appPath, appContent, 'utf8');

// Patch Controls.jsx
let controlsPath = 'd:/Taze/Programming/mezmer-dev/src/components/Controls.jsx';
let controlsContent = fs.readFileSync(controlsPath, 'utf8');

controlsContent = controlsContent.replace(
  'onRandomize: A,',
  'onRandomize: A, activeTheme, setActiveTheme,'
);

// Insert Theme dropdown right before Randomize All button
const targetHtml = \`                        className: Qe.controlGroup,
                        title: cn.randomizeAll,
                        children: ne.jsx("button", {\`;

const newHtml = \`                        className: Qe.controlGroup,
                        title: "Select Randomizer Theme",
                        children: [
                            ne.jsx("label", { children: "Theme: ", style: { marginRight: '10px' } }),
                            ne.jsx("select", {
                                value: activeTheme || 'chaotic',
                                onChange: (e) => setActiveTheme(e.target.value),
                                disabled: r,
                                style: { padding: '5px', borderRadius: '4px', background: '#333', color: '#fff', border: '1px solid #555' },
                                children: ['chaotic', 'geometric', 'organic'].map(t => ne.jsx("option", { value: t, children: t.charAt(0).toUpperCase() + t.slice(1) }, t))
                            })
                        ]
                    }), ne.jsx("div", {
                        className: Qe.controlGroup,
                        title: cn.randomizeAll,
                        children: ne.jsx("button", {\`;

controlsContent = controlsContent.replace(targetHtml, newHtml);

fs.writeFileSync(controlsPath, controlsContent, 'utf8');
console.log("Patched successfully.");
