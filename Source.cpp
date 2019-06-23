#include <glad/glad.h>
#include <SDL2/SDL.h>

#include <glm/glm.hpp>

#include <string>
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>

#define W_WIDTH 1280
#define W_HEIGHT 720

#define MAP_WIDTH 5
#define MAP_HEIGHT 5
#define MAP_DEPTH 3

#define MOVESPEED 0.02
#define ROTSPEED 0.10

// x -->
// z down
int worldMap[MAP_WIDTH * MAP_HEIGHT * MAP_DEPTH] =
{
	1, 1, 1, 1, 1,
	1, 0, 0, 0, 1,
	1, 0, 0, 0, 1,
	1, 0, 0, 0, 1,
	1, 1, 1, 1, 1,

	1, 1, 1, 1, 1,
	1, 0, 0, 0, 1,
	1, 0, 0, 0, 1,
	1, 0, 0, 0, 1,
	1, 1, 1, 1, 1,

	1, 1, 1, 1, 1,
	1, 0, 0, 0, 1,
	1, 0, 0, 0, 1,
	1, 0, 0, 0, 1,
	1, 1, 1, 1, 1,
};

SDL_Window* window = nullptr;
SDL_GLContext glContext;
SDL_Event event;
#define NUM_KEYS 128
#define NUM_MOUSE 5
bool m_keys[NUM_KEYS], m_mouse[NUM_MOUSE];
float frameTime;
double xlast;

glm::fvec2 pos, dir, plane;

struct Mouse
{
	glm::dvec2 last;
	glm::dvec2 delta;
	bool first = true;
} mouse_move;

unsigned int shaderID;

void CompileShaders(const char* vertexPath, const char* fragmentPath, const char* geometryPath = nullptr);
void checkCompileErrors(GLuint shader, std::string type);

int main(int argc, char* argv[])
{

	// ========== SDL2 BOILERPLATE ==========

	// Initialisation
	SDL_Init(SDL_INIT_EVERYTHING);
	SDL_GL_SetAttribute(SDL_GL_ACCELERATED_VISUAL, 1);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
	SDL_GL_SetAttribute(SDL_GL_RED_SIZE, 8);
	SDL_GL_SetAttribute(SDL_GL_GREEN_SIZE, 8);
	SDL_GL_SetAttribute(SDL_GL_BLUE_SIZE, 8);
	SDL_GL_SetAttribute(SDL_GL_ALPHA_SIZE, 8);
	SDL_GL_SetAttribute(SDL_GL_BUFFER_SIZE, 32);
	SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 16);
	SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);

	// Create window
	window = SDL_CreateWindow("Ray Caster OpenGL", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, W_WIDTH, W_HEIGHT, SDL_WINDOW_OPENGL);
	glContext = SDL_GL_CreateContext(window);

	// Capture mouse
	SDL_SetRelativeMouseMode(SDL_TRUE);

	// GLAD: load all OpenGL function pointers
	if (!gladLoadGLLoader((GLADloadproc)SDL_GL_GetProcAddress))
		std::cout << "Failed to initialize GLAD" << std::endl;

	atexit(SDL_Quit);

	glViewport(0, 0, W_WIDTH, W_HEIGHT);
	glDisable(GL_DEPTH_TEST);
	glDisable(GL_CULL_FACE);

	// ========== RAY CASTING SETUP ==========

	pos = { 22, 13.5 };
	dir = { -1, 0 };
	plane = { 0, 0.66 };

	double time = 0; //time of current frame
	double oldTime = 0; //time of previous frame

	// ========== SHADER COMPILATION ==========

	// Compile
	CompileShaders("./shader.vert", "./shader.frag");

	// Uniforms
	int uniform_dir = glGetUniformLocation(shaderID, "dir");
	int uniform_plane = glGetUniformLocation(shaderID, "plane");
	int uniform_pos = glGetUniformLocation(shaderID, "pos");
	int uniform_worldmap = glGetUniformLocation(shaderID, "worldmap");

	// Set static uniforms
	glUseProgram(shaderID);

	// ========== VERTEX SETUP ==========

	// Single quad used to draw all pixels
	float vertices[] = {
		 1.0, 1.0, 0.0,  // Top right
		1.0, -1.0, 0.0,  // Bottom right
		-1.0, -1.0, 0.0,  // Bottom left
		-1.0, 1.0, 0.0   // Top left 
	};
	unsigned int indices[] = {
		0, 1, 3,  // First Triangle
		1, 2, 3   // Second Triangle
	};

	unsigned int VBO, VAO, EBO, SSBO;
	glGenVertexArrays(1, &VAO);
	glGenBuffers(1, &VBO);
	glGenBuffers(1, &EBO);
	//glGenBuffers(1, &SSBO);

	glBindVertexArray(VAO);

	glBindBuffer(GL_ARRAY_BUFFER, VBO);
	glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
	glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

	// Add texture data to SSBO
	//glBindBuffer(GL_SHADER_STORAGE_BUFFER, SSBO);

	//glBufferData(GL_SHADER_STORAGE_BUFFER, sizeof(texture), texture, GL_STATIC_READ);
	//glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 3, SSBO);

	glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
	glEnableVertexAttribArray(0);

	glBindBuffer(GL_ARRAY_BUFFER, 0);
	glBindBuffer(GL_SHADER_STORAGE_BUFFER, 0);

	glBindVertexArray(0);


	// ========== GAME LOOP ==========

	bool quit = false;
	while (!quit)
	{
		// Clear previous buffer
		glClearColor(0, 0, 0, 0);
		glClear(GL_COLOR_BUFFER_BIT);

		// Process inputs
		while (SDL_PollEvent(&event) != 0)
		{
			switch (event.type)
			{
			case SDL_KEYDOWN:
				if (event.key.keysym.sym < 128)
					m_keys[event.key.keysym.sym] = true;
				break;
			case SDL_KEYUP:
				if (event.key.keysym.sym < 128)
					m_keys[event.key.keysym.sym] = false;
				break;
			case SDL_MOUSEMOTION:

			{
				double delta = -1 * double(event.motion.xrel) * frameTime * ROTSPEED;

				// Rotate 90 degrees
				glm::dmat2 rotation = { glm::dvec2(cos(delta), -sin(delta)), glm::dvec2(sin(delta), cos(delta)) };
				dir = dir * rotation;
				plane = plane * rotation;
			}
			break;
			case SDL_QUIT:
				quit = true;
				break;
			default:
				break;
			}
		}

		if (m_keys[SDLK_ESCAPE])
			quit = true;

		// Normalize if simultaneous perpendicular inputs
		double multiplier = MOVESPEED;
		if (m_keys[SDLK_w] || m_keys[SDLK_s])
		{
			if (m_keys[SDLK_a] || m_keys[SDLK_d])
			{
				// Multiply by 1/sqrt(2) to normalize speeds when
				// moving in x and y directions simultaneously
				multiplier *= 0.70710678118;
			}
		}

		if (m_keys[SDLK_w])
		{
			if (worldMap[int(pos.x + dir.x * multiplier) + int(pos.y) * MAP_WIDTH] == false) pos.x += dir.x * multiplier;
			if (worldMap[int(pos.x) + int(pos.y + dir.y * multiplier) * MAP_WIDTH] == false) pos.y += dir.y * multiplier;
		}
		else if (m_keys[SDLK_s])
		{
			if (worldMap[int(pos.x - dir.x * multiplier) + int(pos.y) * MAP_WIDTH] == false) pos.x -= dir.x * multiplier;
			if (worldMap[int(pos.x) + int(pos.y - dir.y * multiplier) * MAP_WIDTH] == false) pos.y -= dir.y * multiplier;
		}
		if (m_keys[SDLK_a])
		{
			// Apply transformation as if moving forwards
			if (worldMap[int(pos.x - dir.y * multiplier) + int(pos.y) * MAP_WIDTH] == false) pos.x -= dir.y * multiplier;
			if (worldMap[int(pos.x) + int(pos.y + dir.x * multiplier) * MAP_WIDTH] == false) pos.y += dir.x * multiplier;
		}
		else if (m_keys[SDLK_d])
		{
			// Apply transformation as if moving forwards
			if (worldMap[int(pos.x + dir.y * multiplier) + int(pos.y) * MAP_WIDTH] == false) pos.x += dir.y * multiplier;
			if (worldMap[int(pos.x) + int(pos.y - dir.x * multiplier) * MAP_WIDTH] == false) pos.y -= dir.x * multiplier;
		}

		// Activate shader and render
		glUseProgram(shaderID);

		// Pass dynamic uniforms
		glUniform2f(uniform_pos, pos.x, pos.y);
		glUniform2f(uniform_dir, dir.x, dir.y);
		glUniform2f(uniform_plane, plane.x, plane.y);

		glBindVertexArray(VAO);
		glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

		// Update
		SDL_GL_SwapWindow(window);

		// ========== TIMING ==========

		oldTime = time;
		time = SDL_GetTicks();
		frameTime = (time - oldTime) / 1000.0;
		//std::cout << frameTime << std::endl;
	}

	// ========== CLEAN UP ==========

	glDeleteVertexArrays(1, &VAO);
	glDeleteBuffers(1, &VBO);
	glDeleteBuffers(1, &EBO);

	SDL_GL_DeleteContext(glContext);
	SDL_DestroyWindow(window);
	SDL_Quit();

	return EXIT_SUCCESS;
}

void CompileShaders(const char* vertexPath, const char* fragmentPath, const char* geometryPath)
{
	// 1. retrieve the vertex/fragment source code from filePath
	std::string vertexCode;
	std::string fragmentCode;
	std::string geometryCode;
	std::ifstream vShaderFile;
	std::ifstream fShaderFile;
	std::ifstream gShaderFile;
	// ensure ifstream objects can throw exceptions:
	vShaderFile.exceptions(std::ifstream::failbit | std::ifstream::badbit);
	fShaderFile.exceptions(std::ifstream::failbit | std::ifstream::badbit);
	gShaderFile.exceptions(std::ifstream::failbit | std::ifstream::badbit);
	try
	{
		// open files
		vShaderFile.open(vertexPath);
		fShaderFile.open(fragmentPath);
		std::stringstream vShaderStream, fShaderStream;
		// read file's buffer contents into streams
		vShaderStream << vShaderFile.rdbuf();
		fShaderStream << fShaderFile.rdbuf();
		// close file handlers
		vShaderFile.close();
		fShaderFile.close();
		// convert stream into string
		vertexCode = vShaderStream.str();
		fragmentCode = fShaderStream.str();
		// if geometry shader path is present, also load a geometry shader
		if (geometryPath != nullptr)
		{
			gShaderFile.open(geometryPath);
			std::stringstream gShaderStream;
			gShaderStream << gShaderFile.rdbuf();
			gShaderFile.close();
			geometryCode = gShaderStream.str();
		}
	}
	catch (std::ifstream::failure e)
	{
		std::cout << "ERROR::SHADER::FILE_NOT_SUCCESFULLY_READ" << std::endl;
	}
	const char* vShaderCode = vertexCode.c_str();
	const char* fShaderCode = fragmentCode.c_str();
	// 2. compile shaders
	unsigned int vertex, fragment;
	// vertex shader
	vertex = glCreateShader(GL_VERTEX_SHADER);
	glShaderSource(vertex, 1, &vShaderCode, NULL);
	glCompileShader(vertex);
	checkCompileErrors(vertex, "VERTEX");
	// fragment Shader
	fragment = glCreateShader(GL_FRAGMENT_SHADER);
	glShaderSource(fragment, 1, &fShaderCode, NULL);
	glCompileShader(fragment);
	checkCompileErrors(fragment, "FRAGMENT");
	// if geometry shader is given, compile geometry shader
	unsigned int geometry;
	if (geometryPath != nullptr)
	{
		const char* gShaderCode = geometryCode.c_str();
		geometry = glCreateShader(GL_GEOMETRY_SHADER);
		glShaderSource(geometry, 1, &gShaderCode, NULL);
		glCompileShader(geometry);
		checkCompileErrors(geometry, "GEOMETRY");
	}
	// shader Program
	shaderID = glCreateProgram();
	glAttachShader(shaderID, vertex);
	glAttachShader(shaderID, fragment);
	if (geometryPath != nullptr)
		glAttachShader(shaderID, geometry);
	glLinkProgram(shaderID);
	checkCompileErrors(shaderID, "PROGRAM");
	// delete the shaders as they're linked into our program now and no longer necessery
	glDeleteShader(vertex);
	glDeleteShader(fragment);
	if (geometryPath != nullptr)
		glDeleteShader(geometry);
}

void checkCompileErrors(GLuint shader, std::string type)
{
	GLint success;
	GLchar infoLog[1024];
	if (type != "PROGRAM")
	{
		glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
		if (!success)
		{
			glGetShaderInfoLog(shader, 1024, NULL, infoLog);
			std::cout << "ERROR::SHADER_COMPILATION_ERROR of type: " << type << "\n" << infoLog << "\n -- --------------------------------------------------- -- " << std::endl;
		}
	}
	else
	{
		glGetProgramiv(shader, GL_LINK_STATUS, &success);
		if (!success)
		{
			glGetProgramInfoLog(shader, 1024, NULL, infoLog);
			std::cout << "ERROR::PROGRAM_LINKING_ERROR of type: " << type << "\n" << infoLog << "\n -- --------------------------------------------------- -- " << std::endl;
		}
	}
}