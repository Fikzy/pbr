export default `
precision highp float;

in vec3 vPosition;
in vec2 vUv;
out vec4 outFragColor;

uniform sampler2D uTexture;

const float PI = 3.14159265359;
const float RECIPROCAL_PI = 0.31830988618;
const float RECIPROCAL_PI2 = 0.15915494;

vec2 cartesianToPolar(vec3 n) {
  vec2 uv;
  uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
  uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
  return uv;
}

void main()
{
  vec3 color = texture(uTexture, vUv).rgb;

  outFragColor.rgba = vec4(color, 1.0);
}
`;
