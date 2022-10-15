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
  float ao;
};

uniform Material uMaterial;

struct PointLight
{
  vec3 color;
  float intensity;
  vec3 position;
};

uniform PointLight[POINT_LIGHT_COUNT] uPointLights;

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

float normalDistributionGGX(vec3 n, vec3 h, float roughness)
{
  float a = roughness * roughness; // artistic roughness remapping
  float a2 = a * a;
  float ndoth = max(dot(n, h), 0.0);
  float denom = (ndoth * ndoth * (a2 - 1.0) + 1.0);
  return a2 / (PI * denom * denom);
}

float geometrySchlickGGX(float ndotv, float roughness)
{
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  return ndotv / (ndotv * (1.0 - k) + k);
}
float geometrySmith(vec3 n, vec3 v, vec3 l, float roughness)
{
  float ndotv = max(dot(n, v), 0.0);
  float ndotl = max(dot(n, l), 0.0);
  return geometrySchlickGGX(ndotl, roughness) * geometrySchlickGGX(ndotv, roughness);
}

vec3 fresnelSchlick(float cosTheta, vec3 f0)
{
  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

vec2 texCoords(vec2 uv, float l) {
  float two_pow_l = pow(2.0, l);
  float x = uv.x / two_pow_l;
  float y = uv.y / pow(2.0, l + 1.0) + 1.0 - 1.0 / two_pow_l;
  return vec2(x, y);
}

vec3 fetchPrefilteredSpec(vec3 reflected, float roughness) {
  vec2 uv = cartesianToPolar(reflected);
  float mip = roughness * (MIP_LEVELS - 1.0);
  float mipF = floor(mip);
  float mipFrac = mip - mipF;
  vec3 level0 = texture(uEnvironment.specular, texCoords(uv, mipF)).rgb;
  vec3 level1 = texture(uEnvironment.specular, texCoords(uv, mipF + 1.0)).rgb;
  return mix(level0, level1, mipFrac);
  // return texture(uEnvironment.specular, texCoords(uv, mipF)).rgb;
}

// w_o: viewDirection
// w_i: light direction

void main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;
  vec3 normal = normalize(vNormalWS);
  vec3 w_o = normalize(uCamera.position - vPositionWS);

  float roughness = clamp(uMaterial.roughness, 0.04, 1.0);

  vec3 f0 = mix(vec3(0.04), albedo, uMaterial.metallic);

  // IBL Diffuse
  vec3 irradiance = texture(uEnvironment.diffuse, cartesianToPolar(normal)).rgb;

  // IBL Specular
  vec3 reflected = reflect(-w_o, normal);
  vec3 prefilteredSpec = fetchPrefilteredSpec(reflected, roughness);
  vec2 brdf = texture(uEnvironment.brdfPreInt, vec2(max(dot(normal, -w_o), 0.0), roughness)).rg;

  vec3 radiance = vec3(0);
  for (int i = 0; i < POINT_LIGHT_COUNT; ++i) {
    PointLight light = uPointLights[i];

    vec3 w_i = normalize(light.position - vPositionWS); // light direction
    vec3 h = normalize(w_o + w_i); // halfway vector
    float cosTheta = max(dot(normal, w_i), 0.0);
    
    // Incoming radiance
    float lightDistance = length(light.position - vPositionWS);
    float attenuation = 1.0 / (4.0 * PI * lightDistance * lightDistance); // 1 / 4PI * r^2
    vec3 inRadiance = light.color * light.intensity * attenuation;

    // Fresnel coefs
    vec3 ks = fresnelSchlick(max(dot(h, w_o), 0.0), f0);
    vec3 kd = (1.0 - ks);
    kd *= 1.0 - uMaterial.metallic;

    // Diffuse (Lambert)
    vec3 diffuseBRDFEval = kd * albedo / PI;

    // IBL Diffuse
    diffuseBRDFEval *= irradiance;

    // Specular (Cook-Torrance GGX)
    // float d = normalDistributionGGX(normal, h, roughness);
    // float g = geometrySmith(normal, w_o, w_i, roughness);
    // vec3 specularBRDFEval = d * ks * g / (4.0 * max(dot(normal, w_o), 0.0) * cosTheta + 0.0001);

    // IBL Specular
    vec3 specularBRDFEval = prefilteredSpec * (ks * brdf.x + brdf.y);

    // Combined
    radiance += (diffuseBRDFEval + specularBRDFEval) * inRadiance * cosTheta;
  }

  vec3 color = radiance;

  // **DO NOT** forget to apply gamma correction as last step.
  outFragColor.rgba = LinearTosRGB(vec4(color, 1.0));

  // outFragColor.rgba = vec4(normal, 1.0);
}
`;
