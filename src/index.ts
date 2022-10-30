import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { Geometry } from './geometries/geometry';
import { SphereGeometry } from './geometries/sphere';
import { GLContext } from './gl';
import { PointLight } from './lights/lights';
import { Model } from './model';
import { LightsShader } from './shader/lights-shader';
import { IBLShader } from './shader/pbr-shader-ibl';
import { Shader } from './shader/shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';

interface GUIProperties {
  shader: string;

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

  private _shader: Shader;
  private _shaders: { [key: string]: Shader };

  private _geometries: Geometry[] = [];
  private _uniforms: Record<string, UniformType | Texture>;
  private _lights: PointLight[] = [];
  private _models: Model[] = [];

  private _diffuseTexture: Texture2D<HTMLElement> | null = null;
  private _specularTexture: Texture2D<HTMLElement> | null = null;
  private _brdfPreIntTexture: Texture2D<HTMLElement> | null = null;

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
      'uMaterial.roughness': 0.5,
      'uMaterial.metallic': 0.5,
      'uModel.localToProjection': mat4.create(),
      'uModel.view': mat4.create()
    };

    // Single point light
    // this._lights.push(new PointLight(vec3.fromValues(0, 0, 4), 300));

    // Multiple point lights
    this._lights.push(new PointLight(vec3.fromValues(-3, 3, 4), 300));
    this._lights.push(new PointLight(vec3.fromValues(3, 3, 4), 300));
    this._lights.push(new PointLight(vec3.fromValues(3, -3, 4), 300));
    this._lights.push(new PointLight(vec3.fromValues(-3, -3, 4), 300));

    const sphereGeometry = new SphereGeometry(0.4, 256, 256);
    this._geometries.push(sphereGeometry);

    const N = 5;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const model = new Model(sphereGeometry);
        const offset = (N - 1) / 2;
        model.transform.position = vec3.fromValues(x - offset, y - offset, 0);

        model.material.metallic = y / (N - 1);
        model.material.roughness = x / (N - 1);

        this._models.push(model);
      }
    }

    const lightsShader = new LightsShader();
    lightsShader.pointLightCount = this._lights.length;

    const iblShader = new IBLShader();

    this._shaders = {
      Lights: lightsShader,
      IBL: iblShader
    };

    this._guiProperties = {
      shader: 'IBL',

      albedo: [255, 255, 255],

      lightOffsetX: 0,
      lightOffsetY: 0,
      lightOffsetZ: 0
    };

    this._shader = this._shaders[this._guiProperties.shader];

    this._createGUI();
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._geometries.forEach((geometry) =>
      this._context.uploadGeometry(geometry)
    );

    Object.values(this._shaders).forEach((shader) =>
      this._context.compileProgram(shader)
    );

    this._diffuseTexture = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
    );
    this._specularTexture = await Texture2D.load(
      'assets/env/Alexs_Apt_2k-specular-RGBM.png'
    );
    this._brdfPreIntTexture = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );

    if (this._diffuseTexture !== null) {
      this._context.uploadTexture(this._diffuseTexture);
      this._uniforms['uEnvironment.diffuse'] = this._diffuseTexture;
    }
    if (this._specularTexture !== null) {
      this._context.uploadTexture(this._specularTexture);
      this._uniforms['uEnvironment.specular'] = this._specularTexture;
    }
    if (this._brdfPreIntTexture !== null) {
      this._context.uploadTexture(this._brdfPreIntTexture);
      this._uniforms['uEnvironment.brdfPreInt'] = this._brdfPreIntTexture;
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
    this._models.forEach((model) => {
      model.material.albedo = [
        props.albedo[0] / 255,
        props.albedo[1] / 255,
        props.albedo[2] / 255
      ];
    });

    this._uniforms['uCamera.position'] = camera.transform.position;

    // Feed lights to shader
    if (this._guiProperties.shader === 'Lights') {
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
    }

    // Feed models to shader and draw them
    this._models.forEach((model) => {
      // Sets the viewProjection matrix.
      // **Note**: if you want to modify the position of the geometry, you will
      // need to take the matrix of the mesh into account here.
      this._uniforms['uModel.localToProjection'] = camera.localToProjection;
      this._uniforms['uModel.view'] = model.transform.combine();

      this._uniforms['uMaterial.albedo'] = vec3.fromValues(
        model.material.albedo[0],
        model.material.albedo[1],
        model.material.albedo[2]
      );
      this._uniforms['uMaterial.metallic'] = model.material.metallic;
      this._uniforms['uMaterial.roughness'] = model.material.roughness;

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

    const shaderSelector = gui.add(
      this._guiProperties,
      'shader',
      Object.keys(this._shaders)
    );

    const materialFolder = gui.addFolder('Material');
    materialFolder.addColor(this._guiProperties, 'albedo');

    const lightOffsetFolder = gui.addFolder('Light Offset');
    lightOffsetFolder.add(this._guiProperties, 'lightOffsetX', -5, 5);
    lightOffsetFolder.add(this._guiProperties, 'lightOffsetY', -5, 5);
    lightOffsetFolder.add(this._guiProperties, 'lightOffsetZ', -5, 5);

    if (this._guiProperties.shader === 'Lights') lightOffsetFolder.show();
    else lightOffsetFolder.hide();

    shaderSelector.onChange((shader) => {
      console.info(`Changed to '${shader}' shader`);

      this._shader = this._shaders[shader];

      if (shader === 'Lights') lightOffsetFolder.show();
      else lightOffsetFolder.hide();
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
