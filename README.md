# RayTracingEngine
Basic, fully ray traced realtime voxel rendering engine using OpenGL shaders. The voxel traversal algorithm used in the fragment shader is an implementation of the method described in [A Fast Voxel Traversal Algorithm for Ray Tracing](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.42.3443&rep=rep1&type=pdf) (Amanatides and Woo 1987).

## Images (most recent first)
### DDA Ray Tracing (with per voxel diffuse lighting)
![DDA with per voxel lighting](https://raw.githubusercontent.com/armytricks/RayTracingEngine/master/scr_diffuse_pervoxel_untextured.png)

### Diffuse lighting
![Diffuse lighting](https://raw.githubusercontent.com/armytricks/RayTracingEngine/master/scr_diffuse_untextured.png)

### Initial render test (camera is light source)
![Early stages](https://raw.githubusercontent.com/armytricks/RayTracingEngine/master/scr_untextured.png)
