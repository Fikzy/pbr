export default `
precision highp float;

in vec3 in_position;

out vec3 vPosition;

void main()
{
  vPosition = vec3(in_position.xy * 2.0, 1.0);
  gl_Position = vec4(vPosition, 1.0);
}
`;
