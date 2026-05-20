varying vec2 vUv;
uniform sampler2D u_textureA; 
uniform sampler2D u_textureB; 
uniform float u_blendFactor;  

void main() {
  vec3 colorA = texture2D(u_textureA, vUv).rgb;
  vec3 colorB = texture2D(u_textureB, vUv).rgb;
  vec3 blendedColor = mix(colorA, colorB, u_blendFactor);
  gl_FragColor = vec4(blendedColor, 1.0);
}