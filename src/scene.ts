import { Camera } from './camera';
import { GLContext } from './gl';
import { PonctualLight } from './lights/lights';
import { Model } from './model';
import { Shader } from './shader/shader';
import { TextureLoader } from './texture-loader';
import { Texture } from './textures/texture';
import { UniformType } from './types';

export class Scene {
  public camera: Camera;
  public shader: Shader;
  public models: Model[];
  public lights: PonctualLight[];
  public textureLoader: TextureLoader;

  public constructor(
    camera: Camera,
    shader: Shader,
    models: Model[],
    lights: PonctualLight[] = [],
    textureLoader: TextureLoader = new TextureLoader()
  ) {
    this.camera = camera;
    this.models = models;
    this.lights = lights;
    this.shader = shader;
    this.textureLoader = textureLoader;
  }

  public init(context: GLContext) {
    this.textureLoader?.init(context);
  }

  public render(context: GLContext) {
    let uniforms: Record<string, UniformType | Texture> = {};

    uniforms['uCamera.position'] = this.camera.transform.position;

    this.textureLoader.feedUniforms(uniforms);

    this.lights.forEach((light, index) => light.feedUniforms(uniforms, index));

    this.models.forEach((model) => {
      model.render(context, this.camera, this.shader, uniforms);
    });
  }
}
