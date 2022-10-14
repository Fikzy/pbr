export default `
precision highp float;

const float PI = 3.14159265359;

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

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

float DistributionGGX(vec3 N, vec3 H, float roughness)
{
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH*NdotH;

  float num = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;

  return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;

  float num = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return num / denom;
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = GeometrySchlickGGX(NdotV, roughness);
  float ggx1 = GeometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 f0)
{
  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// w_o: viewDirection
// w_i: light direction

void main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;
  vec3 normal = normalize(vNormalWS);
  vec3 viewDirection = normalize(uCamera.position - vPositionWS);

  float roughness = clamp(uMaterial.roughness, 0.04, 1.0);

  vec3 f0 = mix(vec3(0.04), albedo, uMaterial.metallic);

  vec3 radiance = vec3(0);
  for (int i = 0; i < POINT_LIGHT_COUNT; ++i) {
    PointLight light = uPointLights[i];

    vec3 w_i = normalize(light.position - vPositionWS); // light direction
    vec3 h = normalize(viewDirection + w_i);
    float cosTheta = max(dot(normal, w_i), 0.0);
    
    // Radiance
    float lightDistance = length(light.position - vPositionWS);
    float attenuation = 1.0 / (4.0 * PI * lightDistance * lightDistance); // 1 / 4PI * r^2
    vec3 inRadiance = light.color * light.intensity * attenuation;

    // Specular
    float ndf = DistributionGGX(normal, h, roughness);
    float g = GeometrySmith(normal, viewDirection, w_i, roughness);

    vec3 ks = fresnelSchlick(max(dot(h, viewDirection), 0.0), f0);
    vec3 kd = vec3(1.0) - ks;
    kd *= 1.0 - uMaterial.metallic;

    vec3 num = ndf * g * ks;
    float denom = 4.0 * max(dot(normal, viewDirection), 0.0) * cosTheta + 0.0001;
    vec3 specular = num / denom;

    vec3 specularBRDFEval = specular; // Cook-Torrance
    vec3 diffuseBRDFEval = kd * albedo / PI; // Lambert diffuse

    // Combined
    radiance += (diffuseBRDFEval + specularBRDFEval) * inRadiance * cosTheta;
  }

  vec3 color = radiance;

  // **DO NOT** forget to apply gamma correction as last step.
  outFragColor.rgba = LinearTosRGB(vec4(color, 1.0));

  // outFragColor.rgba = vec4(normalize(vNormalWS), 1.0);
}
`;
