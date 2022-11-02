import { Shader } from './shader';

import fragment from './ibl-diffuse-gen.frag';
import vertex from './ibl-diffuse-gen.vert';

export class IBLDiffuseGenShader extends Shader {
  public constructor() {
    super(vertex, fragment);
  }
}
