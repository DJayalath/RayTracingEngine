#version 430 core

#define FLT_MAX 3.402823466e+38

#define MAP_WIDTH 24
#define MAP_HEIGHT 24
#define MAP_DEPTH 4

in vec4 gl_FragCoord;
out vec4 pxColour;

uniform ivec2 w_size;
uniform float fov;
uniform vec3 pos;
uniform vec2 theta;

struct Light {
    vec3 position;
    float intensity;
};

layout(std430, binding = 3) buffer dataLayout
{
     uint world_map[];
};

mat3 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
				oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c);
}

vec3 cast_ray(const vec3 origin, const vec3 dir)
{
	float dist = FLT_MAX;
	float t = 0.f; // Vector equation scalar

	while (true)
	{
		vec3 map = origin + t * dir;
		ivec3 result = ivec3(map);

		uint tile = world_map[result.y * MAP_WIDTH * MAP_HEIGHT + result.z * MAP_WIDTH + result.x];
		if (tile > 0)
		{
			Light l1 = Light(vec3(8, 3, 8), 0.1);
			vec3 light_dir = normalize(l1.position - map);
			float diffuse_intensity = l1.intensity * max(0.f, dot(light_dir,map));

			dist = length(map - origin);
			vec3 col;
			switch(tile)
			{
			case 1:
				col = vec3(1, 0.5, 1);
				break;
			case 2:
				col = vec3(1, 1, 1);
				break;
			case 3:
				col = vec3(0.5, 1, 1);
				break;
			case 4:
				col = vec3(0.25, 0.75, 0.5);
				break;
			case 5:
				col = vec3(0.75, 0.25, 0.5);
				break;
			case 6:
				col = vec3(0.5, 0.75, 0.25);
				break;
			case 7:
				col = vec3(0.5, 0.25, 0.75);
				break;
			case 8:
				col = vec3(0.8, 0.1, 0.6);
				break;
			case 9:
				col = vec3(0.1, 0.8, 0.6);
				break;
			default:
				col = vec3(1, 1, 0.5);
				break;
			}

			return col * diffuse_intensity;
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

	vec3 dir = rotationMatrix(vec3(0, 1, 0), theta.x) * normalize(vec3(x, y, -1));
//	dir = rotationMatrix(cross(dir, vec3(0, 1, 0)), theta.y) * dir;

	pxColour = vec4(cast_ray(pos, dir), 1.0);
}