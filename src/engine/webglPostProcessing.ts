/**
 * WebGL2 Hardware-Accelerated Post-Processing & Shader Pipeline
 * Features:
 * - High-Dynamic-Range (HDR) Multi-pass Bloom for torches, lava & gold ore
 * - Thermal Heat Distortion (Lava haze & chimney mirage)
 * - Medieval Pilgrimage Tonemapping & Warm Parchment Grain
 * - Subtle Vignette & Chromatic Aberration
 */

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

// Fragment Shader: Multi-effect Post-Processing (Bloom blend, Heat distortion, Tonemapping & Grain)
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform sampler2D u_sceneTexture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bloomIntensity;
uniform float u_heatDistortion;
uniform float u_grainIntensity;
uniform int u_hasMagma;

in vec2 v_texCoord;
out vec4 fragColor;

// Pseudo-random noise for medieval parchment film grain
float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Simple 2D simplex-like noise for heat wave shimmer
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = v_texCoord;

    // 1. Heat Haze Distortion (applied if magma/furnace is active)
    if (u_hasMagma == 1 && u_heatDistortion > 0.0) {
        float wave = sin(uv.y * 35.0 + u_time * 3.5) * 0.0025;
        wave += cos(uv.x * 25.0 - u_time * 2.8) * 0.0018;
        uv.x += wave * u_heatDistortion;
        uv.y += wave * 0.5 * u_heatDistortion;
    }

    // 2. Base scene sample
    vec4 baseColor = texture(u_sceneTexture, uv);

    // 3. Multi-tap Fast Bloom (Gather 9 samples in a cross for golden glow)
    vec4 bloom = vec4(0.0);
    if (u_bloomIntensity > 0.0) {
        vec2 texel = 1.0 / u_resolution;
        float radius = 2.5;

        vec4 c1 = texture(u_sceneTexture, uv + vec2(-texel.x * radius, 0.0));
        vec4 c2 = texture(u_sceneTexture, uv + vec2(texel.x * radius, 0.0));
        vec4 c3 = texture(u_sceneTexture, uv + vec2(0.0, -texel.y * radius));
        vec4 c4 = texture(u_sceneTexture, uv + vec2(0.0, texel.y * radius));
        vec4 c5 = texture(u_sceneTexture, uv + vec2(-texel.x * radius * 0.7, -texel.y * radius * 0.7));
        vec4 c6 = texture(u_sceneTexture, uv + vec2(texel.x * radius * 0.7, -texel.y * radius * 0.7));
        vec4 c7 = texture(u_sceneTexture, uv + vec2(-texel.x * radius * 0.7, texel.y * radius * 0.7));
        vec4 c8 = texture(u_sceneTexture, uv + vec2(texel.x * radius * 0.7, texel.y * radius * 0.7));

        // Isolate glowing high-luminance elements (torches, magma, gold veins, sparks)
        #define BRIGHT_PASS(c) max(vec4(0.0), c - 0.48)
        bloom = (
            BRIGHT_PASS(c1) + BRIGHT_PASS(c2) +
            BRIGHT_PASS(c3) + BRIGHT_PASS(c4) +
            BRIGHT_PASS(c5) + BRIGHT_PASS(c6) +
            BRIGHT_PASS(c7) + BRIGHT_PASS(c8)
        ) / 8.0;

        // Enhance warm golden/amber glow tint
        bloom.rgb *= vec3(1.25, 0.95, 0.55) * u_bloomIntensity;
    }

    // Combine base with additive bloom
    vec3 color = baseColor.rgb + bloom.rgb;

    // 4. Pilgrimage Color Grading (Crush deep cavern shadows, warm up torches)
    // Contrast boost
    color = pow(color, vec3(0.92)); // Gamma tweak
    // Warm tone lift
    color.r *= 1.04;
    color.b *= 0.94;

    // 5. Parchment Grain (tactile medieval texture)
    if (u_grainIntensity > 0.0) {
        float grain = (random(uv * u_resolution + vec2(u_time * 0.1, u_time * 0.2)) - 0.5) * 0.05 * u_grainIntensity;
        color += vec3(grain);
    }

    // 6. Subtle Screen Edge Vignette
    vec2 dist = (uv - 0.5) * 1.35;
    float vig = 1.0 - dot(dist, dist);
    vig = clamp(vig, 0.0, 1.0);
    color *= mix(0.72, 1.0, vig);

    fragColor = vec4(clamp(color, 0.0, 1.0), baseColor.a);
}
`;

export class WebGLPostProcessor {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;

  // Uniform locations
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uBloomIntensityLoc: WebGLUniformLocation | null = null;
  private uHeatDistortionLoc: WebGLUniformLocation | null = null;
  private uGrainIntensityLoc: WebGLUniformLocation | null = null;
  private uHasMagmaLoc: WebGLUniformLocation | null = null;

  public isSupported = false;

  public init(glCanvas: HTMLCanvasElement): boolean {
    const gl = glCanvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL2 not supported on this device/browser');
      this.isSupported = false;
      return false;
    }

    this.gl = gl;

    // Compile shaders
    const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    if (!vertShader || !fragShader) {
      this.isSupported = false;
      return false;
    }

    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    this.program = program;

    // Cache uniforms
    this.uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    this.uTimeLoc = gl.getUniformLocation(program, 'u_time');
    this.uBloomIntensityLoc = gl.getUniformLocation(program, 'u_bloomIntensity');
    this.uHeatDistortionLoc = gl.getUniformLocation(program, 'u_heatDistortion');
    this.uGrainIntensityLoc = gl.getUniformLocation(program, 'u_grainIntensity');
    this.uHasMagmaLoc = gl.getUniformLocation(program, 'u_hasMagma');

    // Create VAO and full-screen quad buffers
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Quad positions (two triangles covering clip space -1 to 1)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture coords (inverted Y for canvas compatibility)
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]);
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // Create source texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.isSupported = true;
    return true;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Run the post-processing shader pass on sourceCanvas and output to glCanvas
   */
  public render(
    sourceCanvas: HTMLCanvasElement,
    options: {
      time: number;
      bloomIntensity: number;
      heatDistortion: number;
      grainIntensity: number;
      hasMagma: boolean;
    }
  ) {
    const gl = this.gl;
    if (!gl || !this.program || !this.isSupported) return;

    // Match WebGL viewport with target canvas
    if (gl.canvas.width !== sourceCanvas.width || gl.canvas.height !== sourceCanvas.height) {
      gl.canvas.width = sourceCanvas.width;
      gl.canvas.height = sourceCanvas.height;
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Upload source canvas to texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    // Set uniforms
    if (this.uResolutionLoc) {
      gl.uniform2f(this.uResolutionLoc, gl.canvas.width, gl.canvas.height);
    }
    if (this.uTimeLoc) {
      gl.uniform1f(this.uTimeLoc, options.time);
    }
    if (this.uBloomIntensityLoc) {
      gl.uniform1f(this.uBloomIntensityLoc, options.bloomIntensity);
    }
    if (this.uHeatDistortionLoc) {
      gl.uniform1f(this.uHeatDistortionLoc, options.heatDistortion);
    }
    if (this.uGrainIntensityLoc) {
      gl.uniform1f(this.uGrainIntensityLoc, options.grainIntensity);
    }
    if (this.uHasMagmaLoc) {
      gl.uniform1i(this.uHasMagmaLoc, options.hasMagma ? 1 : 0);
    }

    // Draw full-screen quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy() {
    if (!this.gl) return;
    if (this.texture) this.gl.deleteTexture(this.texture);
    if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
    if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
    if (this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.program) this.gl.deleteProgram(this.program);
    this.gl = null;
    this.isSupported = false;
  }
}
