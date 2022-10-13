export default `
precision highp float;

in vec3 vNormalWS;
in vec3 vPositionWS;
in vec3 viewDirection;

out vec4 outFragColor;

struct Material
{
  vec3 albedo;
};

uniform Material uMaterial;

struct PointLight
{
  vec3 color;
  float intensity;
  vec3 position;
};

uniform PointLight[POINT_LIGHT_COUNT] uPointLights;

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

void main()
{
  // **DO NOT** forget to do all your computation in linear space.
  vec3 albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;
  vec3 normal = normalize(vNormalWS);

  // Lambert
  vec3 diffuse = vec3(0, 0, 0);
  for (int i = 0; i < POINT_LIGHT_COUNT; ++i) {
    PointLight light = uPointLights[i];
    vec3 lightDirection = normalize(light.position - vPositionWS);
    float lightDistance = length(light.position - vPositionWS);
    diffuse += max(dot(normal, lightDirection), 0.0) * light.color * light.intensity / lightDistance;
  }

  // **DO NOT** forget to apply gamma correction as last step.
  // outFragColor.rgba = LinearTosRGB(vec4(albedo, 1.0));
  outFragColor.rgba = LinearTosRGB(vec4(albedo * diffuse, 1.0));

  // outFragColor.rgba = vec4(normalize(vNormalWS), 1.0);
}
`;
