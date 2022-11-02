export default `
precision highp float;

in vec3 vNormalWS;
in vec3 vPositionWS;

out vec4 outFragColor;

struct Material
{
  vec3 albedo;
  float metallic;
  float roughness;
};

uniform Material uMaterial;

struct Camera
{
  vec3 position;
};

uniform Camera uCamera;

struct Environment
{
  sampler2D diffuse;
  sampler2D specular;
  sampler2D brdfPreInt;
};

uniform Environment uEnvironment;

const float PI = 3.14159265359;
const float RECIPROCAL_PI = 0.31830988618;
const float RECIPROCAL_PI2 = 0.15915494;

const float MIP_LEVELS = 6.0;

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

vec2 cartesianToPolar(vec3 n) {
  vec2 uv;
  uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
  uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
  return uv;
}

vec3 fresnelSchlick(float cosTheta, vec3 f0, float roughness) {
  return f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;

  vec3 normal = normalize(vNormalWS);
  vec3 w_o = normalize(uCamera.position - vPositionWS); // viewDirection

  float roughness = clamp(uMaterial.roughness, 0.04, 1.0);

  vec3 f0 = mix(vec3(0.04), albedo, uMaterial.metallic);

  vec3 ks = fresnelSchlick(max(dot(normal, w_o), 0.0), f0, roughness);
  vec3 kd = (1.0 - ks) * (1.0 - uMaterial.metallic) * albedo;

  // IBL Diffuse
  vec2 uvDiffuse = cartesianToPolar(normal); // flip y axis
  vec4 diffuseTexel = texture(uEnvironment.diffuse, uvDiffuse);
  vec3 diffuseBRDFEval = kd * diffuseTexel.rgb;

  vec3 gi = diffuseBRDFEval;

  // Reinhard Tonemapping (meh results)
  // gi = gi / (gi + 1.0);

  /* ACES Tonemapping
   * https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
   */
  gi = (gi * (2.51 * gi + 0.03)) / (gi * (2.43 * gi + 0.59) + 0.14);

  // **DO NOT** forget to apply gamma correction as last step.
  outFragColor.rgba = LinearTosRGB(vec4(gi, 1.0));
}
`;
