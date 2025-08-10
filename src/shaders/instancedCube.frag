// Fragment shader for instanced cube with gradients and rim lighting
varying vec3 vColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vSeed;

uniform float uTime;
uniform vec3 uCameraPosition;
uniform float uRimPower;
uniform float uFresnelPower;
uniform vec3 uRimColor;

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Smooth noise function
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float noise(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  
  float n = p.x + p.y * 57.0 + 113.0 * p.z;
  return mix(
    mix(
      mix(hash(n + 0.0), hash(n + 1.0), f.x),
      mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
    mix(
      mix(hash(n + 113.0), hash(n + 114.0), f.x),
      mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  
  // Fresnel effect
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), uFresnelPower);
  
  // Rim lighting
  float rim = 1.0 - max(dot(normal, viewDirection), 0.0);
  rim = pow(rim, uRimPower);
  
  // Time-based color animation
  float timeOffset = uTime * 0.5 + vSeed * 6.28;
  float hue = mod(timeOffset + vSeed, 1.0);
  
  // Add noise to color variation
  vec3 noisePos = vWorldPosition * 2.0 + vec3(uTime * 0.3);
  float colorNoise = noise(noisePos) * 0.3;
  
  // Create dynamic gradient
  vec3 baseColor = vColor;
  vec3 animatedColor = hsv2rgb(vec3(hue + colorNoise, 0.8, 0.9));
  
  // Mix base color with animated color
  vec3 finalColor = mix(baseColor, animatedColor, 0.6);
  
  // Apply lighting effects
  vec3 rimLight = uRimColor * rim * 2.0;
  vec3 fresnelColor = mix(finalColor, vec3(1.0), fresnel * 0.3);
  
  // Combine all effects
  vec3 color = fresnelColor + rimLight;
  
  // Add subtle glow
  float glow = sin(uTime * 3.0 + vSeed * 10.0) * 0.1 + 0.9;
  color *= glow;
  
  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(color, 1.0);
}