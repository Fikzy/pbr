import { Shader } from './shader';

import fragment from './ibl-gen.frag';
import vertex from './pbr.vert';

export class IBLGenShader extends Shader {
  public constructor() {
    super(vertex, fragment);
  }
}
