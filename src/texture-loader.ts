import { GLContext } from './gl';
import { Texture, Texture2D } from './textures/texture';
import { PixelArray, UniformType } from './types';

export class TextureLoader {
  public textures: Record<string, Texture2D<HTMLElement | PixelArray>>;
  private texturePromises: Record<
    string,
    Promise<Texture2D<HTMLElement | PixelArray> | null>
  >;

  constructor(
    uniTexPromises: Record<
      string,
      Promise<Texture2D<HTMLElement | PixelArray> | null>
    > = {}
  ) {
    this.texturePromises = uniTexPromises;
    this.textures = {};
  }

  public async init(context: GLContext) {
    Object.entries(this.texturePromises).forEach(
      async ([key, texturePromise]) => {
        const texture = await texturePromise;
        if (texture !== null) {
          context.uploadTexture(texture);
          this.textures[key] = texture;
        }
      }
    );
  }

  public feedUniforms(uniforms: Record<string, UniformType | Texture>) {
    Object.entries(this.textures).forEach(([key, texture]) => {
      uniforms[key] = texture;
    });
  }
}
