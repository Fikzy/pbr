import { GUI } from 'dat.gui';
import { vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { Environment } from './environment';
import { SphereGeometry } from './geometries/sphere';
import { GLContext } from './gl';
import { PointLight } from './lights/lights';
import { Model } from './model';
import { Scene } from './scene';
import { LightsShader } from './shader/lights-shader';
import { IBLShader } from './shader/pbr-shader-ibl';
import { Shader } from './shader/shader';

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
      scene: 'IBL',
      albedo: [255, 255, 255]
    };

    // Multiple point lights
    this.demoLights.push(new PointLight(vec3.fromValues(-3, 3, 4), 400));
    this.demoLights.push(new PointLight(vec3.fromValues(3, 3, 4), 400));
    this.demoLights.push(new PointLight(vec3.fromValues(3, -3, 4), 400));
    this.demoLights.push(new PointLight(vec3.fromValues(-3, -3, 4), 400));

    const lightsShader = new LightsShader();
    lightsShader.pointLightCount = this.demoLights.length;
    this.shaders.push(lightsShader);

    const iblShader = new IBLShader();
    this.shaders.push(iblShader);

    const sphereGeometry = new SphereGeometry(0.4, 256, 256);
    const N = 5;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const model = new Model(sphereGeometry);
        const offset = (N - 1) / 2;
        model.transform.position = vec3.fromValues(x - offset, y - offset, 0);

        model.material.metallic = y / (N - 1);
        model.material.roughness = x / (N - 1);

        this.demoSpheres.push(model);
      }
    }

    this.scenes = {
      Lights: new Scene(
        this.camera,
        this.demoSpheres,
        this.demoLights,
        lightsShader,
        null
      ),
      IBL: new Scene(
        this.camera,
        this.demoSpheres,
        [],
        iblShader,
        new Environment(
          'assets/env/Alexs_Apt_2k-diffuse-RGBM.png',
          'assets/env/Alexs_Apt_2k-specular-RGBM.png',
          'assets/ggx-brdf-integrated.png'
        )
      )
    };

    this.scene = this.scenes[this.guiProperties.scene];

    this._createGUI();
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
    // Empty
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
const app = new Application(canvas as HTMLCanvasElement);
app.init();

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
