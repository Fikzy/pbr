import { vec3 } from 'gl-matrix';
import { Texture } from './textures/texture';
import { UniformType } from './types';

export class Material {
  public albedo: number[];
  public metallic: number;
  public roughness: number;
  public ao: number;

  public constructor(
    albedo: number[] = [1.0, 1.0, 1.0],
    metallic: number = 0.5,
    roughness: number = 0.5,
    ao: number = 1.0
  ) {
    this.albedo = albedo;
    this.metallic = metallic;
    this.roughness = roughness;
    this.ao = ao;
  }

  public feedUniforms(uniforms: Record<string, UniformType | Texture>) {
    uniforms['uMaterial.albedo'] = vec3.fromValues(
      this.albedo[0],
      this.albedo[1],
      this.albedo[2]
    );
    uniforms['uMaterial.metallic'] = this.metallic;
    uniforms['uMaterial.roughness'] = this.roughness;
    uniforms['uMaterial.ao'] = this.ao;
  }
}
