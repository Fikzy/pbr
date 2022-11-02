export default `
precision highp float;

in vec3 in_position;
in vec2 in_uv;

out vec3 vPosition;
out vec2 vUv;

struct Model
{
  mat4 localToProjection;
  mat4 view;
};

uniform Model uModel;

void main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = uModel.localToProjection * uModel.view * positionLocal;
  vPosition = in_position;
  vUv = in_uv;
}
`;
