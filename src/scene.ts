import { Camera } from './camera';
import { Environment } from './environment';
import { GLContext } from './gl';
import { PonctualLight } from './lights/lights';
import { Model } from './model';
import { Shader } from './shader/shader';
import { Texture } from './textures/texture';
import { UniformType } from './types';

export class Scene {
  public camera: Camera;
  public models: Model[];
  public lights: PonctualLight[];
  public shader: Shader;
  public environment: Environment | null;

  public constructor(
    camera: Camera,
    models: Model[],
    lights: PonctualLight[],
    shader: Shader,
    environment: Environment | null
  ) {
    this.camera = camera;
    this.models = models;
    this.lights = lights;
    this.shader = shader;
    this.environment = environment;
  }

  public init(context: GLContext) {
    this.models.forEach((model) => context.uploadGeometry(model.geometry));
    this.environment?.init(context);
  }

  public render(context: GLContext) {
    let uniforms: Record<string, UniformType | Texture> = {};

    uniforms['uCamera.position'] = this.camera.transform.position;

    this.environment?.feedUniforms(uniforms);

    this.lights.forEach((light, index) => light.feedUniforms(uniforms, index));

    this.models.forEach((model) => {
      model.render(context, this.camera, this.shader, uniforms);
    });
  }
}
