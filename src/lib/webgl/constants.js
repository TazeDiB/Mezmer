import * as THREE from 'three';

import mainVert from '../../shaders/main.vert?raw';
import mainFrag from '../../shaders/main.frag?raw';
import blendFrag from '../../shaders/blend.frag?raw';

export const MAIN_VERTEX_SHADER = mainVert;
export const MAIN_FRAGMENT_SHADER = mainFrag;
export const BLEND_VERTEX_SHADER = mainVert;
export const BLEND_FRAGMENT_SHADER = blendFrag;

export const HEIGHT_BLIT_FRAGMENT = `
precision highp float;
uniform sampler2D u_src;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(u_src, vUv).rgb;
  float h = dot(c, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(h, h, h, 1.0);
}
`;

export const COLOR_BLIT_FRAGMENT = `
precision highp float;
uniform sampler2D u_src;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(u_src, vUv).rgb, 1.0);
}
`;

export const BLIT_VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const VISUAL_MODE_INDEX = {
    normal: 0,
    glow: 1,
    pixelate: 2,
    moire: 3,
    cartoon: 4,
    hashGrid: 5,
    ascii: 6,
    crt: 7,
    thermal: 8,
    glitch: 9,
    vhs: 10,
    hologram: 11,
};

export const COLOR_MODE_INDEX = {
    rainbow: 0,
    fire: 1,
    ice: 2,
    monochrome: 3,
    audioRGB: 4,
    spectrum: 5,
    reactivePulse: 6,
    velocity: 7,
    cyberpunk: 8,
    vaporwave: 9,
    matrix: 10,
};

export function hueModulo(t, period) {
    return Number((t - Math.floor(t / period) * period).toPrecision(8));
}

export function lerpChannel(a, b, t) {
    return a * (1 - t) + b * t;
}

export function createRainbowGradientTexture() {
    const data = new Uint8Array(1024);
    for (let i = 0; i < 256; i++) {
        const hue = (i / 255) * 360;
        const s = 1;
        const chroma = s * (1 - Math.abs(hueModulo(hue / 60, 2) - 1));
        const m = 0.5 - s / 2;
        let r = 0;
        let g = 0;
        let b = 0;
        if (hue >= 0 && hue < 60) {
            r = s;
            g = chroma;
        } else if (hue >= 60 && hue < 120) {
            r = chroma;
            g = s;
        } else if (hue >= 120 && hue < 180) {
            g = s;
            b = chroma;
        } else if (hue >= 180 && hue < 240) {
            g = chroma;
            b = s;
        } else if (hue >= 240 && hue < 300) {
            r = chroma;
            b = s;
        } else {
            r = s;
            b = chroma;
        }
        data[i * 4 + 0] = Math.round((r + m) * 255);
        data[i * 4 + 1] = Math.round((g + m) * 255);
        data[i * 4 + 2] = Math.round((b + m) * 255);
        data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
}

export function createFireGradientTexture() {
    const data = new Uint8Array(1024);
    const stops = [
        { t: 0, color: [0, 0, 0] },
        { t: 0.2, color: [100, 0, 0] },
        { t: 0.5, color: [255, 100, 0] },
        { t: 0.8, color: [255, 255, 50] },
        { t: 1, color: [255, 255, 255] },
    ];
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let s = 0; s < stops.length - 1; s++) {
            if (t >= stops[s].t && t <= stops[s + 1].t) {
                const blend = (t - stops[s].t) / (stops[s + 1].t - stops[s].t);
                r = lerpChannel(stops[s].color[0], stops[s + 1].color[0], blend);
                g = lerpChannel(stops[s].color[1], stops[s + 1].color[1], blend);
                b = lerpChannel(stops[s].color[2], stops[s + 1].color[2], blend);
                break;
            }
        }
        data[i * 4 + 0] = Math.round(r);
        data[i * 4 + 1] = Math.round(g);
        data[i * 4 + 2] = Math.round(b);
        data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
}

export function createIceGradientTexture() {
    const data = new Uint8Array(1024);
    const stops = [
        { t: 0, color: [0, 0, 50] },
        { t: 0.3, color: [0, 50, 150] },
        { t: 0.6, color: [100, 150, 255] },
        { t: 0.8, color: [200, 220, 255] },
        { t: 1, color: [255, 255, 255] },
    ];
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let s = 0; s < stops.length - 1; s++) {
            if (t >= stops[s].t && t <= stops[s + 1].t) {
                const blend = (t - stops[s].t) / (stops[s + 1].t - stops[s].t);
                r = lerpChannel(stops[s].color[0], stops[s + 1].color[0], blend);
                g = lerpChannel(stops[s].color[1], stops[s + 1].color[1], blend);
                b = lerpChannel(stops[s].color[2], stops[s + 1].color[2], blend);
                break;
            }
        }
        data[i * 4 + 0] = Math.round(r);
        data[i * 4 + 1] = Math.round(g);
        data[i * 4 + 2] = Math.round(b);
        data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
}
