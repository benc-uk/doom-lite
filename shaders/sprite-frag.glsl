// =============================================================
// Fragment shader for billboarded sprites, with transparency
// and simplified distance based lighting 
// =============================================================

precision highp float;
const int MAX_LIGHTS = 16;
struct Light {
  vec3 pos;
  vec4 color;
  float intensity;
  float radius;
};

varying vec2 v_texCoord;
varying vec4 v_position;

// Common uniforms
uniform mat4 u_world;
uniform vec4 u_lightAmbient;
uniform Light u_lights[MAX_LIGHTS];

// Texture uniforms
uniform sampler2D u_texture;

void main(void) {
  vec4 texel = texture2D(u_texture, v_texCoord);

  // Magic to make transparent sprites work, without blending 
  if(texel.a < 0.5) {
    discard;
  }

  vec4 outColor = vec4(0.0, 0.0, 0.0, 1.0);
  for(int i = 0; i < MAX_LIGHTS; i++) {
    Light light = u_lights[i];
    if(light.intensity == 0.0) {
      continue;
    }

    vec3 surfaceToLight = light.pos - v_position.xyz;
    float dist = length(surfaceToLight);
    float att = clamp(1.0 - ((dist * dist) / (light.radius * light.radius)), 0.0, 1.0);
    att *= att;

    vec4 diffuse = texel * att * light.intensity;
    vec4 lightColor = vec4(
      ((texel * u_lightAmbient + (light.color * diffuse)) * att).rgb, 
      1.0
    );

    outColor += lightColor;
  }

  gl_FragColor = outColor;
}
