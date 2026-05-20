const fs = require('fs');

const file = 'd:/Taze/Programming/mezmer-dev/src/hooks/useWebGL.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Update the animation loop assignments
const updateTarget = `const Re = it.layerSymmetryOffsetSpeed ?? 0;
                    ce.hasOwnProperty("layerSymmetryOffsetSpeed") && ce.layerSymmetryOffsetSpeed !== Re && (ce.layerSymmetryOffsetSpeed = Re), ce.hasOwnProperty("accumulatedSymmetryAngle") && (ce.accumulatedSymmetryAngle = Je.current[yt])`;

const updateReplacement = `const Re = it.layerSymmetryOffsetSpeed ?? 0;
                    ce.hasOwnProperty("layerSymmetryOffsetSpeed") && ce.layerSymmetryOffsetSpeed !== Re && (ce.layerSymmetryOffsetSpeed = Re), ce.hasOwnProperty("accumulatedSymmetryAngle") && (ce.accumulatedSymmetryAngle = Je.current[yt]);
                    const vf1 = it.fractalIterations ?? 3; ce.hasOwnProperty("fractalIterations") && ce.fractalIterations !== vf1 && (ce.fractalIterations = vf1);
                    const vf2 = it.fractalAngle ?? 0; ce.hasOwnProperty("fractalAngle") && ce.fractalAngle !== vf2 && (ce.fractalAngle = vf2);
                    const vf3 = it.fractalSpeed ?? 0.5; ce.hasOwnProperty("fractalSpeed") && ce.fractalSpeed !== vf3 && (ce.fractalSpeed = vf3);
                    const vf4 = it.fractalThickness ?? 0.05; ce.hasOwnProperty("fractalThickness") && ce.fractalThickness !== vf4 && (ce.fractalThickness = vf4);
                    const vl1 = it.lissajousFreqX ?? 3; ce.hasOwnProperty("lissajousFreqX") && ce.lissajousFreqX !== vl1 && (ce.lissajousFreqX = vl1);
                    const vl2 = it.lissajousFreqY ?? 4; ce.hasOwnProperty("lissajousFreqY") && ce.lissajousFreqY !== vl2 && (ce.lissajousFreqY = vl2);
                    const vl3 = it.lissajousSpeed ?? 0.5; ce.hasOwnProperty("lissajousSpeed") && ce.lissajousSpeed !== vl3 && (ce.lissajousSpeed = vl3);
                    const vl4 = it.lissajousThickness ?? 0.02; ce.hasOwnProperty("lissajousThickness") && ce.lissajousThickness !== vl4 && (ce.lissajousThickness = vl4);
                    const va1 = parseInt(it.bassTarget) || 0; ce.hasOwnProperty("bassTarget") && ce.bassTarget !== va1 && (ce.bassTarget = va1);
                    const va2 = parseInt(it.midTarget) || 0; ce.hasOwnProperty("midTarget") && ce.midTarget !== va2 && (ce.midTarget = va2);
                    const va3 = parseInt(it.highTarget) || 0; ce.hasOwnProperty("highTarget") && ce.highTarget !== va3 && (ce.highTarget = va3)`;

content = content.replace(updateTarget, updateReplacement);

// 2. Update the initial uniforms array for layers 1 to 4
for (let i = 1; i <= 4; i++) {
    // We search for a line ending with layerSymmetryOffsetSpeed definition for this layer.
    // E.g. layerSymmetryOffsetSpeed: ((T = u.current.layer1) == null ? void 0 : T.layerSymmetryOffsetSpeed) ?? 0,
    const regex = new RegExp("layerSymmetryOffsetSpeed:\\s*\\(\\([a-zA-Z0-9_]+\\s*=\\s*u\\.current\\.layer" + i + "\\)\\s*==\\s*null\\s*\\?\\s*void 0\\s*:\\s*[a-zA-Z0-9_]+\\.layerSymmetryOffsetSpeed\\)\\s*\\?\\?\\s*0");
    
    // Find the match to extract the variable name used for this layer (e.g. 'T')
    const match = content.match(regex);
    if (match) {
        const varMatch = match[0].match(/([a-zA-Z0-9_]+)\s*=\s*u\.current/);
        const vName = varMatch[1];
        
        const injectFields = "layerSymmetryOffsetSpeed: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".layerSymmetryOffsetSpeed) ?? 0," + 
                             "fractalIterations: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".fractalIterations) ?? 3," + 
                             "fractalAngle: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".fractalAngle) ?? 0," + 
                             "fractalSpeed: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".fractalSpeed) ?? 0.5," + 
                             "fractalThickness: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".fractalThickness) ?? 0.05," + 
                             "lissajousFreqX: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".lissajousFreqX) ?? 3," + 
                             "lissajousFreqY: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".lissajousFreqY) ?? 4," + 
                             "lissajousSpeed: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".lissajousSpeed) ?? 0.5," + 
                             "lissajousThickness: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : " + vName + ".lissajousThickness) ?? 0.02," + 
                             "bassTarget: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : parseInt(" + vName + ".bassTarget)) || 0," + 
                             "midTarget: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : parseInt(" + vName + ".midTarget)) || 0," + 
                             "highTarget: ((" + vName + " = u.current.layer" + i + ") == null ? void 0 : parseInt(" + vName + ".highTarget)) || 0";
        
        content = content.replace(match[0], injectFields);
    } else {
        console.error("Failed to match layer " + i);
    }
}

fs.writeFileSync(file, content, 'utf8');
console.log("Patched successfully");
