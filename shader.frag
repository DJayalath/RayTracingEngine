#version 430 core

#define FLT_MAX 3.402823466e+38

#define MAP_WIDTH 24
#define MAP_HEIGHT 24
#define MAP_DEPTH 4

#define NUM_TEXTURES 8
#define TEX_WIDTH 64
#define TEX_HEIGHT 64

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

struct Material {
	float specular;
	float diffuse;
	float ambient;
	float shine;
};

layout(std430, binding = 3) buffer dataLayout
{
	uint textures[NUM_TEXTURES * TEX_WIDTH * TEX_HEIGHT];
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
	ivec3 map = ivec3(origin);
	ivec3 stepAmount;
	vec3 tDelta = abs(1.0 / dir);
	vec3 tMax;
	uint voxel;
	int side;

	if (dir.x < 0)
	{
		stepAmount.x = -1;
		tMax.x = (origin.x - map.x) * tDelta.x;
	}
	else if (dir.x > 0)
	{
		stepAmount.x = 1;
		tMax.x = (map.x + 1.0 - origin.x) * tDelta.x;
	}
	else
	{
		stepAmount.x = 0;
		tMax.x = 0;
	}

	if (dir.y < 0)
	{
		stepAmount.y = -1;
		tMax.y = (origin.y - map.y) * tDelta.y;
	}
	else if (dir.y > 0)
	{
		stepAmount.y = 1;
		tMax.y = (map.y + 1.0 - origin.y) * tDelta.y;
	}
	else
	{
		stepAmount.y = 0;
		tMax.y = 0;
	}

	if (dir.z < 0)
	{
		stepAmount.z = -1;
		tMax.z = (origin.z - map.z) * tDelta.z;
	}
	else if (dir.z > 0)
	{
		stepAmount.z = 1;
		tMax.z = (map.z + 1.0 - origin.z) * tDelta.z;
	}
	else
	{
		stepAmount.z = 0;
		tMax.z = 0;
	}

	do
	{
		if (tMax.x < tMax.y)
		{
			if (tMax.x < tMax.z)
			{
				map.x += stepAmount.x;
				if (map.x >= MAP_WIDTH || map.x < 0)
					return vec3(0, 0, 0);
				tMax.x += tDelta.x;
				side = 0;
			}
			else
			{
				map.z += stepAmount.z;
				if (map.z >= MAP_HEIGHT || map.z < 0)
					return vec3(0, 0, 0);
				tMax.z += tDelta.z;
				side = 1;
			}
		}
		else
		{
			if (tMax.y < tMax.z)
			{
				map.y += stepAmount.y;
				if (map.y >= MAP_DEPTH || map.y < 0)
					return vec3(0, 0, 0);
				tMax.y += tDelta.y;
				side = 2;
			}
			else
			{
				map.z += stepAmount.z;
				if (map.z >= MAP_HEIGHT || map.z < 0)
					return vec3(0, 0, 0);
				tMax.z += tDelta.z;
				side = 1;
			}
		}
		voxel = world_map[map.y * MAP_WIDTH * MAP_HEIGHT + map.z * MAP_WIDTH + map.x];
	} while (voxel == 0);

//	// ========== TEXTURING ==========
//
//	uint texNum = voxel - 1;
//
//	float perpWallDist;
//
//	if (side == 0)
//		perpWallDist = (map.x - origin.x + (1 - stepAmount.x) / 2) / dir.x;
//	else if (side == 1)
//		perpWallDist = (map.z - origin.z + (1 - stepAmount.z) / 2) / dir.z;
//
//	int lineHeight = int(float(w_size.y) / perpWallDist);
//
//	float wallX;
//	if (side == 0)
//		wallX = origin.z + perpWallDist * dir.z;
//	else if (side == 1)
//		wallX = origin.x + perpWallDist * dir.x;
//	wallX -= floor(wallX);
//
//	int texX = int(wallX * float(TEX_WIDTH));
//	if (side == 0 && dir.x > 0) texX = TEX_WIDTH - texX - 1;
//	if (side == 1 && dir.z < 0) texX = TEX_WIDTH - texX - 1;
//
//	int d = int(gl_FragCoord.y) * 256 - w_size.y * 128 + lineHeight * 128;
//	int texY = int((float(d * TEX_HEIGHT) / float(lineHeight)) / 256.0);
//
//	uint c = textures[texNum * TEX_WIDTH * TEX_HEIGHT + texY * TEX_HEIGHT + texX];
//	return vec3(float(c & 0xFF) / 255.f,
//				float((c & 0xFF00) >> 8) / 255.f,
//				float((c & 0xFF0000) >> 16) / 255.f);


	float dist;
	vec3 dest;
	if (side == 0)
	{
//		dest = origin + tMax.x * dir;
		dist = (map.x - origin.x + (1 - stepAmount.x) / 2) / dir.x;
	}
	else if (side == 1)
	{
//		dest = origin + tMax.z * dir;
		dist =(map.z - origin.z + (1 - stepAmount.z) / 2) / dir.z;
	}
	else
	{
//		dest = origin + tMax.y * dir;
		dist = (map.y - origin.y + (1 - stepAmount.y) / 2) / dir.y;
	}

	dest = origin + dist * dir;



	vec3 col;

	Light l1 = Light(vec3(8, 3, 8), 0.1);

	vec3 light_dir = normalize(l1.position - dest);
	float diffuse_intensity = l1.intensity * max(0.f, dot(light_dir,dest));
	float ambient_intensity = 0.1f;


//	float specular_intensity = 0.5f;
//	vec3 viewDir = normalize(origin - map);
//	vec3 reflectDir = reflect(map, -light_dir);
//	float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
//	float specular = specular_intensity * spec;



	switch(voxel)
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

	return col * (diffuse_intensity + ambient_intensity);
	//return col * (1.0 / dist);

//	while (true)
//	{
//		vec3 map = origin + t * dir;
//		ivec3 result = ivec3(map);
//
//		uint tile = world_map[result.y * MAP_WIDTH * MAP_HEIGHT + result.z * MAP_WIDTH + result.x];
//		if (tile > 0)
//		{
//			Light l1 = Light(vec3(8, 3, 8), 0.1);
//
//			vec3 light_dir = normalize(l1.position - map);
//			float diffuse_intensity = l1.intensity * max(0.f, dot(light_dir,map));
//			float ambient_intensity = 0.1f;
//			float specular_intensity = 0.5f;
//
//			dist = length(map - origin);
//			vec3 col;
//			switch(tile)
//			{
//			case 1:
//				col = vec3(1, 0.5, 1);
//				break;
//			case 2:
//				col = vec3(1, 1, 1);
//				break;
//			case 3:
//				col = vec3(0.5, 1, 1);
//				break;
//			case 4:
//				col = vec3(0.25, 0.75, 0.5);
//				break;
//			case 5:
//				col = vec3(0.75, 0.25, 0.5);
//				break;
//			case 6:
//				col = vec3(0.5, 0.75, 0.25);
//				break;
//			case 7:
//				col = vec3(0.5, 0.25, 0.75);
//				break;
//			case 8:
//				col = vec3(0.8, 0.1, 0.6);
//				break;
//			case 9:
//				col = vec3(0.1, 0.8, 0.6);
//				break;
//			default:
//				col = vec3(1, 1, 0.5);
//				break;
//			}
//
//			return col * (diffuse_intensity + ambient_intensity);
//		}
//
//		if (result.y >= MAP_DEPTH || result.z >= MAP_WIDTH || result.x >= MAP_HEIGHT)
//		{
//			return vec3(0, 0, 0);
//		}
//		else if (result.y < 0 || result.z < 0 || result.x < 0)
//		{
//			return vec3(0, 0, 0);
//		}
//
//		t += 0.01;
//	}
}

void main()
{
    float x =  (2*(gl_FragCoord.x + 0.5)/float(w_size.x)  - 1)*tan(fov/2.)*w_size.x/float(w_size.y);
    float y = (2*(gl_FragCoord.y + 0.5)/float(w_size.y) - 1)*tan(fov/2.);

	vec3 dir = rotationMatrix(vec3(0, 1, 0), theta.x) * normalize(vec3(x, y, -1));
//	dir = rotationMatrix(cross(dir, vec3(0, 1, 0)), theta.y) * dir;

	pxColour = vec4(cast_ray(pos, dir), 1.0);
}