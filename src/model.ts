import { Camera } from './camera';
import { Geometry } from './geometries/geometry';
import { GLContext } from './gl';
import { Material } from './material';
import { Shader } from './shader/shader';
import { Texture } from './textures/texture';
import { Transform } from './transform';
import { UniformType } from './types';

export class Model {
  public geometry: Geometry;
  public transform: Transform;
  public material: Material;

  public constructor(
    geometry: Geometry,
    transform: Transform = new Transform(),
    material: Material = new Material()
  ) {
    this.geometry = geometry;
    this.transform = transform;
    this.material = material;
  }

  public update() {
    this.transform.combine();
  }

  public render(
    context: GLContext,
    camera: Camera,
    shader: Shader,
    uniforms: Record<string, UniformType | Texture>
  ) {
    uniforms['uModel.localToProjection'] = camera.localToProjection;
    uniforms['uModel.view'] = this.transform.combine();

    this.material.feedUniforms(uniforms);

    context.draw(this.geometry, shader, uniforms);
  }
}
