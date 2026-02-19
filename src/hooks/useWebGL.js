/**
 * WebGL / Three.js hook: scene, renderer, shaders, feedback, audio texture.
 */
import * as THREE from 'three';
import React from 'react';

var yL = `varying vec2 vUv;

void main() {\r
  vUv = uv;\r
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}`,
    SL = `precision mediump float; 

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

const int MODE_NORMAL = 0;
const int MODE_GLOW = 1;
const int MODE_EDGEDETECT = 2;
const int MODE_PIXELATE = 3;
const int MODE_MOIRE = 4;

const int MODE_CARTOON = 5;
const int MODE_HASHGRID = 6;
const int MODE_ASCII = 7;
const int MODE_STAINED_GLASS = 8; 

const int COLOR_MODE_RAINBOW = 0;
const int COLOR_MODE_FIRE = 1;
const int COLOR_MODE_ICE = 2;
const int COLOR_MODE_MONOCHROME = 3;

const int COLOR_MODE_AUDIO_RGB = 4;

const int COLOR_MODE_SPECTRUM = 5;
const int COLOR_MODE_REACTIVE_PULSE = 6;
const int COLOR_MODE_VELOCITY = 7;

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

highp vec2 applySymmetry(highp vec2 p, float n, float angleOffset, float mid, float high, float integratedTime) { 
    
    
    float audioSymmetryMod = 1.0 + sin(integratedTime * 0.5 + mid * PI) * 0.02 * mid + cos(integratedTime * 0.8 - high * PI) * 0.03 * high;
    float effectiveN = n * audioSymmetryMod;

    if (effectiveN <= 1.001) { 
        return p;
    }
    float radius = length(p);
    if (radius < 0.0001) return vec2(0.0);

    highp vec2 p_norm = p / radius;
    highp vec2 rotation_offset = vec2(cos(angleOffset), sin(angleOffset));
    highp vec2 p_norm_offset = complex_mult(p_norm, rotation_offset);

    
    
    float angle = atan(p_norm_offset.y, p_norm_offset.x);

    
    float new_angle = angle * effectiveN; 

    
    highp vec2 final_norm = vec2(cos(new_angle), sin(new_angle));

    
    return final_norm * radius;
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
    
    float tl = texture(tex, uv + vec2(-pixelSize.x, -pixelSize.y)).r;
    float t  = texture(tex, uv + vec2( 0.0,       -pixelSize.y)).r;
    float tr = texture(tex, uv + vec2( pixelSize.x, -pixelSize.y)).r;
    float l  = texture(tex, uv + vec2(-pixelSize.x,  0.0)).r;
    float r  = texture(tex, uv + vec2( pixelSize.x,  0.0)).r;
    float bl = texture(tex, uv + vec2(-pixelSize.x,  pixelSize.y)).r;
    float b  = texture(tex, uv + vec2( 0.0,        pixelSize.y)).r;
    float br = texture(tex, uv + vec2( pixelSize.x,  pixelSize.y)).r;
    float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
    float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
    return length(vec2(gx, gy));
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
    
    
    float baseDensity = mix(20.0, 4.0, smoothstep(0.1, 1.5, cubeSize));
    float gridDensity = baseDensity * (1.0 + bass * 0.5 - high * 0.3);
    gridDensity = max(1.0, gridDensity); 

    highp vec2 gridUv = sym_uv * gridDensity;
    highp vec2 cellId = floor(gridUv);
    highp vec2 localUv = fract(gridUv) - 0.5;

    
    float cellHash = hash11(cellId);
    float rotationSpeedFactor = 0.5 + cellHash * 1.5 + mid * 2.0; 
    float audioRotationOffset = high * 1.5 * PI; 
    float angle = accumulatedCubeTime * rotationSpeedFactor + cellHash * TAU + audioRotationOffset;
    mat2 rotMat = rotate(-angle);
    highp vec2 rotatedLocalUv = rotMat * localUv;

    
    
    float baseHalfSize = mix(0.1, 0.45, smoothstep(0.1, 1.5, cubeSize));
    float squareHalfSize = baseHalfSize * (1.0 - bass * 0.4 + high * 0.2);
    squareHalfSize = clamp(squareHalfSize, 0.01, 0.49); 

    float d = max(abs(rotatedLocalUv.x), abs(rotatedLocalUv.y)) - squareHalfSize;

    
    
    float edgeWidth = (0.02 / gridDensity) * (1.0 + mid * 1.5 - bass * 0.8);
    edgeWidth = max(0.001, edgeWidth);
    float squareFill = smoothstep(edgeWidth, -edgeWidth, d);

    
    squareFill *= (0.8 + overallAudio * 0.4);

    return clamp(squareFill, 0.0, 1.0);
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
    }
    return 0.0;
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
        
        
        float beatMod = 1.0 + u_beatStrength * 0.5;
        float bass_amp = bass * 5.0 * beatMod;
        float mid_amp = mid * 4.0 * beatMod;
        float high_amp = high * 6.0 * beatMod;
        
        return clamp(vec3(bass_amp, mid_amp, high_amp) * patternValue * 1.5, 0.0, 1.0);
    } else if (modeIndex == COLOR_MODE_SPECTRUM) {
        
        
        float r = bass * 6.0; 
        float g = mid * 5.0;  
        float b = high * 7.0; 
        
        return clamp(vec3(r, g, b) * (patternValue * 0.8 + 0.2), 0.0, 1.0);
    } else if (modeIndex == COLOR_MODE_REACTIVE_PULSE) {
        
        
        vec3 baseColor = vec3(patternValue * 0.8 + 0.1); 
        
        float pulseSpeed = 5.0 + mid * 10.0; 
        float pulseIntensity = bass * 2.5;   
        float pulse = (sin(integratedTime * pulseSpeed + patternValue * PI) * 0.5 + 0.5) * pulseIntensity;
        
        vec3 pulseColor = vec3(1.0, 0.95, 0.9); 
        return clamp(mix(baseColor, pulseColor, clamp(pulse, 0.0, 1.0)), 0.0, 1.0);
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
    float lineThickness = 0.48; 
    float edgeSoftness = 0.02;  

    
    highp vec2 screenUV = screenCoord / u_resolution;
    vec3 feedbackColor = texture2D(u_feedback_texture, screenUV).rgb;
    float luma = dot(feedbackColor, vec3(0.299, 0.587, 0.114)); 

    
    float angle1 = PI / 4.0;
    float hashSpacing1 = mix(8.0, 2.5, luma * luma); 
    highp vec2 rotatedUv1 = (screenCoord.xy * rotate(angle1)) / hashSpacing1;
    float hashLines1 = 1.0 - smoothstep(lineThickness - edgeSoftness, lineThickness + edgeSoftness, abs(mod(rotatedUv1.x + rotatedUv1.y * 0.1, 1.0) - 0.5) * 2.0);
    
    
    float angle2 = -PI / 4.0;
    float hashSpacing2 = mix(7.5, 2.8, luma * luma); 
    highp vec2 rotatedUv2 = (screenCoord.xy * rotate(angle2)) / hashSpacing2;
    float hashLines2 = 1.0 - smoothstep(lineThickness - edgeSoftness, lineThickness + edgeSoftness, abs(mod(rotatedUv2.x - rotatedUv2.y * 0.1 + 0.5, 1.0) - 0.5) * 2.0);
    
    
    float combinedLines = 0.0;
    float crossHatchThreshold = 0.5; 
    combinedLines += hashLines1; 
    combinedLines += hashLines2 * smoothstep(crossHatchThreshold - 0.1, crossHatchThreshold + 0.1, luma);
    float finalPattern = 1.0 - clamp(combinedLines, 0.0, 1.0);
    
    
    return finalColor * finalPattern;
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
    float voronoiScale = 6.0;        
    float edgeWidth = 0.04;         
    float edgeSoftness = 0.015;      
    

    
    
    highp vec2 scaled_uv = uv * voronoiScale;
    highp vec2 vdist = voronoi(scaled_uv, time * 0.05, 0.0, 0.0); 

    
    float edgeFactor = smoothstep(edgeWidth - edgeSoftness, edgeWidth + edgeSoftness, vdist.y - vdist.x);

    
    float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));

    
    
    float brightnessFactor = 1.0 + pow(luma, 2.0) * 1.8; 
    float saturationFactor = 1.0 + luma * 0.2; 

    vec3 hslColor = rgb2hsl(finalColor);
    hslColor.y = clamp(hslColor.y * saturationFactor, 0.0, 1.0); 
    hslColor.z = clamp(hslColor.z * brightnessFactor, 0.0, 1.0); 
    vec3 enhancedColor = hsl2rgb(hslColor);

    
    
    vec3 colorWithEdges = mix(vec3(0.0), enhancedColor, edgeFactor);

    return colorWithEdges;
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
        
    } else if (mode == MODE_EDGEDETECT) {
        
        float edge = sobelEdgeDetect(feedbackTexture, screenUV, resolution);
        resultColor *= edge; 
        
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
         
    } else if (mode == MODE_STAINED_GLASS) {
         
         resultColor = applyStainedGlassEffect(resultColor, screenUV, effectiveTime);
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

    
    highp vec2 base_uv_centered = (blendedUV - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y);
    
    
    

    
    
    float baseBassLevel = getAudioBandLevel(0.0, BASS_END);
    float baseMidLevel = getAudioBandLevel(BASS_END, MID_END);
    float baseHighLevel = getAudioBandLevel(MID_END, 1.0);
    float baseOverallLevel = (baseBassLevel + baseMidLevel + baseHighLevel) / 3.0; 

    
    float beatPhase = fract(u_integratedTime * u_bpm / 60.0); 
    float bpmPulse = (sin(beatPhase * TAU - PI * 0.5) * 0.5 + 0.5); 
    bpmPulse = pow(bpmPulse, 3.0); 

    float bassIntensityFactor = smoothstep(0.0, 0.6, baseBassLevel * u_globalAudioSensitivity); 
    bassIntensityFactor = pow(bassIntensityFactor, 1.5); 

    
    float zoomPulseAmount = mix(1.0, 0.95, bpmPulse * bassIntensityFactor * 0.5); 
    highp vec2 uv = (base_uv_centered * zoomPulseAmount) / u_uvScale; 

    
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
        float highJitter = sin(u_integratedTime * 15.0 + layerHigh * 10.0) * layerHigh * 0.8; 
        
        float bassWobble = cos(u_integratedTime * 1.2 + layerBass * 6.0) * layerBass * (1.5 + bassIntensityFactor * 1.0); 
        float audioDrivenRotation = midRotation + highJitter + bassWobble;

        float symmetryAngleOffset = currentLayer.accumulatedSymmetryAngle + audioDrivenRotation;
        float modulatedSymmetry = currentLayer.symmetry + layerMid * 2.0; 
        
        
        highp vec2 sym_uv = applySymmetry(uv, modulatedSymmetry, symmetryAngleOffset, layerMid, layerHigh, u_integratedTime);

        float audioDistortionParam = layerBass * 0.3 + (layerMid * 0.5 + layerHigh) * 0.3 + u_beatStrength * 0.15; 
        float finalDistortionAmount = u_globalDistortionScale + currentLayer.distortionStrength + audioDistortionParam;
        highp vec2 dist_uv = complexDistortion(sym_uv, uv, finalDistortionAmount, u_integratedTime, layerBass, layerMid, layerHigh);

        
        float pattern_base = 0.0;
        float pattern_target = 0.0;
        float pattern = 0.0;

        
        if (!basePatternInvisible && blendAmount < 0.99) {
            
            pattern_base = getPatternValue(currentLayer.patternType, i, currentLayer, uv, dist_uv, u_integratedTime, layerBass, layerMid, layerHigh, layerOverall);
        }

        
        if (!targetPatternInvisible && blendAmount > 0.01) {
            
            pattern_target = getPatternValue(currentLayer.blendTargetType, i, currentLayer, uv, dist_uv, u_integratedTime, layerBass, layerMid, layerHigh, layerOverall);
        }
        
        
        pattern = mix(pattern_base, pattern_target, blendAmount);

        
        
        vec3 layerColor = getColor(pattern, currentLayer, u_integratedTime, uv, layerBass, layerMid, layerHigh);
        
        
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
}`,
    xL = `varying vec2 vUv;\r
void main() {\r
  vUv = uv;\r
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\r
}`,
    ML = `varying vec2 vUv;
uniform sampler2D u_textureA; 
uniform sampler2D u_textureB; 
uniform float u_blendFactor;  

void main() {
  vec3 colorA = texture2D(u_textureA, vUv).rgb;
  vec3 colorB = texture2D(u_textureB, vUv).rgb;
  vec3 blendedColor = mix(colorA, colorB, u_blendFactor);
  gl_FragColor = vec4(blendedColor, 1.0);
}`;
const ld = {
        normal: 0,
        glow: 1,
        edgeDetect: 2,
        pixelate: 3,
        moire: 4,
        cartoon: 5,
        hashGrid: 6,
        ascii: 7
    },
    In = {
        rainbow: 0,
        fire: 1,
        ice: 2,
        audioRGB: 4,
        monochrome: 3,
        spectrum: 5,
        reactivePulse: 6,
        velocity: 7
    };

function EL() {
    const e = new Uint8Array(1024);
    for (let r = 0; r < 256; r++) {
        const o = r / 255 * 360,
            s = 1,
            a = s * (1 - Math.abs(TL(o / 60, 2) - 1)),
            l = .5 - s / 2;
        let c = 0,
            f = 0,
            d = 0;
        o >= 0 && o < 60 ? (c = s, f = a) : o >= 60 && o < 120 ? (c = a, f = s) : o >= 120 && o < 180 ? (f = s, d = a) : o >= 180 && o < 240 ? (f = a, d = s) : o >= 240 && o < 300 ? (c = a, d = s) : (c = s, d = a), e[r * 4 + 0] = Math.round((c + l) * 255), e[r * 4 + 1] = Math.round((f + l) * 255), e[r * 4 + 2] = Math.round((d + l) * 255), e[r * 4 + 3] = 255
    }
    const n = new THREE.DataTexture(e, 256, 1, THREE.RGBAFormat);
    return n.minFilter = THREE.LinearFilter, n.magFilter = THREE.LinearFilter, n.wrapS = THREE.ClampToEdgeWrapping, n.wrapT = THREE.ClampToEdgeWrapping, n.needsUpdate = !0, n
}

function TL(t, e) {
    return Number((t - Math.floor(t / e) * e).toPrecision(8))
}

function ms(t, e, n) {
    return t * (1 - n) + e * n
}
export function useWebGL(t, e, n, r, i, o, s, a, l, c, f, d, h, p, g) {
        var Be, we;
        const y = () => {
                const ge = new Uint8Array(1024),
                    X = [{
                        t: 0,
                        color: [0, 0, 0]
                    }, {
                        t: .2,
                        color: [100, 0, 0]
                    }, {
                        t: .5,
                        color: [255, 100, 0]
                    }, {
                        t: .8,
                        color: [255, 255, 50]
                    }, {
                        t: 1,
                        color: [255, 255, 255]
                    }];
                for (let Me = 0; Me < 256; Me++) {
                    const et = Me / 255;
                    let le = 0,
                        C = 0,
                        re = 0;
                    for (let te = 0; te < X.length - 1; te++)
                        if (et >= X[te].t && et <= X[te + 1].t) {
                            const Ae = (et - X[te].t) / (X[te + 1].t - X[te].t);
                            le = ms(X[te].color[0], X[te + 1].color[0], Ae), C = ms(X[te].color[1], X[te + 1].color[1], Ae), re = ms(X[te].color[2], X[te + 1].color[2], Ae);
                            break
                        } ge[Me * 4 + 0] = Math.round(le), ge[Me * 4 + 1] = Math.round(C), ge[Me * 4 + 2] = Math.round(re), ge[Me * 4 + 3] = 255
                }
                const ve = new THREE.DataTexture(ge, 256, 1, THREE.RGBAFormat);
                return ve.minFilter = THREE.LinearFilter, ve.magFilter = THREE.LinearFilter, ve.wrapS = THREE.ClampToEdgeWrapping, ve.wrapT = THREE.ClampToEdgeWrapping, ve.needsUpdate = !0, ve
            },
            m = () => {
                const ge = new Uint8Array(1024),
                    X = [{
                        t: 0,
                        color: [0, 0, 50]
                    }, {
                        t: .3,
                        color: [0, 50, 150]
                    }, {
                        t: .6,
                        color: [100, 150, 255]
                    }, {
                        t: .8,
                        color: [200, 220, 255]
                    }, {
                        t: 1,
                        color: [255, 255, 255]
                    }];
                for (let Me = 0; Me < 256; Me++) {
                    const et = Me / 255;
                    let le = 0,
                        C = 0,
                        re = 0;
                    for (let te = 0; te < X.length - 1; te++)
                        if (et >= X[te].t && et <= X[te + 1].t) {
                            const Ae = (et - X[te].t) / (X[te + 1].t - X[te].t);
                            le = ms(X[te].color[0], X[te + 1].color[0], Ae), C = ms(X[te].color[1], X[te + 1].color[1], Ae), re = ms(X[te].color[2], X[te + 1].color[2], Ae);
                            break
                        } ge[Me * 4 + 0] = Math.round(le), ge[Me * 4 + 1] = Math.round(C), ge[Me * 4 + 2] = Math.round(re), ge[Me * 4 + 3] = 255
                }
                const ve = new THREE.DataTexture(ge, 256, 1, THREE.RGBAFormat);
                return ve.minFilter = THREE.LinearFilter, ve.magFilter = THREE.LinearFilter, ve.wrapS = THREE.ClampToEdgeWrapping, ve.wrapT = THREE.ClampToEdgeWrapping, ve.needsUpdate = !0, ve
            },
            u = React.useRef(e),
            _ = React.useRef(n),
            v = React.useRef(r),
            M = React.useRef(i),
            R = React.useRef(o),
            A = React.useRef(s),
            w = React.useRef(e.asciiCharSize),
            L = React.useRef(a || {}),
            E = React.useRef(null),
            S = React.useRef(null),
            F = React.useRef(null),
            q = React.useRef(null),
            O = React.useRef(null),
            ee = React.useRef(null),
            Q = React.useRef(((Be = c == null ? void 0 : c.freqData) == null ? void 0 : Be.length) || 128),
            oe = React.useRef(null),
            ie = React.useRef(null),
            I = React.useRef(0),
            j = React.useRef(null),
            $ = React.useRef(null),
            fe = React.useRef(null),
            Le = React.useRef(l),
            Ue = React.useRef(d),
            G = React.useRef(h),
            se = React.useRef(p),
            ye = React.useRef(g),
            pe = React.useRef(Array(4).fill(null).map(() => ({
                isBlending: !1,
                previousPatternType: 0,
                targetPatternType: 0,
                originalBlendTargetType: 0,
                originalBlendAmount: 0,
                blendStartTime: 0
            }))),
            je = React.useRef(Array(4).fill(null).map(() => ({
                turing: 0,
                spiralNoise: 0,
                flow: 0,
                cube: 0,
                smoothSpiral: 0
            }))),
            Je = React.useRef([0, 0, 0, 0]),
            st = React.useRef(0),
            U = React.useRef(performance.now()),
            Ye = React.useRef(0),
            Ie = React.useRef(null),
            vt = React.useRef(null),
            He = React.useRef(!0),
            ht = React.useRef(null),
            b = React.useRef(null),
            x = React.useRef(null),
            D = React.useRef(null),
            B = React.useRef(null),
            Y = React.useRef(null),
            Z = React.useRef(e.visualModeFromIndex ?? 0),
            xe = React.useRef(e.visualModeToIndex ?? 0),
            ae = React.useRef(e.visualModeBlend ?? 1),
            De = React.useRef(null);
        React.useRef(0);
        const ke = React.useRef(0);
        React.useRef(0);
        const de = React.useRef(0);
        React.useRef(0), React.useRef(0);
        const he = React.useCallback(W => {
            var jn;
            if (!E.current || !O.current || !S.current || !F.current || !oe.current || !ie.current || !Ie.current || !vt.current || !ht.current || !b.current || !D.current || !B.current || !Y.current) {
                console.error("WebGL context lost or not initialized in animate."), ee.current && cancelAnimationFrame(ee.current);
                return
            }
            const ge = performance.now(),
                X = O.current.uniforms;
            if (!X) {
                console.error("Uniforms not found in material."), ee.current && cancelAnimationFrame(ee.current);
                return
            }
            const ve = (ge - U.current) / 1e3,
                Me = Ue.current > 0 ? Ue.current : 120,
                et = THREE.MathUtils.clamp(Me / 120, .75, 4),
                le = (u.current.globalTimeScale ?? 1) * et;
            st.current += ve * le, U.current = ge;
            const C = ((jn = u.current) == null ? void 0 : jn.rainbowAnimationSpeed) ?? 0,
                re = ve * C * .1;
            let te = (Ye.current + re) % 1;
            Ye.current = te < 0 ? te + 1 : te;
            const Ae = [u.current.layer1, u.current.layer2, u.current.layer3, u.current.layer4];
            for (let yt = 0; yt < 4; ++yt) {
                const Nt = Ae[yt];
                if (!Nt) continue;
                const it = je.current[yt],
                    ce = Nt.layerSymmetryOffsetSpeed ?? 0;
                it.turing += ve * (Nt.turingSpeed ?? 0) * le, it.spiralNoise += ve * (Nt.spiralNoiseSpeed ?? 0) * le, it.flow += ve * (Nt.flowSpeed ?? 0) * le;
                const pr = .2 + (Nt.cubeRotationSpeed ?? 0);
                it.cube += ve * pr * le, it.smoothSpiral += ve * (Nt.smoothSpiralSpeed ?? 0) * le, Je.current[yt] += ve * ce * le
            }
            X.u_time.value = ge / 1e3, X.u_integratedTime.value = st.current, X.u_rainbowPhase.value = Ye.current, X.hasOwnProperty("u_visualModeFromIndex") && (X.u_visualModeFromIndex.value = Z.current), X.hasOwnProperty("u_visualModeToIndex") && (X.u_visualModeToIndex.value = xe.current), X.hasOwnProperty("u_visualModeBlend") && (X.u_visualModeBlend.value = ae.current), X.u_globalTimeScale.value !== u.current.globalTimeScale && (X.u_globalTimeScale.value = u.current.globalTimeScale), X.u_globalDistortionScale.value !== u.current.globalDistortionScale && (X.u_globalDistortionScale.value = u.current.globalDistortionScale), X.u_globalSymmetryOffsetSpeed.value !== u.current.globalSymmetryOffsetSpeed && (X.u_globalSymmetryOffsetSpeed.value = u.current.globalSymmetryOffsetSpeed), X.u_uvScale.value !== u.current.uvScale && (X.u_uvScale.value = u.current.uvScale), X.u_globalAudioSensitivity.value !== u.current.globalAudioSensitivity && (X.u_globalAudioSensitivity.value = u.current.globalAudioSensitivity), X.u_feedback_mix.value !== u.current.feedbackMix && (X.u_feedback_mix.value = u.current.feedbackMix), X.u_rainbowAnimationSpeed.value !== u.current.rainbowAnimationSpeed && (X.u_rainbowAnimationSpeed.value = u.current.rainbowAnimationSpeed);
            const Se = w.current;
            X.u_asciiCharSize.value !== Se && (X.u_asciiCharSize.value = Se);
            const _t = M.current;
            X.u_pixelationFactor.value !== _t && (X.u_pixelationFactor.value = _t);
            const Mt = In[R.current] ?? 0,
                wt = A.current;
            X.u_globalColorMode.value !== Mt && (X.u_globalColorMode.value = Mt), X.u_forceGlobalColor.value !== wt && (X.u_forceGlobalColor.value = wt);
            const qt = Ue.current,
                mt = G.current ? 1 : 0,
                Dt = se.current ? 1 : 0;
            X.u_bpm.value !== qt && (X.u_bpm.value = qt), X.u_isBassPresent.value !== mt && (X.u_isBassPresent.value = mt), X.u_isDrumsPresent.value !== Dt && (X.u_isDrumsPresent.value = Dt), X.u_accumulatedTimes && (X.u_accumulatedTimes.value = je.current);
            const Lt = L.current;
            Lt || console.error("patternNameToIndex map is not available in animate!");
            const Zt = X.u_layers.value;
            if (Zt && Lt)
                for (let yt = 0; yt < 4; yt++) {
                    const Nt = `layer${yt+1}`,
                        it = u.current[Nt],
                        ce = Zt[yt];
                    if (!it || !ce) continue;
                    const pr = Lt[it.patternType] ?? 0;
                    ce.hasOwnProperty("patternType") && ce.patternType !== pr && (ce.patternType = pr);
                    const T = Lt[it.blendTargetType] ?? 0;
                    ce.hasOwnProperty("blendTargetType") && ce.blendTargetType !== T && (ce.blendTargetType = T);
                    const N = it.blendAmount ?? 0;
                    ce.hasOwnProperty("blendAmount") && ce.blendAmount !== N && (ce.blendAmount = N);
                    const V = it.symmetry ?? 1;
                    ce.hasOwnProperty("symmetry") && ce.symmetry !== V && (ce.symmetry = V);
                    const H = it.distortionStrength ?? 0;
                    ce.hasOwnProperty("distortionStrength") && ce.distortionStrength !== H && (ce.distortionStrength = H);
                    const k = In[it.colorMode] ?? 0;
                    ce.hasOwnProperty("colorMode") && ce.colorMode !== k && (ce.colorMode = k);
                    const _e = In[it.blendTargetColorMode] ?? k;
                    ce.hasOwnProperty("blendTargetColorMode") && ce.blendTargetColorMode !== _e && (ce.blendTargetColorMode = _e);
                    const Ne = it.freq ?? it.layer2Freq ?? 10;
                    ce.hasOwnProperty("freq") && ce.freq !== Ne && (ce.freq = Ne);
                    const Ve = it.weaveThickness ?? .02;
                    ce.hasOwnProperty("weaveThickness") && ce.weaveThickness !== Ve && (ce.weaveThickness = Ve);
                    const We = it.turingScale ?? 15;
                    ce.hasOwnProperty("turingScale") && ce.turingScale !== We && (ce.turingScale = We);
                    const Ze = it.turingSpeed ?? .5;
                    ce.hasOwnProperty("turingSpeed") && ce.turingSpeed !== Ze && (ce.turingSpeed = Ze);
                    const Ke = it.turingFeed ?? .035;
                    ce.hasOwnProperty("turingFeed") && ce.turingFeed !== Ke && (ce.turingFeed = Ke);
                    const Xe = it.turingKill ?? .065;
                    ce.hasOwnProperty("turingKill") && ce.turingKill !== Xe && (ce.turingKill = Xe);
                    const Ft = it.turingDiffusionA ?? 1;
                    ce.hasOwnProperty("turingDiffusionA") && ce.turingDiffusionA !== Ft && (ce.turingDiffusionA = Ft);
                    const Qt = it.turingDiffusionB ?? .5;
                    ce.hasOwnProperty("turingDiffusionB") && ce.turingDiffusionB !== Qt && (ce.turingDiffusionB = Qt);
                    const Ht = it.voronoiScale ?? 5;
                    ce.hasOwnProperty("voronoiScale") && ce.voronoiScale !== Ht && (ce.voronoiScale = Ht);
                    const Sn = it.voronoiEdgeWidth ?? .02;
                    ce.hasOwnProperty("voronoiEdgeWidth") && ce.voronoiEdgeWidth !== Sn && (ce.voronoiEdgeWidth = Sn);
                    const At = it.spiralArms ?? 5;
                    ce.hasOwnProperty("spiralArms") && ce.spiralArms !== At && (ce.spiralArms = At);
                    const K = it.spiralTightness ?? .5;
                    ce.hasOwnProperty("spiralTightness") && ce.spiralTightness !== K && (ce.spiralTightness = K);
                    const ze = it.spiralNoiseScale ?? 1;
                    ce.hasOwnProperty("spiralNoiseScale") && ce.spiralNoiseScale !== ze && (ce.spiralNoiseScale = ze);
                    const be = it.spiralNoiseSpeed ?? .1;
                    ce.hasOwnProperty("spiralNoiseSpeed") && ce.spiralNoiseSpeed !== be && (ce.spiralNoiseSpeed = be);
                    const $e = it.audioSensitivity ?? 1;
                    ce.hasOwnProperty("audioSensitivity") && ce.audioSensitivity !== $e && (ce.audioSensitivity = $e);
                    const at = it.bassSensitivity ?? 1;
                    ce.hasOwnProperty("bassSensitivity") && ce.bassSensitivity !== at && (ce.bassSensitivity = at);
                    const tt = it.midSensitivity ?? 1;
                    ce.hasOwnProperty("midSensitivity") && ce.midSensitivity !== tt && (ce.midSensitivity = tt);
                    const qe = it.highSensitivity ?? 1;
                    ce.hasOwnProperty("highSensitivity") && ce.highSensitivity !== qe && (ce.highSensitivity = qe);
                    const nt = it.flowComplexity ?? .6;
                    ce.hasOwnProperty("flowComplexity") && ce.flowComplexity !== nt && (ce.flowComplexity = nt);
                    const gt = it.cubeSize ?? .5;
                    ce.hasOwnProperty("cubeSize") && ce.cubeSize !== gt && (ce.cubeSize = gt);
                    const dt = it.flowCurl ?? .4;
                    ce.hasOwnProperty("flowCurl") && ce.flowCurl !== dt && (ce.flowCurl = dt);
                    const Re = it.layerSymmetryOffsetSpeed ?? 0;
                    ce.hasOwnProperty("layerSymmetryOffsetSpeed") && ce.layerSymmetryOffsetSpeed !== Re && (ce.layerSymmetryOffsetSpeed = Re), ce.hasOwnProperty("accumulatedSymmetryAngle") && (ce.accumulatedSymmetryAngle = Je.current[yt])
                } else console.error("u_layers uniform not found or pattern map missing!");
            const oi = I.current === 0 ? oe.current : ie.current,
                Vr = I.current === 0 ? ie.current : oe.current;
            X.u_feedback_texture.value = oi.texture, E.current.setRenderTarget(Vr), E.current.clear(), E.current.render(S.current, F.current), I.current = 1 - I.current;
            const si = Vr.texture,
                rr = He.current ? vt.current : Ie.current,
                ln = He.current ? Ie.current : vt.current;
            if (B.current && B.current.uniforms) {
                const yt = B.current.uniforms;
                yt.u_textureA.value = rr.texture, yt.u_textureB.value = si;
                const Nt = 1;
                yt.u_blendFactor && yt.u_blendFactor.value !== Nt && (yt.u_blendFactor.value = Nt)
            } else B.current && console.error("Blend material exists, but its uniforms are missing in animate loop.");
            if (E.current.setRenderTarget(ln), E.current.clear(), E.current.render(D.current, F.current), E.current.setRenderTarget(null), E.current.clear(), b.current && (b.current.map = ln.texture), E.current.render(ht.current, F.current), He.current = !He.current, O.current && O.current.uniforms) {
                const yt = O.current.uniforms;
                yt.hasOwnProperty("u_beatStrength") && yt.u_beatStrength.value !== ke.current && (yt.u_beatStrength.value = ke.current), yt.hasOwnProperty("u_spectralCentroid") && yt.u_spectralCentroid.value !== de.current && (yt.u_spectralCentroid.value = de.current)
            }
        }, [c]);
        return React.useEffect(() => {
            var Me;
            u.current = e, _.current = n, M.current = e.pixelationFactor, w.current = e.asciiCharSize, R.current = o, A.current = s, L.current = a || {}, Le.current = l, Ue.current = d, G.current = h, se.current = p, ye.current = g;
            const W = v.current,
                ge = r,
                X = e.visualModeBlend ?? 1;
            Z.current = e.visualModeFromIndex ?? ld[W] ?? 0, xe.current = e.visualModeToIndex ?? ld[W] ?? 0, ae.current = X, v.current = ge;
            const ve = (Me = c == null ? void 0 : c.freqData) == null ? void 0 : Me.length;
            ve && ve !== Q.current && (Q.current = ve, De.current = null, O.current && O.current.uniforms.u_frequency_bin_count && (O.current.uniforms.u_frequency_bin_count.value = ve))
        }, [e, n, r, o, s, a, l, d, h, p, g, c]), React.useEffect(() => {
            var rr, ln, jn, yt, Nt, it, ce, pr, T, N, V, H, k, _e, Ne, Ve, We, Ze, Ke, Xe, Ft, Qt, Ht, Sn, At, K, ze, be, $e, at, tt, qe, nt, gt, dt, Re, Ge, Ct, Ee, bt, Ut, Wt, Rt, Xn, bn, da, ha, pa, ma, ga, va, _a, lt, kt, gn, Jt, wn, It, ai, mo, Ot, Hr, Gr, Wr, ya, Sa, Li, go, vo, jl, Xl, bp, wp, Ap, Cp, Rp, Pp, Lp, Ip, Op, Dp, Np, Fp, Up, kp, zp, Bp, Vp, Hp, Gp, Wp, jp, Xp, $p, qp, Yp, Kp, Zp, Qp, Jp, em, tm, nm, rm, im, om, sm, am, lm, cm, um, fm, dm, hm, pm, mm, gm, vm, _m, ym;
            if (!t.current) return;
            const W = t.current,
                ge = W.clientWidth,
                X = W.clientHeight,
                ve = new THREE.WebGLRenderer({
                    antialias: !0
                });
            ve.setSize(ge, X), ve.setPixelRatio(window.devicePixelRatio), ve.autoClear = !1, W.appendChild(ve.domElement), E.current = ve;
            const Me = new THREE.Scene;
            S.current = Me;
            const et = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
            et.position.z = 1, F.current = et, Q.current = ((rr = c == null ? void 0 : c.freqData) == null ? void 0 : rr.length) || 128;
            const le = Q.current,
                C = (c == null ? void 0 : c.freqData) || new Uint8Array(le).fill(0);
            if (!f.current) {
                const An = new THREE.DataTexture(C, le, 1, THREE.RedFormat, THREE.UnsignedByteType);
                An.needsUpdate = !0, f.current = An
            }
            const re = {
                format: THREE.RGBAFormat,
                type: THREE.HalfFloatType,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                stencilBuffer: !1
            };
            oe.current = new THREE.WebGLRenderTarget(ge, X, re), ie.current = new THREE.WebGLRenderTarget(ge, X, re), Ie.current = new THREE.WebGLRenderTarget(ge, X, re), vt.current = new THREE.WebGLRenderTarget(ge, X, re), j.current = EL(), $.current = y(), fe.current = m();
            const te = u.current,
                Ae = [te.layer1, te.layer2, te.layer3, te.layer4];
            pe.current.forEach((An, Tr) => {
                var Ii;
                An.previousPatternType = a ? a[(Ii = Ae[Tr]) == null ? void 0 : Ii.patternType] ?? 0 : 0
            });
            const Se = L.current,
                _t = new THREE.ShaderMaterial({
                    vertexShader: yL,
                    fragmentShader: SL,
                    uniforms: {
                        u_time: {
                            value: 0
                        },
                        u_integratedTime: {
                            value: 0
                        },
                        u_resolution: {
                            value: new THREE.Vector2(ge, X)
                        },
                        u_audio_texture: {
                            value: f.current
                        },
                        u_frequency_bin_count: {
                            value: Q.current
                        },
                        u_gradient_texture: {
                            value: j.current
                        },
                        u_fire_gradient_texture: {
                            value: $.current
                        },
                        u_ice_gradient_texture: {
                            value: fe.current
                        },
                        u_feedback_texture: {
                            value: null
                        },
                        u_feedback_mix: {
                            value: u.current.feedbackMix
                        },
                        u_bpm: {
                            value: Ue.current
                        },
                        u_isBassPresent: {
                            value: G.current ? 1 : 0
                        },
                        u_isDrumsPresent: {
                            value: se.current ? 1 : 0
                        },
                        u_globalTimeScale: {
                            value: u.current.globalTimeScale
                        },
                        u_globalDistortionScale: {
                            value: u.current.globalDistortionScale
                        },
                        u_globalSymmetryOffsetSpeed: {
                            value: u.current.globalSymmetryOffsetSpeed
                        },
                        u_uvScale: {
                            value: u.current.uvScale
                        },
                        u_globalAudioSensitivity: {
                            value: u.current.globalAudioSensitivity
                        },
                        u_rainbowAnimationSpeed: {
                            value: u.current.rainbowAnimationSpeed
                        },
                        u_rainbowPhase: {
                            value: 0
                        },
                        u_visualMode: {
                            value: ld[v.current] ?? 0
                        },
                        u_pixelationFactor: {
                            value: M.current
                        },
                        u_globalColorMode: {
                            value: In[R.current] ?? 0
                        },
                        u_forceGlobalColor: {
                            value: A.current
                        },
                        u_asciiCharSize: {
                            value: w.current
                        },
                        u_accumulatedTimes: {
                            value: je == null ? void 0 : je.current
                        },
                        u_layers: {
                            value: [{
                                patternType: Se ? Se[(ln = u.current.layer1) == null ? void 0 : ln.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(jn = u.current.layer1) == null ? void 0 : jn.blendTargetType] ?? 0 : 0,
                                blendAmount: ((yt = u.current.layer1) == null ? void 0 : yt.blendAmount) ?? 0,
                                symmetry: ((Nt = u.current.layer1) == null ? void 0 : Nt.symmetry) ?? 1,
                                distortionStrength: ((it = u.current.layer1) == null ? void 0 : it.distortionStrength) ?? 0,
                                colorMode: In[(ce = u.current.layer1) == null ? void 0 : ce.colorMode] ?? 0,
                                blendTargetColorMode: In[(pr = u.current.layer1) == null ? void 0 : pr.blendTargetColorMode] ?? In[(T = u.current.layer1) == null ? void 0 : T.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((N = u.current.layer1) == null ? void 0 : N.freq) ?? 10,
                                weaveThickness: ((V = u.current.layer1) == null ? void 0 : V.weaveThickness) ?? .02,
                                turingScale: ((H = u.current.layer1) == null ? void 0 : H.turingScale) ?? 15,
                                turingSpeed: ((k = u.current.layer1) == null ? void 0 : k.turingSpeed) ?? .5,
                                turingFeed: ((_e = u.current.layer1) == null ? void 0 : _e.turingFeed) ?? .035,
                                turingKill: ((Ne = u.current.layer1) == null ? void 0 : Ne.turingKill) ?? .065,
                                turingDiffusionA: ((Ve = u.current.layer1) == null ? void 0 : Ve.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((We = u.current.layer1) == null ? void 0 : We.turingDiffusionB) ?? .5,
                                voronoiScale: ((Ze = u.current.layer1) == null ? void 0 : Ze.voronoiScale) ?? 5,
                                voronoiEdgeWidth: ((Ke = u.current.layer1) == null ? void 0 : Ke.voronoiEdgeWidth) ?? .02,
                                spiralArms: ((Xe = u.current.layer1) == null ? void 0 : Xe.spiralArms) ?? 5,
                                spiralTightness: ((Ft = u.current.layer1) == null ? void 0 : Ft.spiralTightness) ?? .5,
                                spiralNoiseScale: ((Qt = u.current.layer1) == null ? void 0 : Qt.spiralNoiseScale) ?? 1,
                                spiralNoiseSpeed: ((Ht = u.current.layer1) == null ? void 0 : Ht.spiralNoiseSpeed) ?? .1,
                                audioSensitivity: ((Sn = u.current.layer1) == null ? void 0 : Sn.audioSensitivity) ?? 1,
                                bassSensitivity: ((At = u.current.layer1) == null ? void 0 : At.bassSensitivity) ?? 1,
                                midSensitivity: ((K = u.current.layer1) == null ? void 0 : K.midSensitivity) ?? 1,
                                highSensitivity: ((ze = u.current.layer1) == null ? void 0 : ze.highSensitivity) ?? 1,
                                flowComplexity: ((be = u.current.layer1) == null ? void 0 : be.flowComplexity) ?? .6,
                                cubeSize: (($e = u.current.layer1) == null ? void 0 : $e.cubeSize) ?? .5,
                                flowCurl: ((at = u.current.layer1) == null ? void 0 : at.flowCurl) ?? .4,
                                layerSymmetryOffsetSpeed: ((tt = u.current.layer1) == null ? void 0 : tt.layerSymmetryOffsetSpeed) ?? 0,
                                accumulatedSymmetryAngle: 0
                            }, {
                                patternType: Se ? Se[(qe = u.current.layer2) == null ? void 0 : qe.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(nt = u.current.layer2) == null ? void 0 : nt.blendTargetType] ?? 0 : 0,
                                blendAmount: ((gt = u.current.layer2) == null ? void 0 : gt.blendAmount) ?? 0,
                                symmetry: ((dt = u.current.layer2) == null ? void 0 : dt.symmetry) ?? 1,
                                distortionStrength: ((Re = u.current.layer2) == null ? void 0 : Re.distortionStrength) ?? 0,
                                colorMode: In[(Ge = u.current.layer2) == null ? void 0 : Ge.colorMode] ?? 0,
                                blendTargetColorMode: In[(Ct = u.current.layer2) == null ? void 0 : Ct.blendTargetColorMode] ?? In[(Ee = u.current.layer2) == null ? void 0 : Ee.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((bt = u.current.layer2) == null ? void 0 : bt.freq) ?? ((Ut = u.current.layer2) == null ? void 0 : Ut.layer2Freq) ?? 10,
                                weaveThickness: ((Wt = u.current.layer2) == null ? void 0 : Wt.weaveThickness) ?? .025,
                                turingScale: ((Rt = u.current.layer2) == null ? void 0 : Rt.turingScale) ?? 10,
                                turingSpeed: ((Xn = u.current.layer2) == null ? void 0 : Xn.turingSpeed) ?? .6,
                                turingFeed: ((bn = u.current.layer2) == null ? void 0 : bn.turingFeed) ?? .055,
                                turingKill: ((da = u.current.layer2) == null ? void 0 : da.turingKill) ?? .062,
                                turingDiffusionA: ((ha = u.current.layer2) == null ? void 0 : ha.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((pa = u.current.layer2) == null ? void 0 : pa.turingDiffusionB) ?? .5,
                                voronoiScale: ((ma = u.current.layer2) == null ? void 0 : ma.voronoiScale) ?? 6,
                                voronoiEdgeWidth: ((ga = u.current.layer2) == null ? void 0 : ga.voronoiEdgeWidth) ?? .03,
                                spiralArms: ((va = u.current.layer2) == null ? void 0 : va.spiralArms) ?? 6,
                                spiralTightness: ((_a = u.current.layer2) == null ? void 0 : _a.spiralTightness) ?? .6,
                                spiralNoiseScale: ((lt = u.current.layer2) == null ? void 0 : lt.spiralNoiseScale) ?? 1.2,
                                spiralNoiseSpeed: ((kt = u.current.layer2) == null ? void 0 : kt.spiralNoiseSpeed) ?? .15,
                                audioSensitivity: ((gn = u.current.layer2) == null ? void 0 : gn.audioSensitivity) ?? 1,
                                bassSensitivity: ((Jt = u.current.layer2) == null ? void 0 : Jt.bassSensitivity) ?? 1,
                                midSensitivity: ((wn = u.current.layer2) == null ? void 0 : wn.midSensitivity) ?? 1,
                                highSensitivity: ((It = u.current.layer2) == null ? void 0 : It.highSensitivity) ?? 1,
                                flowComplexity: ((ai = u.current.layer2) == null ? void 0 : ai.flowComplexity) ?? .7,
                                cubeSize: ((mo = u.current.layer2) == null ? void 0 : mo.cubeSize) ?? .5,
                                flowCurl: ((Ot = u.current.layer2) == null ? void 0 : Ot.flowCurl) ?? .5,
                                layerSymmetryOffsetSpeed: ((Hr = u.current.layer2) == null ? void 0 : Hr.layerSymmetryOffsetSpeed) ?? 0,
                                accumulatedSymmetryAngle: 0
                            }, {
                                patternType: Se ? Se[(Gr = u.current.layer3) == null ? void 0 : Gr.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(Wr = u.current.layer3) == null ? void 0 : Wr.blendTargetType] ?? 0 : 0,
                                blendAmount: ((ya = u.current.layer3) == null ? void 0 : ya.blendAmount) ?? 0,
                                symmetry: ((Sa = u.current.layer3) == null ? void 0 : Sa.symmetry) ?? 1,
                                distortionStrength: ((Li = u.current.layer3) == null ? void 0 : Li.distortionStrength) ?? 0,
                                colorMode: In[(go = u.current.layer3) == null ? void 0 : go.colorMode] ?? 0,
                                blendTargetColorMode: In[(vo = u.current.layer3) == null ? void 0 : vo.blendTargetColorMode] ?? In[(jl = u.current.layer3) == null ? void 0 : jl.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((Xl = u.current.layer3) == null ? void 0 : Xl.freq) ?? 12,
                                weaveThickness: ((bp = u.current.layer3) == null ? void 0 : bp.weaveThickness) ?? .015,
                                turingScale: ((wp = u.current.layer3) == null ? void 0 : wp.turingScale) ?? 20,
                                turingSpeed: ((Ap = u.current.layer3) == null ? void 0 : Ap.turingSpeed) ?? .4,
                                turingFeed: ((Cp = u.current.layer3) == null ? void 0 : Cp.turingFeed) ?? .025,
                                turingKill: ((Rp = u.current.layer3) == null ? void 0 : Rp.turingKill) ?? .058,
                                turingDiffusionA: ((Pp = u.current.layer3) == null ? void 0 : Pp.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((Lp = u.current.layer3) == null ? void 0 : Lp.turingDiffusionB) ?? .5,
                                voronoiScale: ((Ip = u.current.layer3) == null ? void 0 : Ip.voronoiScale) ?? 4,
                                voronoiEdgeWidth: ((Op = u.current.layer3) == null ? void 0 : Op.voronoiEdgeWidth) ?? .015,
                                spiralArms: ((Dp = u.current.layer3) == null ? void 0 : Dp.spiralArms) ?? 4,
                                spiralTightness: ((Np = u.current.layer3) == null ? void 0 : Np.spiralTightness) ?? .4,
                                spiralNoiseScale: ((Fp = u.current.layer3) == null ? void 0 : Fp.spiralNoiseScale) ?? .8,
                                spiralNoiseSpeed: ((Up = u.current.layer3) == null ? void 0 : Up.spiralNoiseSpeed) ?? .08,
                                audioSensitivity: ((kp = u.current.layer3) == null ? void 0 : kp.audioSensitivity) ?? 1,
                                bassSensitivity: ((zp = u.current.layer3) == null ? void 0 : zp.bassSensitivity) ?? 1,
                                midSensitivity: ((Bp = u.current.layer3) == null ? void 0 : Bp.midSensitivity) ?? 1,
                                highSensitivity: ((Vp = u.current.layer3) == null ? void 0 : Vp.highSensitivity) ?? 1,
                                flowComplexity: ((Hp = u.current.layer3) == null ? void 0 : Hp.flowComplexity) ?? .5,
                                flowCurl: ((Gp = u.current.layer3) == null ? void 0 : Gp.flowCurl) ?? .6,
                                layerSymmetryOffsetSpeed: ((Wp = u.current.layer3) == null ? void 0 : Wp.layerSymmetryOffsetSpeed) ?? 0,
                                accumulatedSymmetryAngle: 0
                            }, {
                                patternType: Se ? Se[(jp = u.current.layer4) == null ? void 0 : jp.patternType] ?? 0 : 0,
                                blendTargetType: Se ? Se[(Xp = u.current.layer4) == null ? void 0 : Xp.blendTargetType] ?? 0 : 0,
                                blendAmount: (($p = u.current.layer4) == null ? void 0 : $p.blendAmount) ?? 0,
                                symmetry: ((qp = u.current.layer4) == null ? void 0 : qp.symmetry) ?? 1,
                                distortionStrength: ((Yp = u.current.layer4) == null ? void 0 : Yp.distortionStrength) ?? 0,
                                colorMode: In[(Kp = u.current.layer4) == null ? void 0 : Kp.colorMode] ?? 0,
                                blendTargetColorMode: In[(Zp = u.current.layer4) == null ? void 0 : Zp.blendTargetColorMode] ?? In[(Qp = u.current.layer4) == null ? void 0 : Qp.colorMode] ?? 0,
                                color1: new THREE.Vector3(0, 0, 0),
                                color2: new THREE.Vector3(0, 0, 0),
                                color3: new THREE.Vector3(0, 0, 0),
                                freq: ((Jp = u.current.layer4) == null ? void 0 : Jp.freq) ?? 8,
                                weaveThickness: ((em = u.current.layer4) == null ? void 0 : em.weaveThickness) ?? .03,
                                turingScale: ((tm = u.current.layer4) == null ? void 0 : tm.turingScale) ?? 12,
                                turingSpeed: ((nm = u.current.layer4) == null ? void 0 : nm.turingSpeed) ?? .7,
                                turingFeed: ((rm = u.current.layer4) == null ? void 0 : rm.turingFeed) ?? .04,
                                turingKill: ((im = u.current.layer4) == null ? void 0 : im.turingKill) ?? .06,
                                turingDiffusionA: ((om = u.current.layer4) == null ? void 0 : om.turingDiffusionA) ?? 1,
                                turingDiffusionB: ((sm = u.current.layer4) == null ? void 0 : sm.turingDiffusionB) ?? .5,
                                voronoiScale: ((am = u.current.layer4) == null ? void 0 : am.voronoiScale) ?? 7,
                                voronoiEdgeWidth: ((lm = u.current.layer4) == null ? void 0 : lm.voronoiEdgeWidth) ?? .025,
                                spiralArms: ((cm = u.current.layer4) == null ? void 0 : cm.spiralArms) ?? 7,
                                spiralTightness: ((um = u.current.layer4) == null ? void 0 : um.tightness) ?? .7,
                                spiralNoiseScale: ((fm = u.current.layer4) == null ? void 0 : fm.spiralNoiseScale) ?? 1.5,
                                spiralNoiseSpeed: ((dm = u.current.layer4) == null ? void 0 : dm.spiralNoiseSpeed) ?? .12,
                                audioSensitivity: ((hm = u.current.layer4) == null ? void 0 : hm.audioSensitivity) ?? 1,
                                bassSensitivity: ((pm = u.current.layer4) == null ? void 0 : pm.bassSensitivity) ?? 1,
                                midSensitivity: ((mm = u.current.layer4) == null ? void 0 : mm.midSensitivity) ?? 1,
                                highSensitivity: ((gm = u.current.layer4) == null ? void 0 : gm.highSensitivity) ?? 1,
                                flowComplexity: ((vm = u.current.layer4) == null ? void 0 : vm.flowComplexity) ?? .8,
                                flowCurl: ((_m = u.current.layer4) == null ? void 0 : _m.flowCurl) ?? .3,
                                layerSymmetryOffsetSpeed: ((ym = u.current.layer4) == null ? void 0 : ym.layerSymmetryOffsetSpeed) ?? 0,
                                accumulatedSymmetryAngle: 0
                            }]
                        },
                        u_visualModeFromIndex: {
                            value: Z.current
                        },
                        u_visualModeToIndex: {
                            value: xe.current
                        },
                        u_visualModeBlend: {
                            value: ae.current
                        },
                        u_mouse: {
                            value: new THREE.Vector2(.5, .5)
                        },
                        u_isRandomizing: {
                            value: Le.current
                        },
                        u_estimatedBpm: {
                            value: Ue.current
                        },
                        u_isBassPresent: {
                            value: G.current
                        },
                        u_isDrumsPresent: {
                            value: se.current
                        },
                        u_drumOnsetDetected: {
                            value: ye.current
                        },
                        u_beatStrength: {
                            value: 0
                        },
                        u_spectralCentroid: {
                            value: 0
                        }
                    }
                });
            O.current = _t;
            const Mt = new THREE.PlaneGeometry(2, 2),
                wt = new THREE.Mesh(Mt, _t);
            Me.add(wt), q.current = wt;
            const qt = new THREE.Scene,
                mt = new THREE.MeshBasicMaterial({
                    map: null,
                    depthTest: !1,
                    depthWrite: !1
                }),
                Dt = new THREE.Mesh(Mt, mt);
            qt.add(Dt), ht.current = qt, b.current = mt, x.current = Dt;
            const Lt = new THREE.Scene,
                Zt = new THREE.ShaderMaterial({
                    vertexShader: xL,
                    fragmentShader: ML,
                    uniforms: {
                        u_textureA: {
                            value: null
                        },
                        u_textureB: {
                            value: null
                        },
                        u_blendFactor: {
                            value: 1
                        },
                        u_currentRender: {
                            value: null
                        },
                        u_lastRender: {
                            value: null
                        },
                        u_rainbowPhase: {
                            value: 0
                        },
                        u_accumulatedTimes: {
                            value: null
                        }
                    },
                    depthTest: !1,
                    depthWrite: !1
                }),
                oi = new THREE.Mesh(Mt, Zt);
            Lt.add(oi), D.current = Lt, B.current = Zt, Y.current = oi, U.current = performance.now();
            const Vr = An => {
                he(An), ee.current = requestAnimationFrame(Vr)
            };
            ee.current = requestAnimationFrame(Vr);
            const si = () => {
                var Ii, xa, Ma, Ea;
                const An = W.clientWidth,
                    Tr = W.clientHeight;
                E.current && (E.current.setSize(An, Tr), O.current && O.current.uniforms.u_resolution.value.set(An, Tr)), (Ii = oe.current) == null || Ii.setSize(An, Tr), (xa = ie.current) == null || xa.setSize(An, Tr), (Ma = Ie.current) == null || Ma.setSize(An, Tr), (Ea = vt.current) == null || Ea.setSize(An, Tr)
            };
            return window.addEventListener("resize", si), () => {
                var An, Tr, Ii, xa, Ma, Ea, Sm, xm, Mm, Em, Tm, bm, wm, Am, Cm, Rm, Pm, Lm, Im, Om, Dm, Nm, Fm, Um;
                if (window.removeEventListener("resize", si), ee.current && cancelAnimationFrame(ee.current), (An = O.current) == null || An.dispose(), (Ii = (Tr = q.current) == null ? void 0 : Tr.geometry) == null || Ii.dispose(), (xa = j.current) == null || xa.dispose(), (Ma = $.current) == null || Ma.dispose(), (Ea = fe.current) == null || Ea.dispose(), (Sm = oe.current) == null || Sm.dispose(), (xm = ie.current) == null || xm.dispose(), (Mm = Ie.current) == null || Mm.dispose(), (Em = vt.current) == null || Em.dispose(), (bm = (Tm = b.current) == null ? void 0 : Tm.map) == null || bm.dispose(), (wm = b.current) == null || wm.dispose(), (Cm = (Am = x.current) == null ? void 0 : Am.geometry) == null || Cm.dispose(), (Pm = (Rm = B.current) == null ? void 0 : Rm.uniforms.u_textureA.value) == null || Pm.dispose(), (Im = (Lm = B.current) == null ? void 0 : Lm.uniforms.u_textureB.value) == null || Im.dispose(), (Om = B.current) == null || Om.dispose(), (Nm = (Dm = Y.current) == null ? void 0 : Dm.geometry) == null || Nm.dispose(), (Fm = E.current) == null || Fm.dispose(), W && ((Um = E.current) != null && Um.domElement)) try {
                    W.removeChild(E.current.domElement)
                } catch (Ex) {
                    console.warn("Error removing canvas during cleanup:", Ex)
                }
                E.current = null, S.current = null
            }
        }, [t, f, a]), {
            uniforms: (we = O.current) == null ? void 0 : we.uniforms,
            blendMaterialRef: B
        }
    }