export default `
precision highp float;

in vec3 vPosition;
out vec4 outFragColor;

uniform sampler2D uEnvironmentMap;

const float PI = 3.14159265359;
const float RECIPROCAL_PI = 0.31830988618;
const float RECIPROCAL_PI2 = 0.15915494;

vec2 cartesianToPolar(vec3 n) {
  vec2 uv;
  uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
  uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
  return uv;
}

// http://graphicrants.blogspot.com/2009/04/rgbm-color-encoding.html
vec4 rgbmEncode(vec3 color, float maxValue) {
  vec4 rgbm;
  color *= 1.0 / maxValue;
  rgbm.a = clamp(max(max(color.r, color.g), max(color.b, 1e-6)), 0.0, 1.0);
  rgbm.a = ceil(rgbm.a * 255.0) / 255.0;
  rgbm.rgb = color / rgbm.a;
  return rgbm;
}

void main()
{
  vec3 acc = vec3(0.0);

  float sampleDelta = 0.05;
  float count = 0.0; 
  for(float phi = -PI * 0.5; phi < PI * 0.5; phi += sampleDelta)
  {
      for(float theta = -PI * 0.5; theta < PI * 0.5; theta += sampleDelta)
      {
          vec2 polar = vPosition.xy * PI / vec2(1.0, 2.0) + vec2(theta, phi);
          vec3 dir = vec3(cos(polar.x) * cos(polar.y), sin(polar.y), sin(polar.x) * cos(polar.y));
          vec2 uv = cartesianToPolar(dir);

          acc += texture(uEnvironmentMap, uv).rgb * cos(theta) * cos(phi);
          count++;
      }
  }
  acc = PI * acc * (1.0 / float(count));

  outFragColor.rgba = rgbmEncode(acc, 8.0);
}
`;
