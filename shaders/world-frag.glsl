// =============================================================
// Fragment shader for world geometry with diffuse and specular
// lighting using  Blinn-Phong illumination model
// =============================================================

precision highp float;

varying vec4 v_position;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;
varying vec2 v_texCoord;
varying float v_lightDist;

uniform vec4 u_lightColor;
uniform vec4 u_lightAmbient;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;

uniform sampler2D u_texture;

// per object uniforms
uniform float u_xOffset;
uniform float u_yOffset;
uniform vec4 u_debugColor;

// Light function returns two floats (packed into a vec2)
// One for diffuse component of lighting, the second for specular
// - normalN:          Surface normal (normalized)
// - surfaceToLightN:  Vector towards light (normalized)
// - halfVector:       Half vector towards camera (normalized)
// - shininess:        Hardness or size of specular highlights
vec2 light(vec3 normalN, vec3 surfaceToLightN, vec3 halfVector, float shininess) {
  float NdotL = dot(normalN, surfaceToLightN);
  float NdotH = dot(normalN, halfVector);
  
  return vec2(
    abs(NdotL),                                            // Diffuse term in x
    (NdotL > 0.0) ? pow(max(0.0, NdotH), shininess) : 0.0  // Specular term in y
  );
}

void main(void) {
  vec4 texel = texture2D(u_texture, vec2(v_texCoord.x + u_xOffset, v_texCoord.y + u_yOffset));
  if(texel.a < 0.5) {
    discard;
  }

  vec3 normalN = normalize(v_normal);
  vec3 surfaceToLightN = normalize(v_surfaceToLight);
  vec3 surfaceToViewN = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLightN + surfaceToViewN);

  vec2 l = light(normalN, surfaceToLightN, halfVector, u_shininess);

  float lightDist = length(v_surfaceToLight);
  float attenuation = 1.0 / (1.0 + 8.00 * lightDist + 1.3 * (lightDist * lightDist));
  attenuation = clamp(attenuation * 2000.0, 0.0, 1.0);

  vec4 outColor = vec4(
    (texel * u_lightAmbient * attenuation + (u_lightColor * (texel * l.x * attenuation + u_specular * l.y * u_specularFactor * attenuation))).rgb, 
    texel.a 
  );

  // if (u_debugColor.a > 0.0) {
  //   gl_FragColor = u_debugColor;
  // } else {
  //   gl_FragColor = outColor;
  // }
  gl_FragColor = outColor;
}
