export default `
precision highp float;

in vec3 vPosition;
out vec4 outFragColor;

uniform sampler2D uEnvironmentMap;

const float PI = 3.14159265359;

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

  float sampleDelta = 0.01;
  float count = 0.0; 
  for(float phi = -0.5; phi < 0.5; phi += sampleDelta)
  {
      for(float theta = -1.0; theta < 1.0; theta += sampleDelta)
      {
          vec2 uv = vPosition.xy + vec2(phi, theta);
          acc += texture(uEnvironmentMap, uv).rgb * cos(phi * PI) * cos(theta * PI * 0.5);
          count++;
      }
  }
  acc = PI * acc * (1.0 / float(count));

  outFragColor.rgba = rgbmEncode(acc, 8.0);
}
`;
