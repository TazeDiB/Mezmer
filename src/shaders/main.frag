precision mediump float; 

varying highp vec2 vUv; 

uniform float u_time;
uniform highp vec2 u_resolution; 
uniform highp sampler2D u_audio_texture; 
uniform int u_frequency_bin_count; 
uniform highp sampler2D u_feedback_texture; 
uniform float u_feedback_mix;
uniform highp sampler2D u_gradient_texture; 
uniform highp sampler2D u_fire_gradient_texture; 
uniform highp sampler2D u_ice_gradient_texture; 

uniform float u_globalTimeScale;          
uniform float u_globalDistortionScale;    
uniform float u_globalSymmetryOffsetSpeed; 
uniform float u_uvScale;                
uniform float u_globalAudioSensitivity;   
uniform float u_rainbowAnimationSpeed;     
uniform float u_rainbowPhase;          

uniform float u_integratedTime;

uniform int u_visualMode;
uniform float u_pixelationFactor;
uniform float u_asciiCharSize; 

uniform int u_visualModeFromIndex;
uniform int u_visualModeToIndex;
uniform float u_visualModeBlend; 

uniform bool u_forceGlobalColor;
uniform int u_globalColorMode; 

uniform float u_bpm;

uniform float u_isBassPresent;  
uniform float u_isDrumsPresent; 

uniform float u_beatStrength;     
uniform float u_spectralCentroid; 
uniform vec2 u_mouse;
uniform vec3 u_mouseDir;
uniform float u_mouseMapping3D;
uniform float u_mouseSphereActive;
uniform float u_galleryFaceIndex;
uniform float u_galleryFaceSeed;
uniform float u_galleryEdgeBlend;
uniform vec4 u_galleryNeighborIntegratedTime;
uniform vec4 u_galleryNeighborDistortion;
uniform float u_mouseGalleryFace;
uniform float u_mouseBrushActive;
uniform float u_mouseBrushRadius;
uniform float u_mouseRadius;
uniform float u_mouseDistortion;
uniform float u_mouseSymmetry;
uniform float u_mouseAttract;
uniform float u_mouseTwist;

struct LayerParams {
    bool enabled;
    int patternType;
    float symmetry;
    float radius;
    float thickness;
    float power;
    float zoom;
    float centerX;
    float centerY;
    float distortionStrength;
    float distortionFrequency;
    float distortionSpeed;
    float moireFrequency;
    float moireAmplitude;
    float rotationSpeed;
    vec3 color1;
    vec3 color2;
    vec3 color3;
    float colorScale;
    float colorShift;
    float colorFrequency;
    float colorSpeed;
    float colorPower;
    int colorMode;
    float noiseStrength;
    float noiseScale;
    float noiseSpeed;
    float flowSpeed;
    float flowComplexity;
    float flowCurl;
    float layerSymmetryOffsetSpeed;
    int blendTargetType;
    float blendAmount;
    int blendTargetColorMode;
    float audioSensitivity;
    float bassSensitivity;
    float midSensitivity;
    float highSensitivity;
    float freq;
    float weaveThickness;
    float turingScale;
    float turingSpeed;
    float turingFeed;
    float turingKill;
    float turingDiffusionA;
    float turingDiffusionB;
    float voronoiScale;
    float voronoiEdgeWidth;
    float spiralArms;
    float spiralTightness;
    float spiralNoiseScale;
    float spiralNoiseSpeed;
    float rdComplexity;
    float rdSpotSize;
    float cubeRotationSpeed;
    float cubeSize;
    float fractalIterations;
    float fractalAngle;
    float fractalSpeed;
    float fractalThickness;
    float lissajousFreqX;
    float lissajousFreqY;
    float lissajousSpeed;
    float lissajousThickness;
    float accumulatedSymmetryAngle;
};

uniform LayerParams u_layers[4]; 

const float PI = 3.14159265359;
const float TAU = PI * 2.0;

const int PATTERN_INVISIBLE = 0;
const int PATTERN_WOVENGRID = 1; 
const int PATTERN_HYPERTURING = 2; 
const int PATTERN_HYPERVORONOI = 3;
const int PATTERN_SPIRALARMS = 4;
const int PATTERN_REACTIONDIFF = 5;
const int PATTERN_HYPERFLOW = 6;

const int PATTERN_CUBEGRID = 7;
const int PATTERN_KALEIDOWAVE = 8;
const int PATTERN_CRYSTAL = 9;
const int PATTERN_PLASMA = 10;
const int PATTERN_AURORA = 11;
const int PATTERN_INKDROP = 12;
const int PATTERN_STAINEDGLASS = 13;
const int PATTERN_MORPH = 14;
const int PATTERN_PRISM = 15;
const int PATTERN_FRACTAL = 16;
const int PATTERN_LISSAJOUS = 17;

const int MODE_NORMAL = 0;
const int MODE_GLOW = 1;
const int MODE_PIXELATE = 2;
const int MODE_MOIRE = 3;
const int MODE_CARTOON = 4;
const int MODE_HASHGRID = 5;
const int MODE_ASCII = 6;
const int MODE_CRT = 7;
const int MODE_THERMAL = 8;
const int MODE_GLITCH = 9;
const int MODE_VHS = 10;
const int MODE_HOLOGRAM = 11;

const int COLOR_MODE_RAINBOW = 0;
const int COLOR_MODE_FIRE = 1;
const int COLOR_MODE_ICE = 2;
const int COLOR_MODE_MONOCHROME = 3;

const int COLOR_MODE_AUDIO_RGB = 4;

const int COLOR_MODE_SPECTRUM = 5;
const int COLOR_MODE_REACTIVE_PULSE = 6;
const int COLOR_MODE_VELOCITY = 7;
const int COLOR_MODE_CYBERPUNK = 8;
const int COLOR_MODE_VAPORWAVE = 9;
const int COLOR_MODE_MATRIX = 10;

const float MAX_ANGULAR_VELOCITY = 15.0; 

const float BASS_END = 0.1;  
const float MID_END = 0.4;   

highp vec2 complex_mult(highp vec2 a, highp vec2 b) { 
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

highp vec2 complex_pow(highp vec2 base, float exp_float) { 
    
    
    int exp = int(max(1.0, floor(exp_float + 0.001)));

    highp vec2 result = vec2(1.0, 0.0);
    highp vec2 current_power = base;

    while (exp > 0) {
        if (int(mod(float(exp), 2.0)) == 1) { 
            result = complex_mult(result, current_power);
        }
        current_power = complex_mult(current_power, current_power); 
        exp /= 2; 
    }
    return result;
}

mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

float hash11(highp vec2 p) { 
    
    float sin_res = sin(dot(p, vec2(12.9898, 78.233)));
    return fract(sin_res * 43758.5453);
}

float noise(highp vec2 p) { 
    highp vec2 i = floor(p);
    highp vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); 

    float a = hash11(i + vec2(0.0, 0.0));
    float b = hash11(i + vec2(1.0, 0.0));
    float c = hash11(i + vec2(0.0, 1.0));
    float d = hash11(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(highp vec2 p) { 
    float v = 0.0;
    float a = 0.5;
    mat2 rot = rotate(0.5); 
    for (int i = 0; i < 5; ++i) { 
        v += a * noise(p);
        p = rot * p * 2.0; 
        a *= 0.5; 
    }
    return v;
}

highp vec2 hash22(highp vec2 p) { 
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

highp vec2 voronoi(highp vec2 x, float integratedTimeOffset, float bass, float high) { 
    
    
    float bassPulse = pow(bass, 2.0) * 2.5; 
    float timeOffsetMagnitude = 0.3 + bassPulse * 0.2;
    highp vec2 timeDependentOffset = vec2(cos(integratedTimeOffset * 0.8), sin(integratedTimeOffset * 0.6)) * timeOffsetMagnitude;
    x += timeDependentOffset;

    
    const float EPSILON = 1e-5;
    x += EPSILON;

    highp vec2 n = floor(x); 
    highp vec2 f = fract(x); 

    float md = 8.0; 
    float md2 = 8.0; 

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j)); 
            
            highp vec2 o = hash22(n + g); 

            
            
            
            float internalTime = integratedTimeOffset * (1.2 + high * 8.0); 

            
            
            
            
            
            float animMag = 0.03 + bass * 0.18; 
            highp vec2 animOffset = vec2(sin(o.x * TAU + internalTime), cos(o.y * TAU - internalTime * 0.7)) * animMag;

            highp vec2 r = g + o + animOffset - f; 
            float d = dot(r, r); 

            if (d < md) {
                md2 = md; 
                md = d;   
            } else if (d < md2) {
                md2 = d; 
            }
        }
    }
    return vec2(sqrt(md), sqrt(md2)); 
}

float sampleAudio(float coord) {
    float clampedCoord = clamp(coord, 0.0, 1.0);
    
    return texture(u_audio_texture, vec2(clampedCoord, 0.5)).r / 255.0;
}

float getAudioBandLevel(float startFreqNorm, float endFreqNorm) {
    float level = 0.0;
    int startBin = int(float(u_frequency_bin_count) * startFreqNorm);
    int endBin = int(float(u_frequency_bin_count) * endFreqNorm);
    int numSamples = max(1, endBin - startBin); 

    
    
    for (int i = startBin; i < endBin; ++i) {
        
        if (i >= u_frequency_bin_count) break;
        level += sampleAudio(float(i) / float(u_frequency_bin_count));
    }
    return level / float(numSamples);
}

mat3 rotateX(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        1.0, 0.0, 0.0,
        0.0, c,  -s,
        0.0, s,   c
    );
}

mat3 rotateY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(
        c,   0.0, s,
        0.0, 1.0, 0.0,
        -s,  0.0, c
    );
}

float hash31(vec3 p) {
    
    
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
}

float sdBox(highp vec3 p, vec3 b) { 
    highp vec3 q = abs(p) - b;
    return length(max(q, vec3(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdBoxRotated(highp vec3 p, vec3 b, mat3 rotMat) { 
    mat3 rotMatInv = transpose(rotMat); 
    highp vec3 p_local = rotMatInv * p;    
    return sdBox(p_local, b);        
}

const int MAX_STEPS = 64;        
const float MAX_DIST = 10.0;
const float HIT_THRESHOLD = 0.001;

highp vec2 complexDistortion(highp vec2 p_sym, highp vec2 p_orig, float distortionAmount, float integratedTime, float bass, float mid, float high) { 
    
    float audioDistortionBoost = pow(bass, 1.5) * 1.5; 
    float midComplexityBoost = mid * 3.0; 

    float scaledDistortion = (distortionAmount + audioDistortionBoost) * 0.5;
    float radius = length(p_orig);

    
    float swirlSpeedFactor = 1.0 + high * 2.0;
    float swirlAngle = scaledDistortion * radius * 5.0 * swirlSpeedFactor;
    mat2 swirlMatrix = rotate(swirlAngle);
    highp vec2 swirledP = swirlMatrix * p_sym;

    
    float waveOffsetScale = 0.15 * scaledDistortion * (1.0 + bass * 3.0); 
    float waveFreq = 6.0 + midComplexityBoost * 5.0; 

    highp vec2 waveOffset = vec2(
        sin(swirledP.y * waveFreq + integratedTime * (0.8 + mid * 0.5)), 
        cos(swirledP.x * waveFreq - integratedTime * (0.5 + high * 0.3)) 
    ) * waveOffsetScale;
    return swirledP + waveOffset;
}

const float GALLERY_HW = 9.0;
const float GALLERY_HH = 5.0;
const float GALLERY_HD = 9.0;

vec4 galleryAtlasToFace(vec2 atlasUV) {
    float col = clamp(floor(atlasUV.x * 3.0), 0.0, 2.0);
    float row = clamp(floor(atlasUV.y * 2.0), 0.0, 1.0);
    float face = row * 3.0 + col;
    vec2 faceUV = vec2(fract(atlasUV.x * 3.0), fract(atlasUV.y * 2.0));
    return vec4(faceUV, face, 0.0);
}

vec3 galleryFaceUVToWorld(float face, vec2 fuv) {
    if (face < 0.5) {
        return vec3(-GALLERY_HW, fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, fuv.x * 2.0 * GALLERY_HD - GALLERY_HD);
    }
    if (face < 1.5) {
        return vec3(fuv.x * 2.0 * GALLERY_HW - GALLERY_HW, fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, GALLERY_HD);
    }
    if (face < 2.5) {
        return vec3(GALLERY_HW, fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, -(fuv.x * 2.0 * GALLERY_HD - GALLERY_HD));
    }
    if (face < 3.5) {
        return vec3(-(fuv.x * 2.0 * GALLERY_HW - GALLERY_HW), fuv.y * 2.0 * GALLERY_HH - GALLERY_HH, -GALLERY_HD);
    }
    if (face < 4.5) {
        return vec3(fuv.x * 2.0 * GALLERY_HW - GALLERY_HW, GALLERY_HH, fuv.y * 2.0 * GALLERY_HD - GALLERY_HD);
    }
    return vec3(fuv.x * 2.0 * GALLERY_HW - GALLERY_HW, -GALLERY_HH, -(fuv.y * 2.0 * GALLERY_HD - GALLERY_HD));
}

highp vec2 galleryWorldToPatternUV(vec3 p, float face) {
    highp vec2 raw = vec2(0.0);
    if (face < 0.5) {
        raw = vec2(p.z / (2.0 * GALLERY_HD), p.y / (2.0 * GALLERY_HH));
    } else if (face < 1.5) {
        raw = vec2(p.x / (2.0 * GALLERY_HW), p.y / (2.0 * GALLERY_HH));
    } else if (face < 2.5) {
        raw = vec2(-p.z / (2.0 * GALLERY_HD), p.y / (2.0 * GALLERY_HH));
    } else if (face < 3.5) {
        raw = vec2(-p.x / (2.0 * GALLERY_HW), p.y / (2.0 * GALLERY_HH));
    } else if (face < 4.5) {
        raw = vec2(p.x / (2.0 * GALLERY_HW), p.z / (2.0 * GALLERY_HD));
    } else {
        raw = vec2(p.x / (2.0 * GALLERY_HW), -p.z / (2.0 * GALLERY_HD));
    }
    return raw;
}

float mouseInfluenceWeightGallery(highp vec2 p, highp vec2 mousePos, float radius) {
    if (radius < 0.001) return 0.0;
    highp vec2 aspect = u_resolution / min(u_resolution.x, u_resolution.y);
    highp vec2 d = (p - mousePos) * aspect;
    float dist = length(d);
    float inner = radius * 0.12;
    float w = 1.0 - smoothstep(inner, radius, dist);
    return w * w * (3.0 - 2.0 * w);
}

float mouseInfluenceWeight(highp vec2 p, highp vec2 mousePos, float radius) {
    if (radius < 0.001) return 0.0;
    float dist = length(p - mousePos);
    float inner = radius * 0.12;
    float w = 1.0 - smoothstep(inner, radius, dist);
    return w * w * (3.0 - 2.0 * w);
}

vec3 equirectUvToDir(vec2 uv) {
    float lon = (uv.x - 0.5) * TAU;
    float lat = (uv.y - 0.5) * PI;
    float cosLat = cos(lat);
    return vec3(cosLat * cos(lon), sin(lat), cosLat * sin(lon));
}

float mouseInfluenceWeightSphere(vec2 texUV, vec3 mouseDir, float radius) {
    if (radius < 0.001) return 0.0;
    vec3 pDir = equirectUvToDir(texUV);
    vec3 mDir = normalize(mouseDir);
    float angle = acos(clamp(dot(pDir, mDir), -1.0, 1.0));
    float angularRadius = radius * PI * 0.55;
    float inner = angularRadius * 0.12;
    float w = 1.0 - smoothstep(inner, angularRadius, angle);
    return w * w * (3.0 - 2.0 * w);
}

highp vec2 applyMouseTwistAttractEquirect(highp vec2 p, highp vec2 mousePos, float w, float attract, float twist, float time) {
    if (w < 0.001) return p;
    highp vec2 delta = p - mousePos;
    delta.x -= floor(delta.x + 0.5);
    highp vec2 result = p;

    if (abs(attract) > 0.001) {
        result -= delta * attract * w * 0.65;
    }

    if (abs(twist) > 0.001) {
        float angle = twist * w * 4.0 + sin(time * 1.2 + length(delta) * 6.0) * twist * w * 0.35;
        mat2 rot = rotate(angle);
        highp vec2 local = result - mousePos;
        local.x -= floor(local.x + 0.5);
        result = mousePos + rot * local;
    }

    return result;
}

highp vec2 applyMouseTwistAttract(highp vec2 p, highp vec2 mousePos, float w, float attract, float twist, float time) {
    if (w < 0.001) return p;
    highp vec2 delta = p - mousePos;
    highp vec2 result = p;

    if (abs(attract) > 0.001) {
        result -= delta * attract * w * 0.65;
    }

    if (abs(twist) > 0.001) {
        float angle = twist * w * 4.0 + sin(time * 1.2 + length(delta) * 6.0) * twist * w * 0.35;
        mat2 rot = rotate(angle);
        result = mousePos + rot * (result - mousePos);
    }

    return result;
}

highp vec2 applySymmetry(highp vec2 p, float n, float angleOffset, float mid, float high, float integratedTime) { 
    float audioSymmetryMod = 1.0 + sin(integratedTime * 0.5 + mid * PI) * 0.02 * mid + cos(integratedTime * 0.8 - high * PI) * 0.03 * high;
    float effective = max(1.0, n * audioSymmetryMod);

    if (effective <= 1.001) { 
        return p;
    }

    float radius = length(p);
    if (radius < 0.0001) return vec2(0.0);

    // Integer wedge count avoids fold-boundary seams when symmetry breathes.
    // Fractional symmetry becomes subtle rotation instead of tearing fold topology.
    float foldN = floor(effective + 0.5);
    if (foldN < 2.0) return p;
    float fracN = effective - foldN;

    float angleOffsetAdjusted = angleOffset + fracN * 0.4 * sin(integratedTime * 0.7 + radius * 2.5);

    mat2 rotOffset = rotate(angleOffsetAdjusted);
    highp vec2 q = rotOffset * p;

    // Mirror-fold into primary wedge (seam-stable vs angle * n polar wrap)
    float wedge = PI / foldN;
    float a = atan(q.y, q.x);
    a = mod(a + wedge, 2.0 * wedge) - wedge;
    a = abs(a);

    return radius * vec2(cos(a), sin(a));
}

vec3 textureBlur(highp sampler2D tex, highp vec2 uv, highp vec2 resolution, float blurAmount) {
    vec3 col = vec3(0.0);
    highp vec2 pixelSize = 1.0 / resolution * blurAmount;
    
    col += texture(tex, uv + vec2(-pixelSize.x, -pixelSize.y)).rgb;
    col += texture(tex, uv + vec2( 0.0,       -pixelSize.y)).rgb;
    col += texture(tex, uv + vec2( pixelSize.x, -pixelSize.y)).rgb;
    col += texture(tex, uv + vec2(-pixelSize.x,  0.0)).rgb;
    col += texture(tex, uv + vec2( 0.0,        0.0)).rgb;
    col += texture(tex, uv + vec2( pixelSize.x,  0.0)).rgb;
    col += texture(tex, uv + vec2(-pixelSize.x,  pixelSize.y)).rgb;
    col += texture(tex, uv + vec2( 0.0,        pixelSize.y)).rgb;
    col += texture(tex, uv + vec2( pixelSize.x,  pixelSize.y)).rgb;
    return col / 9.0;
}

float sobelEdgeDetect(highp sampler2D tex, highp vec2 uv, highp vec2 resolution) {
    highp vec2 pixelSize = 1.0 / resolution;
    vec3 lumWeights = vec3(0.299, 0.587, 0.114);

    float tl = dot(texture(tex, uv + vec2(-pixelSize.x, -pixelSize.y)).rgb, lumWeights);
    float t  = dot(texture(tex, uv + vec2( 0.0,       -pixelSize.y)).rgb, lumWeights);
    float tr = dot(texture(tex, uv + vec2( pixelSize.x, -pixelSize.y)).rgb, lumWeights);
    float l  = dot(texture(tex, uv + vec2(-pixelSize.x,  0.0)).rgb, lumWeights);
    float r  = dot(texture(tex, uv + vec2( pixelSize.x,  0.0)).rgb, lumWeights);
    float bl = dot(texture(tex, uv + vec2(-pixelSize.x,  pixelSize.y)).rgb, lumWeights);
    float b  = dot(texture(tex, uv + vec2( 0.0,        pixelSize.y)).rgb, lumWeights);
    float br = dot(texture(tex, uv + vec2( pixelSize.x,  pixelSize.y)).rgb, lumWeights);
    float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
    float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
    float raw = length(vec2(gx, gy));
    return smoothstep(0.04, 0.35, raw);
}

float pattern_wovenGrid(highp vec2 transformed_p, float integratedTime, float freq, float weaveThickness, float bass, float mid, float high, float overallAudio) {
    
    
    
    float modulatedFreq = freq + high * 60.0 + mid * 20.0 + u_spectralCentroid * 30.0 + u_beatStrength * 15.0; 
    
    float modulatedThickness = weaveThickness + pow(bass, 1.5) * 0.08 + mid * 0.03 + u_beatStrength * 0.04; 

    float r2=dot(transformed_p, transformed_p);
    highp vec2 hp=transformed_p*(2.0/(1.0+r2));
    hp *= modulatedFreq * 0.5;

    
    float timeSpeedFactor = 1.0 + mid * 1.5 + high * 0.8 + u_spectralCentroid * 0.5;
    float wt = integratedTime * 0.3 * timeSpeedFactor;
    float bassOffsetMag = bass * 0.15; 

    highp vec2 hp1 = rotate(wt*0.2)*(hp+vec2(0.1 + bassOffsetMag * cos(wt), bassOffsetMag * sin(wt*1.2)));
    highp vec2 hp2 = rotate(-wt*0.2)*(hp-vec2(0.1 + bassOffsetMag * cos(wt*0.9), bassOffsetMag * sin(wt*1.1)));
    float v1 = sin(hp1.x*PI + cos(hp1.y*PI*0.5+wt) + mid * PI); 
    float v2 = sin(hp2.y*PI + sin(hp2.x*PI*0.5-wt) + high * PI * 0.8); 

    float diff = abs(v1 - v2);
    
    float sharpness = 0.5 + bass * 1.5 + u_beatStrength * 0.8;
    return 1.0 - smoothstep(modulatedThickness * sharpness * 0.5, modulatedThickness * sharpness * 1.5, diff);
}

float pattern_hyperTuring(highp vec2 p, float accumulatedTuringTime, 
                         float scale, float feed, float kill,
                         float diffA, float diffB,
                         float bass, float mid, float high, float overallAudio) {

    
    
    float modulatedScale = max(0.01, scale + pow(overallAudio, 0.8) * 2.5 + mid * 1.5); 
    float timeSpeedFactor = 1.0 + high * 2.0; 
    float timeScaled = accumulatedTuringTime * 0.2 * timeSpeedFactor;

    
    highp vec2 audioOffsetA = vec2(bass * 0.3 * cos(timeScaled * 0.5), mid * 0.25 * sin(timeScaled * 0.7));
    highp vec2 audioOffsetB = vec2(high * 0.2 * sin(timeScaled * -0.4), bass * 0.35 * cos(timeScaled * 0.6));
    
    
    
    float baseDiffAMod = mix(0.7, 1.3, diffA);
    float baseDiffBMod = mix(0.7, 1.3, diffB);
    float diffAMod = clamp(baseDiffAMod * (1.0 + bass * 0.4 - mid * 0.2), 0.5, 1.5); 
    float diffBMod = clamp(baseDiffBMod * (1.0 - bass * 0.3 + mid * 0.5), 0.5, 1.5); 

    highp vec2 pA = p * modulatedScale * diffAMod + vec2(timeScaled * 0.5, -timeScaled * 0.3) + audioOffsetA;
    highp vec2 pB = p * modulatedScale * diffBMod + vec2(-timeScaled * 0.2, timeScaled * 0.6) + audioOffsetB;

    float noiseA = fbm(pA);
    float noiseB = fbm(pB);

    
    
    float killMod = clamp(kill + bass * 0.6, 0.0, 1.0); 
    float feedMod = clamp(feed + high * 0.9 + mid * 0.3, 0.0, 1.0); 
    
    
    float modulatedThreshold = mix(0.1, 0.5, killMod); 
    
    
    float modulatedContrast = mix(0.5, 1.8, feedMod); 

    
    float noiseDiff = (noiseA - noiseB);
    
    
    float absNoiseDiff = abs(noiseDiff); 
    float contrastedAbsDiff = absNoiseDiff * modulatedContrast; 
    
    float patternVal = smoothstep(0.1, 0.5, contrastedAbsDiff);
    return patternVal;
}

float pattern_hyperVoronoi(highp vec2 p, float integratedTime, float scale, float edgeWidth,
                           float bass, float mid, float high, float overallAudio) {
    
    float bassPulseScale = pow(bass, 1.5) * 8.0;
    float midWarpScale = mid * 3.0;
    
    float centroidScaleFactor = 1.0 + u_spectralCentroid * 1.5; 
    float modulatedScale = (scale + bassPulseScale + midWarpScale) * centroidScaleFactor;
    
    float highSharpness = high * 0.25;
    
    float beatEdgePulse = u_beatStrength * 0.5; 
    float modulatedEdgeWidth = max(0.001, edgeWidth + highSharpness - bass * 0.05 - beatEdgePulse * edgeWidth);

    highp vec2 scaled_p = p * modulatedScale;
    float voronoiTimeOffset = integratedTime * (0.2 + mid * 0.5);
    highp vec2 vdist = voronoi(scaled_p, voronoiTimeOffset, bass, high);
    float edge = vdist.y - vdist.x;

    float lowerBound = modulatedEdgeWidth * (0.5 - high * 0.4); 
    float upperBound = modulatedEdgeWidth * (1.5 + high * 0.8);
    return 1.0 - smoothstep(lowerBound, upperBound, edge);
}

float pattern_spiralArms(highp vec2 p, float accumulatedSpiralNoiseTime, 
                         float numArms, float tightness, float noiseScale,
                         float bass, float mid, float high, float overallAudio) {
    
    
    float modulatedArms = numArms + pow(bass, 1.2) * 6.0 + mid * 1.5 + u_beatStrength * 3.0;
    float modulatedTightness = tightness + high * 1.5 - bass * 0.4;
    float modulatedNoiseScale = noiseScale + mid * 3.0 + overallAudio * 1.0;

    float radius = length(p);
    if (radius < 0.0001) return 0.0;
    float angle = atan(p.y, p.x);
    float clamped_radius_for_log = max(radius, 0.01);

    float logRadiusTerm = log(clamped_radius_for_log + 0.001) * modulatedTightness * (1.0 + bass * 0.5);
    float timeSpeedFactor = 1.0 + high * 0.8;
    float timeOffset = accumulatedSpiralNoiseTime * 0.5 * timeSpeedFactor;
    float midPhaseShift = mid * 4.0 * PI;
    float bassPhasePulse = sin(accumulatedSpiralNoiseTime * 2.0 + bass * PI * 5.0) * bass * 0.8 * PI;

    float spiralPhase = angle + logRadiusTerm - timeOffset + midPhaseShift + bassPhasePulse;
    float spiralValue = sin(spiralPhase);
    float armWidth = 0.6 + high * 0.3 - mid * 0.2;
    float spiralIntensity = smoothstep(-armWidth, armWidth, spiralValue);

    highp vec2 noiseTimeOffset = vec2(accumulatedSpiralNoiseTime * (0.5 + bass * 0.6), -accumulatedSpiralNoiseTime * (0.3 + high * 0.5));
    highp vec2 noiseCoords = p * modulatedNoiseScale * 3.0 + vec2(radius * 0.5, 0.0) + noiseTimeOffset;
    float noiseVal = fbm(noiseCoords);

    
    float noiseInfluence = 0.4 + 1.2 * noiseVal * (1.0 + overallAudio * 0.5) * (0.5 + u_spectralCentroid * 1.0); 
    return clamp(spiralIntensity * noiseInfluence, 0.0, 1.0);
}

float pattern_reactionDiff(highp vec2 p, float accumulatedTuringTime, 
                           float complexity, float spotSize, float tScale, float tFeed, float tKill,
                           float bass, float mid, float high, float overallAudio) {
    
    float modulatedComplexity = complexity + pow(overallAudio, 0.7) * 3.0 + mid * 1.5;
    float modulatedSpotSize = spotSize + pow(bass, 1.3) * 1.5 + mid * 0.6; 
    float timeSpeedFactor = 1.0 + high * 2.0; 
    float timeScaled = accumulatedTuringTime * 0.2 * timeSpeedFactor;
    float complexityFactor = mix(1.0, 4.0, modulatedComplexity); 

    
    highp vec2 audioOffsetA = vec2(bass * 0.3 * cos(timeScaled * 0.5), mid * 0.25 * sin(timeScaled * 0.7));
    highp vec2 audioOffsetB = vec2(high * 0.2 * sin(timeScaled * -0.4), bass * 0.35 * cos(timeScaled * 0.6));
    highp vec2 audioOffsetC = vec2(mid * 0.2 * cos(timeScaled * 0.8), high * 0.15 * sin(timeScaled * 0.9));

    highp vec2 pA = p * tScale * (1.0 + high * 0.1) + vec2(timeScaled * 0.5, -timeScaled * 0.3) + audioOffsetA;
    highp vec2 pB = p * tScale * 1.1 * (1.0 - mid * 0.1) + vec2(-timeScaled * 0.2, timeScaled * 0.6) * complexityFactor + audioOffsetB;
    highp vec2 pC = p * tScale * 0.9 * (1.0 + bass * 0.1) + vec2(timeScaled * 0.7, timeScaled * 0.4) * (1.0 + complexityFactor) + audioOffsetC;

    float noiseA = fbm(pA);
    float noiseB = fbm(pB);
    float noiseC = noise(pC * 2.0);

    
    float noiseCombineFactor = 0.8 + modulatedComplexity * 0.4 + bass * 0.3;
    float noiseCScale = 0.3 * modulatedComplexity + high * 0.2;
    float combinedNoise = (noiseA - noiseB * noiseCombineFactor) + noiseC * noiseCScale;

    
    float killMod = clamp(tKill + bass * 0.8, 0.0, 1.0); 
    float feedMod = clamp(tFeed + high * 1.2 + mid * 0.4, 0.0, 1.0); 
    float threshold = mix(0.35, 0.65, killMod); 
    float contrast = mix(0.5, 2.0, feedMod); 

    
    float edgeWidth = mix(0.25, 0.01, pow(modulatedSpotSize, 1.5)); 
    float patternVal = smoothstep(threshold - edgeWidth, threshold + edgeWidth, combinedNoise * contrast);
    return patternVal;
}

float pattern_hyperFlow(highp vec2 p, float accumulatedFlowTime, 
                        float complexity, float curlAmount,
                        float bass, float mid, float high, float overallAudio) {
    
    float modulatedComplexity = complexity + mid * 3.0 + high * 1.5 + overallAudio * 0.5; 
    float modulatedCurl = curlAmount + pow(bass, 1.4) * 2.5 + mid * 1.2; 

    
    float timeSpeedFactor = 1.0 + high * 1.2 + bass * 0.5;
    float timeScaled = accumulatedFlowTime * 0.3 * timeSpeedFactor;
    float scale = modulatedComplexity * 8.0;
    float r2 = dot(p, p);
    highp vec2 hp = p * (2.0 / (1.0 + r2)); 

    
    highp vec2 audioOffset = vec2(bass * 0.2 * cos(timeScaled), mid * 0.15 * sin(timeScaled * 1.3));
    highp vec2 noiseCoord = hp * scale + vec2(timeScaled, -timeScaled * 0.7) + audioOffset;
    float flowAngle = noise(noiseCoord) * TAU;
    float curlOffset = 0.01;

    
    float fbmTimeScale = 0.3 + high * 0.4;
    float fbmScaleFactor = 0.5 + mid * 0.3;
    float fbmBase = fbm(hp * scale * fbmScaleFactor + timeScaled * fbmTimeScale + audioOffset * 0.5);
    float fbmDx = fbm((hp + vec2(curlOffset, 0.0)) * scale * fbmScaleFactor + timeScaled * fbmTimeScale + audioOffset * 0.5);
    float fbmDy = fbm((hp + vec2(0.0, curlOffset)) * scale * fbmScaleFactor + timeScaled * fbmTimeScale + audioOffset * 0.5);

    vec2 gradient = normalize(vec2(fbmDx - fbmBase, fbmDy - fbmBase) / curlOffset);
    float curlAngle = atan(gradient.y, gradient.x);

    
    float finalAngle = flowAngle + curlAngle * modulatedCurl * (2.0 + bass * 1.0) + mid * PI; 

    mat2 flowRotation = rotate(finalAngle * 0.5);
    highp vec2 distortedCoord = flowRotation * hp * (1.5 + bass * 0.5); 

    
    return fbm(distortedCoord + noiseCoord * (0.1 + high * 0.15)); 
}

float pattern_cubeGrid(highp vec2 sym_uv,
                       float accumulatedCubeTime,
                       float cubeSize,
                       float layerAudioDistortionAmount, 
                       float bass, float mid, float high, float overallAudio)
{
    // Setup camera and ray direction
    vec3 ro = vec3(0.0, 0.0, -3.0); // Camera position
    vec3 rd = normalize(vec3(sym_uv, 1.0)); // Ray direction

    // Pitch the camera down slightly
    float camPitch = 0.5;
    mat3 rotX = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(camPitch), -sin(camPitch),
        0.0, sin(camPitch), cos(camPitch)
    );
    rd = rotX * rd;

    // Time scaling and audio pulsing
    float t = accumulatedCubeTime * (0.8 + mid * 0.5);
    float boxScale = max(0.1, cubeSize * (1.0 + bass * 0.4 - high * 0.2));
    
    // Raymarching loop (capped to 30 steps for 60fps performance)
    float distanceMarched = 0.0;
    float glow = 0.0;
    bool hit = false;
    vec3 p;
    
    for(int i = 0; i < 30; i++) {
        p = ro + rd * distanceMarched;
        
        // Move the grid forward continuously
        p.z -= t;
        
        // Domain repetition to create the grid
        float spacing = 1.5;
        vec3 id = floor((p + spacing * 0.5) / spacing);
        p = mod(p + spacing * 0.5, spacing) - spacing * 0.5;
        
        // Randomize each box's rotation and height based on its grid ID and audio
        float h = hash11(id.xz) + 0.1; 
        float speed = (h - 0.5) * 2.0;

        // Individual box rotation
        float angleY = t * speed + h * TAU + high * PI;
        mat3 rmY = mat3(
            cos(angleY), 0.0, sin(angleY),
            0.0, 1.0, 0.0,
            -sin(angleY), 0.0, cos(angleY)
        );
        vec3 rotatedP = rmY * p;

        // Box size variation based on ID and bass
        vec3 bSize = vec3(boxScale * 0.4, boxScale * (0.2 + h * 0.8 * (1.0 + bass)), boxScale * 0.4);

        // Distance to a wireframe box
        // Distance to solid box
        vec3 q = abs(rotatedP) - bSize;
        float dSolid = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        
        // Distance to inner box (to hollow it out)
        float edgeThickness = 0.03 * (1.0 + high);
        vec3 innerSize = max(vec3(0.0), bSize - edgeThickness);
        vec3 qInner = abs(rotatedP) - innerSize;
        float dInner = length(max(qInner, 0.0)) + min(max(qInner.x, max(qInner.y, qInner.z)), 0.0);
        
        // The wireframe is the solid box intersected with the inverse of the interior cross
        // For a true wireframe, we take the max of absolute distances minus edges.
        
        // Fast wireframe approximation
        float eq = max(q.x, max(q.y, q.z));
        float dWireX = max(q.y, q.z);
        float dWireY = max(q.x, q.z);
        float dWireZ = max(q.x, q.y);
        float dWire = max(dSolid, -min(dWireX, min(dWireY, dWireZ)) + edgeThickness);

        float d = dWire;

        // Accumulate glow passing close to the edges
        glow += 0.005 / (0.01 + abs(d)) * (0.5 + h);

        if(d < 0.01) {
            hit = true;
            break;
        }

        distanceMarched += d * 0.7; // Under-relax to avoid piercing hollow spaces
        
        if(distanceMarched > 15.0) break; // Far clip plane
    }
    
    float col = 0.0;
    
    // Add depth fog / glow
    float fog = smoothstep(15.0, 0.0, distanceMarched);
    
    if(hit) {
        col = 1.0 * fog;
    }
    
    col += glow * 0.2 * fog * (1.0 + overallAudio);
    
    return clamp(col, 0.0, 1.0);
}

float pattern_kaleidoWave(highp vec2 p, float integratedTime, float freq, float flowSpeed, float flowCurl,
                          float bass, float mid, float high, float overallAudio) {
    float r = length(p);
    float angle = atan(p.y, p.x);
    float speed = (0.4 + flowSpeed * 0.8) * (1.0 + bass * 0.5 + mid * 0.3);
    float t = integratedTime * speed + flowCurl * angle * 2.0;
    float density = (4.0 + freq * 0.4) * (1.0 + high * 0.5);
    float wave1 = sin(r * density - t);
    float wave2 = sin(r * density * 1.3 + t * 0.7 + angle * 3.0);
    float wave3 = sin(angle * 6.0 + t * 0.5 + bass * PI);
    float v = wave1 * 0.5 + wave2 * 0.35 + wave3 * 0.15;
    v = v * 0.5 + 0.5;
    float edge = smoothstep(0.0, 0.15, r) * (1.0 - smoothstep(1.2, 1.5, r));
    return clamp(v * (0.7 + overallAudio * 0.3), 0.0, 1.0) * edge;
}

float pattern_crystal(highp vec2 p, float integratedTime, float scale, float edgeWidth,
                      float bass, float mid, float high, float overallAudio) {
    float s = max(0.5, scale) * (1.0 + mid * 0.4);
    highp vec2 v = voronoi(p * s, integratedTime * 0.2, bass, high);
    float d = v.x;
    float d2 = v.y;
    float crack = smoothstep(edgeWidth * 0.3, edgeWidth * 1.2, d2 - d);
    float cell = 1.0 - smoothstep(0.0, edgeWidth * (1.0 + high * 0.5), d);
    float crystal = cell * (0.6 + crack * 0.4);
    crystal *= (0.85 + bass * 0.2 + overallAudio * 0.15);
    return clamp(crystal, 0.0, 1.0);
}

float pattern_plasma(highp vec2 p, float integratedTime, float flowSpeed, float flowComplexity, float freq,
                     float bass, float mid, float high, float overallAudio) {
    float t = integratedTime * (0.5 + flowSpeed * 1.2) * (1.0 + bass * 0.4);
    float scale = (3.0 + freq * 0.5) * (1.0 + flowComplexity * 2.0);
    highp vec2 q = p * scale;
    float v = sin(q.x + t);
    v += sin(q.y + t * 1.1);
    v += sin((q.x + q.y) * 0.7 + t * 0.9);
    v += sin(length(q) * 0.5 + t * 0.6 + mid * PI);
    v += sin(atan(q.y, q.x) * 4.0 + t * 0.4) * (0.3 + high * 0.4);
    v = v * 0.2 + 0.5;
    return clamp(v * (0.8 + overallAudio * 0.3), 0.0, 1.0);
}

float pattern_aurora(highp vec2 p, float integratedTime, float freq, float flowSpeed, float flowCurl,
                     float bass, float mid, float high, float overallAudio) {
    float t = integratedTime * (0.2 + flowSpeed * 0.6) * (1.0 + bass * 0.3);
    float bands = (2.0 + freq * 0.5) * (1.0 + mid * 0.5);
    float y = p.y + sin(p.x * 3.0 + t) * flowCurl * 0.3 + bass * 0.2;
    float ribbon = sin(y * bands + t * 0.7) * 0.5 + 0.5;
    ribbon *= exp(-abs(p.x) * 1.2);
    float soft = smoothstep(0.2, 0.6, ribbon) * (1.0 - smoothstep(0.6, 0.95, ribbon));
    soft *= (0.7 + high * 0.4 + overallAudio * 0.2);
    return clamp(soft, 0.0, 1.0);
}

float pattern_inkDrop(highp vec2 p, float integratedTime, float flowSpeed, float rdComplexity, float rdSpotSize,
                      float bass, float mid, float high, float overallAudio) {
    float t = integratedTime * (0.15 + flowSpeed * 0.5);
    mat2 rot = rotate(t * 0.3 + bass * 0.5);
    highp vec2 q = rot * p;
    float scale = (2.0 + rdComplexity * 4.0) * (1.0 + mid * 1.5);
    float n = fbm(q * scale + vec2(t * 0.5, -t * 0.3));
    float n2 = fbm(q * scale * 1.3 - vec2(t * 0.4, t * 0.6) + 10.0);
    float marble = n * 0.6 + n2 * 0.4 + sin((n - n2) * PI * (2.0 + rdSpotSize * 4.0)) * 0.2;
    marble = marble * 0.5 + 0.5;
    float edge = smoothstep(0.35, 0.5, marble) + smoothstep(0.5, 0.65, marble) * (0.5 + high * 0.5);
    return clamp(edge * (0.8 + overallAudio * 0.3), 0.0, 1.0);
}

float pattern_stainedGlass(highp vec2 p, float integratedTime, float scale, float edgeWidth,
                            float bass, float mid, float high, float overallAudio) {
    float s = max(1.0, scale) * (1.0 + mid * 0.3);
    highp vec2 v = voronoi(p * s, integratedTime * 0.1, bass * 0.5, high * 0.5);
    float d = v.x;
    float d2 = v.y;
    float edge = smoothstep(edgeWidth * 0.5, edgeWidth * 2.0, d2 - d);
    float cell = smoothstep(edgeWidth * 2.0, edgeWidth * 0.5, d);
    float glass = cell * (0.3 + edge * 0.7);
    glass *= (0.85 + bass * 0.15 + overallAudio * 0.1);
    return clamp(glass, 0.0, 1.0);
}

float pattern_morph(highp vec2 p, float integratedTime, float flowSpeed, float flowComplexity, float flowCurl,
                    float bass, float mid, float high, float overallAudio) {
    float t = integratedTime * (0.2 + flowSpeed * 0.6);
    mat2 rot = rotate(t * 0.2 + flowCurl * 0.5);
    highp vec2 q = rot * p;
    float scale = (3.0 + flowComplexity * 5.0) * (1.0 + high * 0.8);
    float n = fbm(q * scale + t * 0.3);
    float n2 = fbm(q * scale * 0.8 - t * 0.2 + 5.0);
    float blob = smoothstep(0.4, 0.6, n) * smoothstep(0.5, 0.35, n2);
    blob += smoothstep(0.35, 0.55, n2) * (0.4 + mid * 0.3);
    blob = clamp(blob * (0.9 + bass * 0.2 + overallAudio * 0.2), 0.0, 1.0);
    return blob;
}

float pattern_prism(highp vec2 p, float integratedTime, float freq, float flowSpeed, float turingScale,
                    float bass, float mid, float high, float overallAudio) {
    float t = integratedTime * (0.3 + flowSpeed * 0.8);
    float r = length(p);
    float angle = atan(p.y, p.x);
    float bands = (4.0 + freq * 0.8) * (1.0 + turingScale * 0.3);
    float spectral = sin(angle * bands + t + r * 2.0) * 0.5 + 0.5;
    spectral *= sin(r * (3.0 + mid * 2.0) - t * 0.5) * 0.5 + 0.5;
    float vignette = 1.0 - smoothstep(0.5, 1.2, r);
    spectral *= vignette * (0.8 + high * 0.3 + overallAudio * 0.2);
    return clamp(spectral, 0.0, 1.0);
}

float pattern_fractal(highp vec2 p, float integratedTime, float iterations, float angleOffset, float speed, float thickness,
                      float bass, float mid, float high, float overallAudio) {
    float t = integratedTime * (0.2 + speed * 1.5);
    highp vec2 z = p * (1.5 - bass * 0.3); 
    highp vec2 c = vec2(cos(t + angleOffset), sin(t * 0.7 - angleOffset)) * (0.6 + mid * 0.2);
    
    float iterCount = max(1.0, floor(iterations + high * 2.0));
    float d = 0.0;
    
    for (int i = 0; i < 8; i++) {
        if (float(i) >= iterCount) break;
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
        d = max(d, exp(-length(z)));
    }
    
    float modThickness = thickness * 10.0 * (1.0 + bass * 0.5 + overallAudio * 0.2);
    float glow = smoothstep(modThickness * 0.1, modThickness * 1.5, d);
    return clamp(glow * (0.8 + high * 0.4), 0.0, 1.0);
}

float pattern_lissajous(highp vec2 p, float integratedTime, float freqX, float freqY, float speed, float thickness,
                        float bass, float mid, float high, float overallAudio) {
    float t = integratedTime * (0.2 + speed * 0.8);
    float waveX = sin(p.x * (10.0 + freqX * 2.0) + t * freqX * 3.0 + mid * 2.0);
    float waveY = sin(p.y * (10.0 + freqY * 2.0) + t * freqY * 3.0 + high * 2.0);
    
    float interference = abs(waveX + waveY);
    float modThickness = thickness * 5.0 * (1.0 + bass * 0.8 + overallAudio * 0.2);
    
    float web = 1.0 - smoothstep(0.0, modThickness, interference);
    return clamp(web * (0.7 + overallAudio * 0.3), 0.0, 1.0);
}

struct AccumulatedTimes {
    float turing;
    float spiralNoise;
    float flow;
    float cube;
};
uniform AccumulatedTimes u_accumulatedTimes[4];

float getPatternValue(
    int patternTypeToUse,
    int layerIndex, 
    LayerParams layerData,
    highp vec2 sym_uv, 
    highp vec2 dist_uv, 
    float integratedTime,
    
    float bass, float mid, float high, float overallAudio
) {
    
    highp vec2 input_uv; 
    
    if (patternTypeToUse == PATTERN_CUBEGRID) {
         input_uv = sym_uv;
    } else {
         input_uv = dist_uv;
    }

    if (patternTypeToUse == PATTERN_INVISIBLE) {
        return 0.0;
    } else if (patternTypeToUse == PATTERN_KALEIDOWAVE) {
        return pattern_kaleidoWave(input_uv, integratedTime, layerData.freq, layerData.flowSpeed, layerData.flowCurl,
                                   bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_CRYSTAL) {
        return pattern_crystal(input_uv, integratedTime, layerData.voronoiScale, layerData.voronoiEdgeWidth,
                              bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_PLASMA) {
        return pattern_plasma(input_uv, integratedTime, layerData.flowSpeed, layerData.flowComplexity, layerData.freq,
                             bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_AURORA) {
        return pattern_aurora(input_uv, integratedTime, layerData.freq, layerData.flowSpeed, layerData.flowCurl,
                             bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_INKDROP) {
        return pattern_inkDrop(input_uv, integratedTime, layerData.flowSpeed, layerData.rdComplexity, layerData.rdSpotSize,
                              bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_STAINEDGLASS) {
        return pattern_stainedGlass(input_uv, integratedTime, layerData.voronoiScale, layerData.voronoiEdgeWidth,
                                    bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_MORPH) {
        return pattern_morph(input_uv, integratedTime, layerData.flowSpeed, layerData.flowComplexity, layerData.flowCurl,
                             bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_PRISM) {
        return pattern_prism(input_uv, integratedTime, layerData.freq, layerData.flowSpeed, layerData.turingScale,
                             bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_WOVENGRID) { 
        return pattern_wovenGrid(input_uv, integratedTime, layerData.freq, layerData.weaveThickness, bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_HYPERTURING) {
        return pattern_hyperTuring(input_uv, u_accumulatedTimes[layerIndex].turing,
                                   layerData.turingScale, layerData.turingFeed, layerData.turingKill,
                                   layerData.turingDiffusionA, layerData.turingDiffusionB,
                                   bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_HYPERVORONOI) { 
         return pattern_hyperVoronoi(input_uv, integratedTime, layerData.voronoiScale, layerData.voronoiEdgeWidth,
                                    bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_SPIRALARMS) {
        return pattern_spiralArms(input_uv, u_accumulatedTimes[layerIndex].spiralNoise,
                                layerData.spiralArms, layerData.spiralTightness,
                                layerData.spiralNoiseScale,
                                bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_REACTIONDIFF) {
        return pattern_reactionDiff(input_uv, u_accumulatedTimes[layerIndex].turing, 
                                    layerData.rdComplexity, layerData.rdSpotSize,
                                    layerData.turingScale, layerData.turingFeed, layerData.turingKill, 
                                    bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_HYPERFLOW) {
        return pattern_hyperFlow(input_uv, u_accumulatedTimes[layerIndex].flow,
                                 layerData.flowComplexity, layerData.flowCurl,
                                 bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_CUBEGRID) {
        
        
        
        return pattern_cubeGrid(input_uv, 
                                  u_accumulatedTimes[layerIndex].cube,
                                  layerData.cubeSize,
                                  0.0, 
                                  bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_FRACTAL) {
        return pattern_fractal(input_uv, integratedTime,
                               layerData.fractalIterations, layerData.fractalAngle,
                               layerData.fractalSpeed, layerData.fractalThickness,
                               bass, mid, high, overallAudio);
    } else if (patternTypeToUse == PATTERN_LISSAJOUS) {
        return pattern_lissajous(input_uv, integratedTime,
                                 layerData.lissajousFreqX, layerData.lissajousFreqY,
                                 layerData.lissajousSpeed, layerData.lissajousThickness,
                                 bass, mid, high, overallAudio);
    }
    return 0.0;
}

/** Lift band levels for audio-reactive color modes (motion uses heavily attenuated bass/mid/high). */
vec3 amplifyAudioColor(vec3 bandLevels, float patternValue, float beatBoost) {
    vec3 c = bandLevels * beatBoost;
    c = pow(clamp(c, 0.0, 1.0), vec3(0.62));
    float mask = patternValue * 0.72 + 0.28;
    c *= mask;
    float luma = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(luma), c, 1.5);
    return clamp(c * 1.4, 0.0, 1.0);
}

vec3 getColorForMode(
    float patternValue,
    int modeIndex,
    float integratedTime,
    highp vec2 uv,
    
    float bass, float mid, float high
) {
    
    if (modeIndex == COLOR_MODE_FIRE) {
        
        return texture(u_fire_gradient_texture, vec2(patternValue, 0.5)).rgb;
    } else if (modeIndex == COLOR_MODE_ICE) {
        return texture(u_ice_gradient_texture, vec2(patternValue, 0.5)).rgb;
    } else if (modeIndex == COLOR_MODE_MONOCHROME) {
        return vec3(patternValue);
    } else if (modeIndex == COLOR_MODE_AUDIO_RGB) {
        float beatMod = 1.0 + u_beatStrength * 0.85;
        vec3 bands = vec3(bass * 9.0, mid * 14.0, high * 10.0);
        return amplifyAudioColor(bands, patternValue, beatMod);
    } else if (modeIndex == COLOR_MODE_SPECTRUM) {
        float beatMod = 1.0 + u_beatStrength * 0.7;
        vec3 bands = vec3(bass * 10.0, mid * 15.0, high * 11.0);
        return amplifyAudioColor(bands, patternValue, beatMod);
    } else if (modeIndex == COLOR_MODE_REACTIVE_PULSE) {
        vec3 baseColor = vec3(patternValue * 0.55 + 0.45);
        float pulseSpeed = 5.0 + mid * 16.0;
        float pulseIntensity = bass * 4.8 + u_beatStrength * 0.45 + high * 0.35;
        float pulse = (sin(integratedTime * pulseSpeed + patternValue * PI) * 0.5 + 0.5) * pulseIntensity;
        vec3 pulseColor = vec3(1.0, 0.88, 0.75);
        vec3 col = mix(baseColor, pulseColor, clamp(pulse, 0.0, 1.0));
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(luma), col, 1.35 + bass * 0.4);
        return clamp(col * (1.25 + bass * 0.55 + high * 0.25), 0.0, 1.0);
    } else if (modeIndex == COLOR_MODE_CYBERPUNK) {
        vec3 col1 = vec3(0.2, 0.0, 0.8); 
        vec3 col2 = vec3(1.0, 0.0, 0.4); 
        vec3 col3 = vec3(0.0, 1.0, 1.0); 
        float mix1 = clamp(patternValue * 2.0, 0.0, 1.0);
        float mix2 = clamp((patternValue - 0.5) * 2.0, 0.0, 1.0);
        vec3 color = mix(col1, col2, mix1);
        color = mix(color, col3, mix2);
        return clamp(color * (1.0 + u_beatStrength * 0.5), 0.0, 1.0);
    } else if (modeIndex == COLOR_MODE_VAPORWAVE) {
        vec3 col1 = vec3(0.1, 0.7, 0.6); 
        vec3 col2 = vec3(1.0, 0.6, 0.8); 
        vec3 col3 = vec3(0.8, 0.4, 1.0); 
        float mix1 = clamp(patternValue * 2.0, 0.0, 1.0);
        float mix2 = clamp((patternValue - 0.5) * 2.0, 0.0, 1.0);
        vec3 color = mix(col1, col2, mix1);
        color = mix(color, col3, mix2);
        return clamp(color * (1.0 + u_beatStrength * 0.2), 0.0, 1.0);
    } else if (modeIndex == COLOR_MODE_MATRIX) {
        vec3 col1 = vec3(0.0, 0.1, 0.0); 
        vec3 col2 = vec3(0.0, 0.8, 0.2); 
        vec3 col3 = vec3(0.8, 1.0, 0.8); 
        float mix1 = clamp(patternValue * 2.0, 0.0, 1.0);
        float mix2 = clamp((patternValue - 0.5) * 2.0, 0.0, 1.0);
        vec3 color = mix(col1, col2, mix1);
        color = mix(color, col3, mix2);
        return clamp(color * (1.0 + bass * 0.4), 0.0, 1.0);
    }
    else { 
        
        float hueShift = u_rainbowPhase + u_spectralCentroid * 0.3; 
        
        float valuePulse = 1.0 + u_beatStrength * 0.3;
        float hue = mod(patternValue + hueShift, 1.0);
        vec3 rainbowColor = texture(u_gradient_texture, vec2(hue, 0.5)).rgb;
        return clamp(rainbowColor * valuePulse, 0.0, 1.0); 
    }
}

vec3 getColor(
    float patternValue,
    LayerParams layer,
    float integratedTime,
    highp vec2 uv, 
    
    float bass, float mid, float high
) {
    int baseMode = u_forceGlobalColor ? u_globalColorMode : layer.colorMode;
    int targetMode = u_forceGlobalColor ? u_globalColorMode : layer.blendTargetColorMode;

    vec3 baseColor;
    vec3 targetColor;

    
    if (baseMode == COLOR_MODE_VELOCITY) {
        
        
        vec3 feedback = texture(u_feedback_texture, vUv).rgb;
        
        float feedbackLuminance = dot(feedback, vec3(0.299, 0.587, 0.114));
        
        float currentIntensity = max(0.0, patternValue);
        float velocity = abs(currentIntensity - feedbackLuminance);
        
        
        float velocityEnhanced = pow(velocity, 0.7) * 1.5;
        baseColor = texture(u_fire_gradient_texture, vec2(clamp(velocityEnhanced, 0.0, 1.0), 0.5)).rgb;
        
        baseColor = mix(baseColor, vec3(patternValue * 0.5), 0.3); 
    } else {
        
        baseColor = getColorForMode(patternValue, baseMode, integratedTime, uv, bass, mid, high);
    }

    
    if (targetMode == COLOR_MODE_VELOCITY) {
        
        vec3 feedback = texture(u_feedback_texture, vUv).rgb;
        float feedbackLuminance = dot(feedback, vec3(0.299, 0.587, 0.114));
        float currentIntensity = max(0.0, patternValue); 
        float velocity = abs(currentIntensity - feedbackLuminance);
        float velocityEnhanced = pow(velocity, 0.7) * 1.5;
        targetColor = texture(u_fire_gradient_texture, vec2(clamp(velocityEnhanced, 0.0, 1.0), 0.5)).rgb;
        targetColor = mix(targetColor, vec3(patternValue * 0.5), 0.3);
    } else {
        
        targetColor = getColorForMode(patternValue, targetMode, integratedTime, uv, bass, mid, high);
    }

    
    return mix(baseColor, targetColor, layer.blendAmount);
}

float simpleEdgeDetect(sampler2D tex, highp vec2 uv, highp vec2 resolution) {
    highp vec2 texel = 1.0 / resolution;
    float dx0 = texture2D(tex, uv + vec2(-texel.x, 0.0)).r;
    float dx1 = texture2D(tex, uv + vec2( texel.x, 0.0)).r;
    float dy0 = texture2D(tex, uv + vec2(0.0, -texel.y)).r;
    float dy1 = texture2D(tex, uv + vec2(0.0,  texel.y)).r;
    float dx = dx1 - dx0;
    float dy = dy1 - dy0;
    return sqrt(dx * dx + dy * dy);
}

vec3 posterize(vec3 color, float levels) {
    return floor(color * levels) / levels;
}

vec3 applyCartoonEffect(vec3 finalColor, highp vec2 uv, highp vec2 resolution) {
    
    float shadowThreshold = 0.35; 
    float highlightThreshold = 0.65; 

    
    float inputLuma = dot(finalColor, vec3(0.299, 0.587, 0.114));
    vec3 quantizedColor;

    if (inputLuma < shadowThreshold) {
        
        quantizedColor = finalColor * 0.45; 
        quantizedColor = mix(vec3(dot(quantizedColor, vec3(0.299, 0.587, 0.114))), quantizedColor, 0.5); 
    } else if (inputLuma < highlightThreshold) {
        
        quantizedColor = mix(vec3(dot(finalColor, vec3(0.299, 0.587, 0.114))), finalColor, 0.9); 
        quantizedColor *= 0.9; 
    } else {
        
        quantizedColor = mix(finalColor, vec3(1.0), 0.4); 
        quantizedColor = pow(quantizedColor, vec3(0.8)); 
    }

    
    return clamp(quantizedColor, 0.0, 1.0);
}

vec3 applyHashGridEffect(vec3 finalColor, highp vec2 screenCoord, float time) {
    // Halftone dot matrix implementation
    highp vec2 screenUV = screenCoord / u_resolution;
    vec3 feedbackColor = texture2D(u_feedback_texture, screenUV).rgb;
    float luma = dot(feedbackColor, vec3(0.299, 0.587, 0.114));

    // Create a tilted grid for the dots
    float angle = PI / 4.0;
    mat2 rotMat = rotate(angle);
    float dotDensity = 120.0; // Number of dots across the screen
    highp vec2 gridUv = (rotMat * screenUV) * dotDensity;
    
    // Position within the grid cell (-0.5 to 0.5)
    highp vec2 cellUv = fract(gridUv) - 0.5;
    float distToCenter = length(cellUv);
    
    // Dot radius is inversely proportional to luma (brighter = smaller dots for black ink on white paper, but here we do bright dots on dark bg)
    // Actually, luma -> dot size.
    float maxRadius = 0.55;
    float radius = luma * maxRadius;
    
    float edgeSoftness = 0.08;
    float dotMask = smoothstep(radius + edgeSoftness, radius - edgeSoftness, distToCenter);
    
    // Output a monochrome halftone pattern using the original color hue if desired, or strictly greyscale.
    // Let's keep it monochrome with slight tinting for character.
    return finalColor * dotMask;
}

vec3 applyAsciiEffect(vec3 finalColor, highp vec2 screenCoord, float time) {
    
    highp vec2 charUv = floor(screenCoord / u_asciiCharSize); 
    highp vec2 withinCharUv = fract(screenCoord / u_asciiCharSize); 

    
    
    highp vec2 blockCenterUv = (charUv + 0.5) * u_asciiCharSize / u_resolution; 
    vec3 blockColor = texture2D(u_feedback_texture, blockCenterUv).rgb; 
    float luma = dot(blockColor, vec3(0.299, 0.587, 0.114)); 
    
    float pattern = 0.0; 

    
    if (luma > 0.8) { 
        pattern = smoothstep(0.1, 0.2, withinCharUv.x) * (1.0 - smoothstep(0.8, 0.9, withinCharUv.x)) * 
                  smoothstep(0.1, 0.2, withinCharUv.y) * (1.0 - smoothstep(0.8, 0.9, withinCharUv.y)); 
        pattern = 0.9; 
    } else if (luma > 0.6) { 
        float h1 = step(0.4, withinCharUv.x) * step(withinCharUv.x, 0.6); 
        float h2 = step(0.4, withinCharUv.y) * step(withinCharUv.y, 0.6); 
        pattern = max(h1, h2);
    } else if (luma > 0.4) { 
         float p1 = step(0.4, withinCharUv.x) * step(withinCharUv.x, 0.6); 
         float p2 = step(0.4, withinCharUv.y) * step(withinCharUv.y, 0.6); 
         pattern = max(p1 * step(0.2, withinCharUv.y) * step(withinCharUv.y, 0.8), 
                       p2 * step(0.2, withinCharUv.x) * step(withinCharUv.x, 0.8)); 
         pattern = min(pattern * 1.5, 1.0); 
    } else if (luma > 0.2) { 
        pattern = step(0.45, withinCharUv.y) * step(withinCharUv.y, 0.55); 
    } else { 
        pattern = step(0.4, withinCharUv.x) * step(withinCharUv.x, 0.6) * 
                  step(0.4, withinCharUv.y) * step(withinCharUv.y, 0.6); 
        pattern *= 0.5; 
    }
    
    
    return finalColor * pattern; 
}

vec3 rgb2hsl(vec3 color) {
    float maxVal = max(max(color.r, color.g), color.b);
    float minVal = min(min(color.r, color.g), color.b);
    float h = 0.0, s = 0.0, l = (maxVal + minVal) / 2.0;

    if (maxVal == minVal) {
        h = s = 0.0; 
    } else {
        float d = maxVal - minVal;
        s = l > 0.5 ? d / (2.0 - maxVal - minVal) : d / (maxVal + minVal);
        if (maxVal == color.r) {
            h = (color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0);
        } else if (maxVal == color.g) {
            h = (color.b - color.r) / d + 2.0;
        } else { 
            h = (color.r - color.g) / d + 4.0;
        }
        h /= 6.0;
    }
    return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
}

vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    float r, g, b;

    if (s == 0.0) {
        r = g = b = l; 
    } else {
        float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
        float p = 2.0 * l - q;
        r = hue2rgb(p, q, h + 1.0/3.0);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1.0/3.0);
    }
    return vec3(r, g, b);
}

vec3 applyStainedGlassEffect(vec3 finalColor, highp vec2 uv, float time) {
    float voronoiScale = 8.0;        
    float edgeWidth = 0.08;         
    
    highp vec2 scaled_uv = uv * voronoiScale;
    highp vec2 vdist = voronoi(scaled_uv, time * 0.1, 0.0, 0.0); 

    // Edge
    float edgeFactor = smoothstep(0.02, edgeWidth, vdist.y - vdist.x);

    // Refraction simulation: offset the sampling slightly based on voronoi distance
    highp vec2 offsetUv = uv + vec2(vdist.x, vdist.y) * 0.03;
    vec3 refractedColor = texture2D(u_feedback_texture, offsetUv).rgb;
    
    // Mix the original color with refracted feedback for a glass look
    vec3 baseGlass = mix(finalColor, refractedColor, 0.8);

    // Boost saturation and brightness for the glass
    vec3 hsl = rgb2hsl(baseGlass);
    hsl.y = clamp(hsl.y * 1.5, 0.0, 1.0); // Boost saturation
    vec3 glassCol = hsl2rgb(hsl) * 1.2;

    // Specular highlight in the center of the shards
    float specular = smoothstep(0.6, 1.0, 1.0 - vdist.x) * 0.3;

    vec3 colorWithEdges = mix(vec3(0.05), glassCol + specular, edgeFactor);
    return clamp(colorWithEdges, 0.0, 1.0);
}

vec3 applyCRTEffect(vec3 finalColor, highp vec2 uv, float time) {
    // Curvature
    highp vec2 crtUV = uv * 2.0 - 1.0;
    highp vec2 offset = crtUV.yx / 5.0;
    crtUV = crtUV + crtUV * offset * offset;
    crtUV = crtUV * 0.5 + 0.5;

    // Check if outside screen
    if (crtUV.x < 0.0 || crtUV.x > 1.0 || crtUV.y < 0.0 || crtUV.y > 1.0) {
        return vec3(0.0);
    }

    // Chromatic Aberration
    float aberrationAmount = 0.005;
    vec3 col;
    col.r = texture2D(u_feedback_texture, vec2(crtUV.x + aberrationAmount, crtUV.y)).r;
    col.g = texture2D(u_feedback_texture, crtUV).g;
    col.b = texture2D(u_feedback_texture, vec2(crtUV.x - aberrationAmount, crtUV.y)).b;

    // Scanlines
    float scanline = sin(crtUV.y * 800.0) * 0.04;
    col -= scanline;

    // Vignette
    float vignette = length(crtUV - 0.5);
    col *= smoothstep(0.8, 0.4, vignette);

    // Mix heavily with final color to retain pattern geometry but apply post-effects
    vec3 mixedOut = mix(finalColor, col, 0.7);

    // Fast moving subtle bright line
    float scanBar = sin(crtUV.y * 10.0 + time * 5.0);
    mixedOut += smoothstep(0.98, 1.0, scanBar) * 0.15;

    return clamp(mixedOut, 0.0, 1.0);
}

vec3 getThermalColor(float luma) {
    // Custom heat-map gradient: Black -> Deep Blue -> Purple -> Red -> Yellow -> White
    if (luma < 0.1) return mix(vec3(0.0), vec3(0.0, 0.0, 0.4), luma / 0.1);
    else if (luma < 0.3) return mix(vec3(0.0, 0.0, 0.4), vec3(0.5, 0.0, 0.5), (luma - 0.1) / 0.2);
    else if (luma < 0.6) return mix(vec3(0.5, 0.0, 0.5), vec3(1.0, 0.0, 0.0), (luma - 0.3) / 0.3);
    else if (luma < 0.8) return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), (luma - 0.6) / 0.2);
    else return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (luma - 0.8) / 0.2);
}

vec3 applyThermalEffect(vec3 finalColor) {
    float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
    // Exaggerate contrast slightly for the thermal vision effect
    luma = smoothstep(0.1, 0.9, luma);
    return getThermalColor(luma);
}

vec3 applyGlitchEffect(vec3 finalColor, highp vec2 uv, float time) {
    // Generate blocky displacement noise
    float glitchTime = time * 2.0;

    // Create horizontal bands using floor
    float blockY = floor(uv.y * 30.0) / 30.0;
    float noiseVal = hash11(vec2(blockY, glitchTime));

    // Only apply displacement occasionally 
    float isGlitching = step(0.92, noiseVal); 
    
    // Amount of shift
    float shift = (hash11(vec2(blockY, glitchTime + 1.0)) - 0.5) * 0.15;
    
    // Chromatic aberration shift during glitch
    highp vec2 sampleUvR = uv + vec2(shift * isGlitching + 0.015, 0.0);
    highp vec2 sampleUvG = uv + vec2(shift * isGlitching, 0.0);
    highp vec2 sampleUvB = uv + vec2(shift * isGlitching - 0.015, 0.0);
    
    vec3 glitchedCol;
    glitchedCol.r = texture2D(u_feedback_texture, sampleUvR).r;
    glitchedCol.g = texture2D(u_feedback_texture, sampleUvG).g;
    glitchedCol.b = texture2D(u_feedback_texture, sampleUvB).b;

    // Mix between normal and glitched based on an overall timeline probability
    float globalGlitchProb = hash11(vec2(floor(glitchTime * 4.0), 0.0));
    float isGlobalGlitchActive = step(0.8, globalGlitchProb);

    return mix(finalColor, glitchedCol, isGlobalGlitchActive * isGlitching);
}

vec3 applyVHSEffect(vec3 finalColor, highp vec2 uv, float time) {
    highp vec2 tc = uv;
    
    // Tape wave tracking
    float trackingOffset = sin(tc.y * 10.0 + time * 5.0) * 0.005 + 
                           sin(tc.y * 2.5 - time * 2.0) * 0.01;
    
    // Bottom tracking noise
    if (tc.y > 0.9) {
        trackingOffset += (hash11(vec2(tc.y * 100.0, time)) - 0.5) * 0.05;
    }
    tc.x += trackingOffset;

    // Chromatic aberration / Color bleed
    float bleed = 0.015;
    float r = texture2D(u_feedback_texture, tc + vec2(bleed, 0.0)).r;
    float g = texture2D(u_feedback_texture, tc + vec2(0.0, bleed * 0.5)).g;
    float b = texture2D(u_feedback_texture, tc - vec2(bleed, 0.0)).b;
    
    vec3 vhsColor = vec3(r, g, b);
    
    // Desaturate slightly and boost contrast
    float luma = dot(vhsColor, vec3(0.299, 0.587, 0.114));
    vhsColor = mix(vec3(luma), vhsColor, 0.8);
    vhsColor = smoothstep(0.1, 0.9, vhsColor);
    
    // Static noise
    float noise = hash11(uv * 500.0 + time * 10.0);
    vhsColor += (noise - 0.5) * 0.1;
    
    // Mix original color
    vec3 mixedH = mix(finalColor, vhsColor, 0.8);
    
    // Scanlines
    mixedH *= (0.9 + 0.1 * sin(uv.y * u_resolution.y * 1.5));
    
    return clamp(mixedH, 0.0, 1.0);
}

vec3 applyHologramEffect(vec3 finalColor, highp vec2 uv, float time) {
    // Holographic blue/cyan tint
    float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
    
    // Glitchy horizontal shifting
    float shift = sin(uv.y * 50.0 + time * 10.0) * 0.005;
    shift += sin(uv.y * 200.0 - time * 20.0) * 0.002;
    float r = texture2D(u_feedback_texture, uv + vec2(shift, 0.0)).r;
    float g = texture2D(u_feedback_texture, uv).g;
    float b = texture2D(u_feedback_texture, uv - vec2(shift, 0.0)).b;
    
    vec3 holoCol = vec3(r, g, max(b, r * 0.5 + g * 0.5)); // Boost blue
    
    // Tint
    holoCol = mix(holoCol, vec3(0.2, 0.7, 1.0) * luma, 0.5);
    holoCol = mix(finalColor, holoCol, 0.8);
    
    // Scanlines
    float scan = sin(uv.y * 400.0 - time * 10.0) * 0.5 + 0.5;
    holoCol *= mix(0.7, 1.0, scan);
    
    // Flicker
    float flicker = hash11(vec2(time, 0.0));
    holoCol *= mix(0.8, 1.1, flicker);
    
    // Phosphor glow
    holoCol += vec3(0.0, 0.1, 0.3) * (1.0 - luma);
    
    return clamp(holoCol, 0.0, 1.0);
}

vec3 applyVisualModeEffect(
    int mode,
    vec3 inputColor,
    highp vec2 screenUV, 
    highp vec2 resolution, 
    highp sampler2D feedbackTexture, 
    float effectiveTime
) {
    vec3 resultColor = inputColor; 

    
    if (mode == MODE_PIXELATE) {
        return resultColor; 
    }

    
    if (mode == MODE_GLOW) {
        
        vec3 blurredFeedback = textureBlur(feedbackTexture, screenUV, resolution, 5.0); 
        resultColor += blurredFeedback * 0.5 * length(inputColor); 
        
    } else if (mode == MODE_MOIRE) {
        
        vec2 moireOffset = vec2(0.005, 0.001);
        float moireScale = 1.01;
        highp vec2 moireUV = (screenUV - 0.5) * moireScale + 0.5 + moireOffset;
        
        if (moireUV.x > 0.0 && moireUV.x < 1.0 && moireUV.y > 0.0 && moireUV.y < 1.0) {
             vec3 moireSample = texture(feedbackTexture, moireUV).rgb;
             resultColor = mix(resultColor, moireSample, 0.5); 
        }
        
    } else if (mode == MODE_CARTOON) {
         
         resultColor = applyCartoonEffect(resultColor, screenUV, resolution);
         
    } else if (mode == MODE_HASHGRID) {
         
         highp vec2 fragCoord = screenUV * resolution; 
         resultColor = applyHashGridEffect(resultColor, fragCoord, effectiveTime);
         
    } else if (mode == MODE_ASCII) {
         
         highp vec2 fragCoord = screenUV * resolution; 
         resultColor = applyAsciiEffect(resultColor, fragCoord, effectiveTime);
         
    } else if (mode == MODE_CRT) {
         resultColor = applyCRTEffect(resultColor, screenUV, effectiveTime);
    } else if (mode == MODE_THERMAL) {
         resultColor = applyThermalEffect(resultColor);
    } else if (mode == MODE_GLITCH) {
         resultColor = applyGlitchEffect(resultColor, screenUV, effectiveTime);
    } else if (mode == MODE_VHS) {
         resultColor = applyVHSEffect(resultColor, screenUV, effectiveTime);
    } else if (mode == MODE_HOLOGRAM) {
         resultColor = applyHologramEffect(resultColor, screenUV, effectiveTime);
    }
    

    return clamp(resultColor, 0.0, 1.0); 
}

void main() {
    
    
    highp vec2 pixelSize = u_resolution / max(1.0, u_pixelationFactor); 
    highp vec2 pixelatedUV = floor(vUv * pixelSize + 0.5) / pixelSize;

    
    
    highp vec2 blendedUV = vUv; 
    bool fromIsPixelate = (u_visualModeFromIndex == MODE_PIXELATE);
    bool toIsPixelate = (u_visualModeToIndex == MODE_PIXELATE);

    if (fromIsPixelate && toIsPixelate) { 
        blendedUV = pixelatedUV;
    } else if (fromIsPixelate && !toIsPixelate) { 
        blendedUV = mix(pixelatedUV, vUv, u_visualModeBlend);
    } else if (!fromIsPixelate && toIsPixelate) { 
        blendedUV = mix(vUv, pixelatedUV, u_visualModeBlend);
    } 

    
    
    float baseBassLevel = getAudioBandLevel(0.0, BASS_END);
    float baseMidLevel = getAudioBandLevel(BASS_END, MID_END);
    float baseHighLevel = getAudioBandLevel(MID_END, 1.0);
    float baseOverallLevel = (baseBassLevel + baseMidLevel + baseHighLevel) / 3.0; 

    bool galleryFacePass = u_galleryFaceIndex >= 0.0;
    float animTime = u_integratedTime;
    float animDistortionScale = u_globalDistortionScale;
    if (galleryFacePass && u_galleryEdgeBlend > 0.0) {
        vec4 edgeWeights = vec4(
            1.0 - smoothstep(0.0, u_galleryEdgeBlend, vUv.x),
            1.0 - smoothstep(0.0, u_galleryEdgeBlend, 1.0 - vUv.x),
            1.0 - smoothstep(0.0, u_galleryEdgeBlend, vUv.y),
            1.0 - smoothstep(0.0, u_galleryEdgeBlend, 1.0 - vUv.y)
        );
        float totalW = 1.0;
        float timeSum = u_integratedTime;
        float distSum = u_globalDistortionScale;
        for (int i = 0; i < 4; i++) {
            float w = edgeWeights[i];
            if (w <= 0.001) continue;
            float neighborTime = (i == 0) ? u_galleryNeighborIntegratedTime.x
                : (i == 1) ? u_galleryNeighborIntegratedTime.y
                : (i == 2) ? u_galleryNeighborIntegratedTime.z
                : u_galleryNeighborIntegratedTime.w;
            float neighborDist = (i == 0) ? u_galleryNeighborDistortion.x
                : (i == 1) ? u_galleryNeighborDistortion.y
                : (i == 2) ? u_galleryNeighborDistortion.z
                : u_galleryNeighborDistortion.w;
            timeSum += neighborTime * w;
            distSum += neighborDist * w;
            totalW += w;
        }
        animTime = timeSum / totalW;
        animDistortionScale = distSum / totalW;
    }

    float beatPhase = fract(animTime * u_bpm / 60.0);
    float bpmPulse = (sin(beatPhase * TAU - PI * 0.5) * 0.5 + 0.5); 
    bpmPulse = pow(bpmPulse, 3.0); 

    float bassIntensityFactor = smoothstep(0.0, 0.6, baseBassLevel * u_globalAudioSensitivity); 
    bassIntensityFactor = pow(bassIntensityFactor, 1.5); 

    
    float zoomPulseAmount = mix(1.0, 0.95, bpmPulse * bassIntensityFactor * 0.5);

    highp vec2 base_uv_centered = (blendedUV - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y);

    highp vec2 uv = (base_uv_centered * zoomPulseAmount) / u_uvScale;

    highp vec2 mouseCentered = (u_mouse - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y);
    mouseCentered = (mouseCentered * zoomPulseAmount) / u_uvScale;

    bool mouseOnSphere = u_mouseMapping3D > 0.5;
    bool galleryMouse = galleryFacePass && u_mouseBrushActive > 0.5 && abs(u_galleryFaceIndex - u_mouseGalleryFace) < 0.5;

    highp vec2 mouseEffectCenter = mouseCentered;
    if (mouseOnSphere) {
        mouseEffectCenter = (u_mouse - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y);
        mouseEffectCenter = mouseEffectCenter / u_uvScale;
    } else if (galleryMouse) {
        mouseEffectCenter = (u_mouse - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y);
        mouseEffectCenter = (mouseEffectCenter * zoomPulseAmount) / u_uvScale;
    }

    
    float globalSens = u_globalAudioSensitivity;

    
    vec3 layerColorSum = vec3(0.0);
    float totalAlpha = 0.0;
    const float alphaThreshold = 0.01;

    for (int i = 0; i < 4; ++i) {
        LayerParams currentLayer = u_layers[i];

        
        bool basePatternInvisible = currentLayer.patternType == PATTERN_INVISIBLE;
        bool targetPatternInvisible = currentLayer.blendTargetType == PATTERN_INVISIBLE;
        float blendAmount = currentLayer.blendAmount;
        bool blendComplete = blendAmount <= 0.01 || blendAmount >= 0.99;

        
        if (basePatternInvisible && targetPatternInvisible) {
            continue;
        }
        
        if (basePatternInvisible && blendAmount <= 0.01) {
            continue;
        }
         
        if (targetPatternInvisible && blendAmount >= 0.99) {
            continue;
        }

        
        float layerSens = currentLayer.audioSensitivity * globalSens; 
        
        float layerBass = baseBassLevel * layerSens * currentLayer.bassSensitivity * 0.7; 
        float layerMid = baseMidLevel * layerSens * currentLayer.midSensitivity * 0.25;
        float layerHigh = baseHighLevel * layerSens * currentLayer.highSensitivity * 0.6;
        float layerOverall = baseOverallLevel * layerSens * 0.35;

        
        
        
        
        float midRotation = layerMid * 0.6 * 8.0; 
        float highJitter = sin(animTime * 15.0 + layerHigh * 10.0) * layerHigh * 0.8; 
        
        float bassWobble = cos(animTime * 1.2 + layerBass * 6.0) * layerBass * (1.5 + bassIntensityFactor * 1.0);
        float audioDrivenRotation = midRotation + highJitter + bassWobble;

        float mouseWeight = galleryFacePass && !galleryMouse
            ? 0.0
            : mouseOnSphere
            ? mouseInfluenceWeightSphere(blendedUV, u_mouseDir, u_mouseRadius * 0.38) * u_mouseSphereActive
            : galleryMouse
            ? mouseInfluenceWeightGallery(blendedUV, u_mouse, u_mouseBrushRadius)
            : u_mouseBrushActive > 0.5
            ? mouseInfluenceWeight(uv, mouseCentered, u_mouseBrushRadius)
            : 0.0;

        float symmetryAngleOffset = currentLayer.accumulatedSymmetryAngle + audioDrivenRotation;
        float modulatedSymmetry = currentLayer.symmetry + layerMid * 2.0 + u_mouseSymmetry * mouseWeight;
        
        
        highp vec2 sym_uv = applySymmetry(uv, modulatedSymmetry, symmetryAngleOffset, layerMid, layerHigh, animTime);

        float audioDistortionParam = layerBass * 0.3 + (layerMid * 0.5 + layerHigh) * 0.3 + u_beatStrength * 0.15; 
        float finalDistortionAmount = animDistortionScale + currentLayer.distortionStrength + audioDistortionParam + u_mouseDistortion * mouseWeight;
        highp vec2 dist_uv = complexDistortion(sym_uv, uv, finalDistortionAmount, animTime, layerBass, layerMid, layerHigh);
        if (mouseOnSphere) {
            highp vec2 equirect_uv = applySymmetry(blendedUV, modulatedSymmetry, symmetryAngleOffset, layerMid, layerHigh, animTime);
            equirect_uv = applyMouseTwistAttractEquirect(equirect_uv, u_mouse, mouseWeight, u_mouseAttract, u_mouseTwist, animTime);
            dist_uv = mix(dist_uv, (equirect_uv - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y) / u_uvScale, mouseWeight);
        } else if (galleryMouse) {
            dist_uv = applyMouseTwistAttract(dist_uv, mouseEffectCenter, mouseWeight, u_mouseAttract, u_mouseTwist, animTime);
        } else if (!galleryFacePass) {
            dist_uv = applyMouseTwistAttract(dist_uv, mouseEffectCenter, mouseWeight, u_mouseAttract, u_mouseTwist, animTime);
        }

        
        float pattern_base = 0.0;
        float pattern_target = 0.0;
        float pattern = 0.0;

        
        if (!basePatternInvisible && blendAmount < 0.99) {
            
            pattern_base = getPatternValue(currentLayer.patternType, i, currentLayer, uv, dist_uv, animTime, layerBass, layerMid, layerHigh, layerOverall);
        }

        
        if (!targetPatternInvisible && blendAmount > 0.01) {
            
            pattern_target = getPatternValue(currentLayer.blendTargetType, i, currentLayer, uv, dist_uv, animTime, layerBass, layerMid, layerHigh, layerOverall);
        }
        
        
        pattern = mix(pattern_base, pattern_target, blendAmount);

        
        
        vec3 layerColor = getColor(pattern, currentLayer, animTime, uv, layerBass, layerMid, layerHigh);
        
        
        float alpha = clamp(abs(pattern), 0.0, 1.0);
        if (alpha > alphaThreshold) {
            layerColorSum = layerColorSum * (1.0 - alpha) + layerColor * alpha;
            totalAlpha = totalAlpha * (1.0 - alpha) + alpha; 
        }
    }
    
    vec3 blendedColor = (totalAlpha > 0.0) ? layerColorSum / totalAlpha : vec3(0.0);
    
    blendedColor = (totalAlpha <= 0.0 && length(layerColorSum) > 0.0) ? layerColorSum : blendedColor;
    blendedColor = clamp(blendedColor, 0.0, 1.0);

    
    
    vec3 feedbackColor = texture(u_feedback_texture, blendedUV).rgb;

    
    highp float effectiveTime = u_time * u_globalTimeScale;

    
    
    vec3 processedColorFrom = applyVisualModeEffect(
        u_visualModeFromIndex, blendedColor, vUv, u_resolution, u_feedback_texture, effectiveTime
    );

    
    vec3 processedColorTo = applyVisualModeEffect(
        u_visualModeToIndex, blendedColor, vUv, u_resolution, u_feedback_texture, effectiveTime
    );

    
    vec3 processedColorBlended = mix(processedColorFrom, processedColorTo, u_visualModeBlend);

    
    
    float dynamicFeedbackMix = u_feedback_mix + bassIntensityFactor * 0.08; 
    dynamicFeedbackMix = clamp(dynamicFeedbackMix, 0.0, 0.98); 
    vec3 currentFrameFinalColor = mix(processedColorBlended, feedbackColor, dynamicFeedbackMix);

    
    if (bassIntensityFactor > 0.1) { 
        vec3 hslColor = rgb2hsl(currentFrameFinalColor);
        float saturationBoost = bassIntensityFactor * 0.15; 
        hslColor.y = clamp(hslColor.y + saturationBoost, 0.0, 1.0);
        currentFrameFinalColor = hsl2rgb(hslColor);
    }
    
    
    currentFrameFinalColor = clamp(currentFrameFinalColor, 0.0, 1.0);
    gl_FragColor = vec4(currentFrameFinalColor, 1.0);
}