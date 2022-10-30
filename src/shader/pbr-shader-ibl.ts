import { Shader } from './shader';

import vertex from './pbr.vert';
import fragment from './ibl.frag';

export class IBLShader extends Shader {
  public constructor() {
    super(vertex, fragment);
  }
}
