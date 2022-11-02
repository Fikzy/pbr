import { GUI } from 'dat.gui';
import { quat, vec3 } from 'gl-matrix';
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
  cameraSwivel: number;
  cameraDistance: number;
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
  private cameraSwivel: number = 0;
  private cameraDistance: number = 8;

  private scene: Scene | null = null;
  private scenes: { [key: string]: Scene };
  private shaders: Shader[] = [];

  private demoLights: PointLight[] = [];
  private demoSpheres: Model[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.context = new GLContext(canvas);
    this.camera = new Camera();

    this.guiProperties = {
      scene: 'IBL Diffuse Map',
      albedo: [255, 255, 255],
      cameraSwivel: 0,
      cameraDistance: 8
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

    const iblGenShader = new IBLShader(true, false);
    this.shaders.push(iblGenShader);

    const quadRenderShader = new QuadRenderShader();
    this.shaders.push(quadRenderShader);

    const Nx = 5;
    const Ny = 5;
    for (let y = 0; y < Ny; y++) {
      for (let x = 0; x < Nx; x++) {
        const offsetX = (Nx - 1) / 2;
        const offsetY = (Ny - 1) / 2;
        const roughness = x / (Nx - 1);
        const metalness = y / (Ny - 1);
        this.demoSpheres.push(
          new Model(
            new SphereGeometry(0.4, 256, 256),
            new Transform(vec3.fromValues(x - offsetX, y - offsetY, 0)),
            new Material(this.guiProperties.albedo, metalness, roughness)
          )
        );
      }
    }

    const diffuseEnvMap = this.convolveDiffuseEnvMap(
      'assets/env/alps_field.png'
    );

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
          'uEnvironment.diffuse': diffuseEnvMap
        })
      ),
      'IBL Diffuse Map': new Scene(
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
          uTexture: diffuseEnvMap
        })
      )
    };

    this.scene = this.scenes[this.guiProperties.scene];

    this._createGUI();
  }

  async convolveDiffuseEnvMap(
    envmapUrl: string
  ): Promise<Texture2D<PixelArray> | null> {
    const envmap = await Texture2D.load(envmapUrl);
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
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // flip Y
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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
    diff.wrapS = gl.REPEAT;
    diff.wrapT = gl.REPEAT;
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
    this.context.clear();
    this.context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const aspect =
      this.context.gl.drawingBufferWidth / this.context.gl.drawingBufferHeight;

    const camera = this.camera;
    camera.setParameters(aspect);
    this.swivelCamera();

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

  swivelCamera() {
    const x = Math.sin(this.cameraSwivel) * this.cameraDistance;
    const z = Math.cos(this.cameraSwivel) * this.cameraDistance;
    vec3.set(this.camera.transform.position, x, 0.0, z);
    quat.setAxisAngle(
      this.camera.transform.rotation,
      vec3.fromValues(0, 1, 0),
      this.cameraSwivel
    );
    this.camera.update();
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

    const cameraFolder = gui.addFolder('Camera');
    cameraFolder
      .add(this.guiProperties, 'cameraSwivel', -Math.PI, Math.PI, 0.01)
      .onChange((swivel) => {
        this.cameraSwivel = swivel;
        this.swivelCamera();
      });
    cameraFolder
      .add(this.guiProperties, 'cameraDistance', 1, 15)
      .onChange((distance) => {
        this.cameraDistance = distance;
        this.swivelCamera();
      });

    sceneSelector.onChange((scene) => {
      console.info(`Changed to '${scene}' scene`);
      this.scene = this.scenes[scene];
    });

    return gui;
  }
}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
let app = new Application(canvas as HTMLCanvasElement);

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}

app.init().then(() => {
  animate();
});

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
