#version 430 core

#define FLT_MAX 3.402823466e+38

#define MAP_WIDTH 5
#define MAP_HEIGHT 5
#define MAP_DEPTH 3

in vec4 gl_FragCoord;
out vec4 pxColour;

uniform ivec2 w_size;
uniform float fov;
uniform int world_map[MAP_WIDTH * MAP_HEIGHT * MAP_DEPTH];
uniform vec3 pos;

vec3 cast_ray(const vec3 origin, const vec3 dir)
{
	float dist = FLT_MAX;
	float t = 0.f; // Vector equation scalar

	while (true)
	{
		vec3 map = origin + t * dir;
		ivec3 result = ivec3(map);

		if (world_map[result.y * MAP_WIDTH * MAP_HEIGHT + result.z * MAP_WIDTH + result.x] > 0)
		{
			dist = length(map - origin);
			return vec3(1, 0.5, 1) * 1 / dist;
		}

		if (result.y >= MAP_DEPTH || result.z >= MAP_WIDTH || result.x >= MAP_HEIGHT)
		{
			return vec3(0, 0, 0);
		}
		else if (result.y < 0 || result.z < 0 || result.x < 0)
		{
			return vec3(0, 0, 0);
		}

		t += 0.01;
	}
}

void main()
{
    float x =  (2*(gl_FragCoord.x + 0.5)/float(w_size.x)  - 1)*tan(fov/2.)*w_size.x/float(w_size.y);
    float y = (2*(gl_FragCoord.y + 0.5)/float(w_size.y) - 1)*tan(fov/2.);

	vec3 dir = normalize(vec3(x, y, -1));

	pxColour = vec4(cast_ray(pos, dir), 1.0);
}