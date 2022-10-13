import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { Geometry } from './geometries/geometry';
import { SphereGeometry } from './geometries/sphere';
import { GLContext } from './gl';
import { PointLight } from './lights/lights';
import { Model } from './model';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';

interface GUIProperties {
  albedo: number[];
  lightOffsetX: number;
  lightOffsetY: number;
  lightOffsetZ: number;
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  /**
   * Context used to draw to the canvas
   *
   * @private
   */
  private _context: GLContext;

  private _shader: PBRShader;
  private _geometries: Geometry[] = [];
  private _uniforms: Record<string, UniformType | Texture>;
  private _lights: PointLight[] = [];
  private _models: Model[] = [];

  private _textureExample: Texture2D<HTMLElement> | null;

  private _camera: Camera;

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    this._context = new GLContext(canvas);
    this._camera = new Camera();

    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uModel.localToProjection': mat4.create(),
      'uModel.view': mat4.create()
    };

    // Single point light
    this._lights.push(new PointLight(vec3.fromValues(1, 1, 2)));

    // Multiple point lights
    // this._lights.push(new PointLight(vec3.fromValues(-1, 1, 5)));
    // this._lights.push(new PointLight(vec3.fromValues(1, 1, 5)));
    // this._lights.push(new PointLight(vec3.fromValues(1, -1, 5)));
    // this._lights.push(new PointLight(vec3.fromValues(-1, -1, 5)));

    const sphereGeometry = new SphereGeometry(0.4, 256, 256);
    this._geometries.push(sphereGeometry);

    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const model = new Model(sphereGeometry);
        model.transform.position = vec3.fromValues(i, j, 0);
        this._models.push(model);
      }
    }

    this._shader = new PBRShader();
    this._shader.pointLightCount = this._lights.length;

    this._textureExample = null;

    this._guiProperties = {
      albedo: [255, 255, 255],
      lightOffsetX: 0,
      lightOffsetY: 0,
      lightOffsetZ: 0
    };

    this._createGUI();
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._geometries.forEach((geometry) =>
      this._context.uploadGeometry(geometry)
    );
    this._context.compileProgram(this._shader);

    // Example showing how to load a texture and upload it to GPU.
    this._textureExample = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    if (this._textureExample !== null) {
      this._context.uploadTexture(this._textureExample);
      // You can then use it directly as a uniform:
      // ```uniforms.myTexture = this._textureExample;```
    }
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    // Empty
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this._context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    this._context.clear();
    this._context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const aspect =
      this._context.gl.drawingBufferWidth /
      this._context.gl.drawingBufferHeight;

    const camera = this._camera;
    vec3.set(camera.transform.position, 0.0, 0.0, 8.0);
    camera.setParameters(aspect);
    camera.update();

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );

    this._uniforms['uCamera.position'] = camera.transform.position;

    // Feed lights to shader
    this._lights.forEach((light, index) => {
      this._uniforms[`uPointLights[${index}].intensity`] = light.intensity;
      this._uniforms[`uPointLights[${index}].color`] = light.color;

      // this._uniforms[`uPointLights[${index}].position`] = light.positionWS;

      const lightOffset = vec3.fromValues(
        light.positionWS[0] + props.lightOffsetX,
        light.positionWS[1] + props.lightOffsetY,
        light.positionWS[2] + props.lightOffsetZ
      );
      this._uniforms[`uPointLights[${index}].position`] = lightOffset;
    });

    // Feed models to shader and draw them
    this._models.forEach((model) => {
      // Sets the viewProjection matrix.
      // **Note**: if you want to modify the position of the geometry, you will
      // need to take the matrix of the mesh into account here.
      this._uniforms['uModel.localToProjection'] = camera.localToProjection;
      this._uniforms['uModel.view'] = model.transform.combine();

      this._context.draw(model.geometry, this._shader, this._uniforms);
    });
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

    gui.addColor(this._guiProperties, 'albedo');

    const lightOffset = gui.addFolder('light offset');
    lightOffset.add(this._guiProperties, 'lightOffsetX', -5, 5);
    lightOffset.add(this._guiProperties, 'lightOffsetY', -5, 5);
    lightOffset.add(this._guiProperties, 'lightOffsetZ', -5, 5);

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
