import { Shader } from './shader';

import fragment from './ibl.frag';
import vertex from './pbr.vert';

export class IBLShader extends Shader {
  public constructor(useDiffuse = true, useSpecular = true) {
    super(vertex, fragment);
    this.useDiffuse = useDiffuse;
    this.useSpecular = useSpecular;
  }

  public set useDiffuse(flag: boolean) {
    this.defines.USE_DIFFUSE = flag;
  }

  public set useSpecular(flag: boolean) {
    this.defines.USE_SPECULAR = flag;
  }
}
