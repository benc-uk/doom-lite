precision highp float;

uniform mat4 u_worldViewProjection;
uniform mat4 u_world;

struct Light {
  vec3 pos;
  vec4 color;
};
uniform Light u_lights[8];

attribute vec4 position;
attribute vec2 texcoord;

varying vec2 v_texCoord;
varying vec3 v_surfaceToLight;

void main() {
  v_texCoord = texcoord;
  
  vec3 lightWorldPos = u_lights[0].pos;
  v_surfaceToLight = lightWorldPos - (u_world * position).xyz;

  gl_Position = u_worldViewProjection * position;
}