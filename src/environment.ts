import { GLContext } from './gl';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';

export class Environment {
  private diffuseTexturePath: string;
  private specularTexturePath: string;
  private brdfPreIntTexturePath: string;

  public diffuseTexture: Texture2D<HTMLElement> | null = null;
  public specularTexture: Texture2D<HTMLElement> | null = null;
  public brdfPreIntTexture: Texture2D<HTMLElement> | null = null;

  constructor(
    diffuseTexturePath: string,
    specularTexturePath: string,
    brdfPreIntTexturePath: string
  ) {
    this.diffuseTexturePath = diffuseTexturePath;
    this.specularTexturePath = specularTexturePath;
    this.brdfPreIntTexturePath = brdfPreIntTexturePath;
  }

  public async init(context: GLContext) {
    this.diffuseTexture = await Texture2D.load(this.diffuseTexturePath);
    this.specularTexture = await Texture2D.load(this.specularTexturePath);
    this.brdfPreIntTexture = await Texture2D.load(this.brdfPreIntTexturePath);

    if (this.diffuseTexture !== null) {
      context.uploadTexture(this.diffuseTexture);
    }
    if (this.specularTexture !== null) {
      context.uploadTexture(this.specularTexture);
    }
    if (this.brdfPreIntTexture !== null) {
      context.uploadTexture(this.brdfPreIntTexture);
    }
  }

  public feedUniforms(uniforms: Record<string, UniformType | Texture>) {
    if (this.diffuseTexture !== null) {
      uniforms['uEnvironment.diffuse'] = this.diffuseTexture;
    }
    if (this.specularTexture !== null) {
      uniforms['uEnvironment.specular'] = this.specularTexture;
    }
    if (this.brdfPreIntTexture !== null) {
      uniforms['uEnvironment.brdfPreInt'] = this.brdfPreIntTexture;
    }
  }
}
