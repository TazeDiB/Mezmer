const fs = require('fs');
const file = 'src/hooks/useWebGL.js';
let content = fs.readFileSync(file, 'utf8');

const fractalBlock = `
                                fractalIterations: ((it = u.current.__LAYER__) == null ? void 0 : it.fractalIterations) ?? 4,
                                fractalAngle: ((it = u.current.__LAYER__) == null ? void 0 : it.fractalAngle) ?? .5,
                                fractalSpeed: ((it = u.current.__LAYER__) == null ? void 0 : it.fractalSpeed) ?? .3,
                                fractalThickness: ((it = u.current.__LAYER__) == null ? void 0 : it.fractalThickness) ?? .02,
                                lissajousFreqX: ((it = u.current.__LAYER__) == null ? void 0 : it.lissajousFreqX) ?? 3,
                                lissajousFreqY: ((it = u.current.__LAYER__) == null ? void 0 : it.lissajousFreqY) ?? 4,
                                lissajousSpeed: ((it = u.current.__LAYER__) == null ? void 0 : it.lissajousSpeed) ?? .2,
                                lissajousThickness: ((it = u.current.__LAYER__) == null ? void 0 : it.lissajousThickness) ?? .03,`;

for (const layer of ['layer1', 'layer2', 'layer3', 'layer4']) {
  const block = fractalBlock.replaceAll('__LAYER__', layer);
  const needle = `layerSymmetryOffsetSpeed: ((`;
  // Find layer-specific accumulatedSymmetryAngle before next layer block
  const re = new RegExp(
    `(layerSymmetryOffsetSpeed: \\(\\([^)]*u\\.current\\.${layer}[^\\n]*\\n\\s*)accumulatedSymmetryAngle: 0`,
    'm'
  );
  if (!re.test(content)) {
    console.warn('Could not find init block for', layer);
    continue;
  }
  content = content.replace(re, `$1${block.trim()}\n                                accumulatedSymmetryAngle: 0`);
}

const animateUpload = `                    const rs = it.rdSpotSize ?? .5;
                    ce.hasOwnProperty("rdSpotSize") && ce.rdSpotSize !== rs && (ce.rdSpotSize = rs);
                    const fi = it.fractalIterations ?? 4;
                    ce.hasOwnProperty("fractalIterations") && ce.fractalIterations !== fi && (ce.fractalIterations = fi);
                    const fa = it.fractalAngle ?? .5;
                    ce.hasOwnProperty("fractalAngle") && ce.fractalAngle !== fa && (ce.fractalAngle = fa);
                    const fsp = it.fractalSpeed ?? .3;
                    ce.hasOwnProperty("fractalSpeed") && ce.fractalSpeed !== fsp && (ce.fractalSpeed = fsp);
                    const ft = it.fractalThickness ?? .02;
                    ce.hasOwnProperty("fractalThickness") && ce.fractalThickness !== ft && (ce.fractalThickness = ft);
                    const lfx = it.lissajousFreqX ?? 3;
                    ce.hasOwnProperty("lissajousFreqX") && ce.lissajousFreqX !== lfx && (ce.lissajousFreqX = lfx);
                    const lfy = it.lissajousFreqY ?? 4;
                    ce.hasOwnProperty("lissajousFreqY") && ce.lissajousFreqY !== lfy && (ce.lissajousFreqY = lfy);
                    const lsp = it.lissajousSpeed ?? .2;
                    ce.hasOwnProperty("lissajousSpeed") && ce.lissajousSpeed !== lsp && (ce.lissajousSpeed = lsp);
                    const lt = it.lissajousThickness ?? .03;
                    ce.hasOwnProperty("lissajousThickness") && ce.lissajousThickness !== lt && (ce.lissajousThickness = lt);`;

if (!content.includes('fractalIterations')) {
  content = content.replace(
    `                    const rs = it.rdSpotSize ?? .5;
                    ce.hasOwnProperty("rdSpotSize") && ce.rdSpotSize !== rs && (ce.rdSpotSize = rs);
                    const Re = it.layerSymmetryOffsetSpeed ?? 0;`,
    animateUpload + `
                    const Re = it.layerSymmetryOffsetSpeed ?? 0;`
  );
}

fs.writeFileSync(file, content);
console.log('Wired fractal/lissajous uniforms');
