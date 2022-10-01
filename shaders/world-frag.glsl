// =============================================================
// Fragment shader for world geometry with diffuse and specular
// lighting using  Blinn-Phong illumination model
// =============================================================

precision highp float;
struct Light {
  vec3 pos;
  vec4 color;
  float intensity;
  float radius;
};

varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec4 v_position;

uniform mat4 u_world;
uniform mat4 u_viewInverse;

const int MAX_LIGHTS = 16;
uniform vec4 u_lightAmbient;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;
uniform Light u_lights[MAX_LIGHTS];

uniform sampler2D u_texture;

// per object uniforms
uniform float u_xOffset;
uniform float u_yOffset;
uniform vec4 u_debugColor;
uniform float u_brightness;

// Light function returns two floats (packed into a vec2)
// One for diffuse component of lighting, the second for specular
// - normalN:          Surface normal (normalized)
// - surfaceToLightN:  Vector towards light (normalized)
// - halfVector:       Half vector towards camera (normalized)
// - shininess:        Hardness or size of specular highlights
vec2 lightCalc(vec3 normalN, vec3 surfaceToLightN, vec3 halfVector, float shininess) {
  float NdotL = dot(normalN, surfaceToLightN);
  float NdotH = dot(normalN, halfVector);
  
  return vec2(
    abs(NdotL),                                    // Diffuse term in x
    (NdotL > 0.0) ? pow(max(0.0, NdotH), shininess) : 0.0  // Specular term in y
  );
}

void main(void) {
  vec4 texel = texture2D(u_texture, vec2(v_texCoord.x + u_xOffset, v_texCoord.y + u_yOffset));

  // Walls can have transparent pixels, so we need to discard them
  if(texel.a < 0.5) {
    discard;
  }
  
  texel.rgb *= u_brightness;

  vec4 outColor = vec4(0.0, 0.0, 0.0, 0.0);
  for(int i = 0; i < MAX_LIGHTS; i++) {
    Light light = u_lights[i];

    if(light.intensity == 0.0) {
      continue;
    }

    vec3 surfaceToLight = light.pos - (u_world * v_position).xyz;
    vec3 surfaceToView = (u_viewInverse[3] - (u_world * v_position)).xyz;
    vec3 normalN = normalize(v_normal);
    vec3 surfaceToLightN = normalize(surfaceToLight);
    vec3 surfaceToViewN = normalize(surfaceToView);
    vec3 halfVector = normalize(surfaceToLightN + surfaceToViewN);

    vec2 l = lightCalc(normalN, surfaceToLightN, halfVector, u_shininess);

    float dist = length(surfaceToLight);
    float att = clamp(1.0 - dist*dist/(light.radius*light.radius), 0.0, 1.0);
    att *= att;

    vec4 diffuse = texel * l.x * att * light.intensity;
    vec4 spec = u_specular * l.y * u_specularFactor * att * light.intensity;
    vec4 lightColor = vec4(
      ((texel * u_lightAmbient + (light.color * (diffuse + spec))) * att).rgb, 
      texel.a 
    );

    outColor += lightColor;
  }

  if (u_debugColor.a > 0.0) {
    gl_FragColor = u_debugColor;
  } else {
    gl_FragColor = outColor;
  }
}
