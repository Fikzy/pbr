import { GUI } from 'dat.gui';
import { vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { PlaneGeometry } from './geometries/plane';
import { SphereGeometry } from './geometries/sphere';
import { GLContext } from './gl';
import { PointLight } from './lights/lights';
import { Material } from './material';
import { Model } from './model';
import { Scene } from './scene';
import { DLShader } from './shader/dl-shader';
import { IBLDiffuseGenShader } from './shader/ibl-diffuse-gen-shader';
import { IBLGenShader } from './shader/ibl-gen-shader';
import { IBLShader } from './shader/ibl-shader';
import { QuadRenderShader } from './shader/quad-render-shader';
import { Shader } from './shader/shader';
import { TextureLoader } from './texture-loader';
import { Texture2D } from './textures/texture';
import { Transform } from './transform';
import { PixelArray } from './types';

interface GUIProperties {
  scene: string;
  albedo: number[];
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  private context: GLContext;
  private guiProperties: GUIProperties;

  private camera: Camera;
  private scene: Scene | null = null;
  private scenes: { [key: string]: Scene };
  private shaders: Shader[] = [];

  private demoLights: PointLight[] = [];
  private demoSpheres: Model[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.context = new GLContext(canvas);
    this.camera = new Camera();

    this.guiProperties = {
      scene: 'Render Quad',
      albedo: [255, 255, 255]
    };

    // Multiple point lights
    this.demoLights.push(new PointLight(vec3.fromValues(-3, 3, 4), 400));
    this.demoLights.push(new PointLight(vec3.fromValues(3, 3, 4), 400));
    this.demoLights.push(new PointLight(vec3.fromValues(3, -3, 4), 400));
    this.demoLights.push(new PointLight(vec3.fromValues(-3, -3, 4), 400));

    const dlShader = new DLShader();
    dlShader.pointLightCount = this.demoLights.length;
    this.shaders.push(dlShader);

    const iblShader = new IBLShader();
    this.shaders.push(iblShader);

    const iblGenShader = new IBLGenShader();
    this.shaders.push(iblGenShader);

    const quadRenderShader = new QuadRenderShader();
    this.shaders.push(quadRenderShader);

    const N = 5;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const offset = (N - 1) / 2;
        this.demoSpheres.push(
          new Model(
            new SphereGeometry(0.4, 256, 256),
            new Transform(vec3.fromValues(x - offset, y - offset, 0)),
            new Material(this.guiProperties.albedo, y / (N - 1), x / (N - 1))
          )
        );
      }
    }

    const diffuseTexture = this.convolveDiffuseEnvMap();

    this.scenes = {
      'Direct Lighting': new Scene(
        this.camera,
        dlShader,
        this.demoSpheres,
        this.demoLights
      ),
      IBL: new Scene(
        this.camera,
        iblShader,
        this.demoSpheres,
        [],
        new TextureLoader({
          'uEnvironment.diffuse': Texture2D.load(
            'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
          ),
          'uEnvironment.specular': Texture2D.load(
            'assets/env/Alexs_Apt_2k-specular-RGBM.png'
          ),
          'uEnvironment.brdfPreInt': Texture2D.load(
            'assets/ggx-brdf-integrated.png'
          )
        })
      ),
      'IBL Gen': new Scene(
        this.camera,
        iblGenShader,
        this.demoSpheres,
        [],
        new TextureLoader({
          'uEnvironment.diffuse': diffuseTexture
        })
      ),
      'Render Quad': new Scene(
        this.camera,
        quadRenderShader,
        [
          new Model(
            new PlaneGeometry(),
            new Transform(vec3.create(), vec3.fromValues(8, 4, 1))
          )
        ],
        [],
        new TextureLoader({
          uTexture: diffuseTexture
        })
      )
    };

    this.scene = this.scenes[this.guiProperties.scene];

    this._createGUI();
  }

  async convolveDiffuseEnvMap(): Promise<Texture2D<PixelArray> | null> {
    const envmap = await Texture2D.load('assets/env/neon_photostudio.png');
    if (!envmap) return Promise.resolve(null);
    this.context.uploadTexture(envmap);

    const gl = this.context.gl;
    const width = envmap.width;
    const height = envmap.height;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // create empty texture to render to
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format,
      width,
      height,
      0,
      format,
      type,
      null
    );

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // create framebuffer
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // bind texture to framebuffer
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    gl.viewport(0, 0, width, height);

    const iblDiffuseGenShader = new IBLDiffuseGenShader();
    this.context.compileProgram(iblDiffuseGenShader);

    const renderPlane = new Model(new PlaneGeometry());
    this.context.uploadGeometry(renderPlane.geometry);

    renderPlane.update();
    renderPlane.render(this.context, new Camera(), iblDiffuseGenShader, {
      uEnvironmentMap: envmap
    });

    const pixels = new Uint8Array(4 * width * height);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      gl.readPixels(0, 0, width, height, format, type, pixels);
    }

    // unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // restore viewport
    this.context.resize();

    const diff = new Texture2D(pixels, width, height, format, format, type);
    this.context.uploadTexture(diff);
    return diff;
  }

  /**
   * Initializes the application.
   */
  async init() {
    Object.values(this.scenes).forEach((scene) => scene.init(this.context));

    Object.values(this.shaders).forEach((shader) =>
      this.context.compileProgram(shader)
    );
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    this.scene &&
      Object.values(this.scene.models).forEach((model) => {
        model.update();
      });
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this.context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    // return;

    this.context.clear();
    this.context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const aspect =
      this.context.gl.drawingBufferWidth / this.context.gl.drawingBufferHeight;

    const camera = this.camera;
    vec3.set(camera.transform.position, 0.0, 0.0, 8.0);
    camera.setParameters(aspect);
    camera.update();

    const props = this.guiProperties;

    // Set the color from the GUI into the uniform list.
    this.demoSpheres.forEach((model) => {
      model.material.albedo = [
        props.albedo[0] / 255,
        props.albedo[1] / 255,
        props.albedo[2] / 255
      ];
    });

    this.scene?.render(this.context);
  }

  /**
   * Creates a GUI floating on the upper right side of the page.
   *
   * ## Note
   *
   * You are free to do whatever you want with this GUI. It's useful to have
   * parameters you can dynamically change to see what happens.
   *
   *
   * @private
   */
  private _createGUI(): GUI {
    const gui = new GUI();

    const sceneSelector = gui.add(
      this.guiProperties,
      'scene',
      Object.keys(this.scenes)
    );

    const materialFolder = gui.addFolder('Material');
    materialFolder.addColor(this.guiProperties, 'albedo');

    sceneSelector.onChange((scene) => {
      console.info(`Changed to '${scene}' scene`);
      this.scene = this.scenes[scene];
    });

    return gui;
  }
}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
let app = new Application(canvas as HTMLCanvasElement);
app.init();

// canvas.addEventListener('webglcontextlost', (event) => {
//   console.error('WebGL context lost');
//   event.preventDefault();
// });

// canvas.addEventListener('webglcontextrestored', () => {
//   console.info('WebGL context restored');
//   app = new Application(canvas as HTMLCanvasElement);
//   app.init();
// });

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Handles resize.
 */

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    app.resize();
  }
});

resizeObserver.observe(canvas);
