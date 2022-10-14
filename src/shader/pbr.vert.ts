export default `
precision highp float;

in vec3 in_position;
in vec3 in_normal;
#ifdef USE_UV
  in vec2 in_uv;
#endif // USE_UV

/**
 * Varyings.
 */

out vec3 vNormalWS;
out vec3 vPositionWS;
out vec3 viewDirection;
#ifdef USE_UV
  out vec2 vUv;
#endif // USE_UV

/**
 * Uniforms List
 */

struct Model
{
  mat4 localToProjection; // viewProjection matrix?
  mat4 view;
};

uniform Model uModel;

struct Camera
{
  vec3 position;
};

uniform Camera uCamera;

void main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = uModel.localToProjection * uModel.view * positionLocal;
  
  // vNormalWS = in_normal;
  vNormalWS = mat3(transpose(inverse(uModel.view))) * in_normal;
  vPositionWS = vec3(uModel.view * vec4(in_position, 1.0));
}
`;
