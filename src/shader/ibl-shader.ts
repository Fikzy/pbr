import { Shader } from './shader';

import fragment from './ibl.frag';
import vertex from './pbr.vert';

export class IBLShader extends Shader {
  public constructor() {
    super(vertex, fragment);
  }
}
