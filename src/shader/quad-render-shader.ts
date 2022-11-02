import { Shader } from './shader';

import fragment from './quad-render.frag';
import vertex from './quad-render.vert';

export class QuadRenderShader extends Shader {
  public constructor() {
    super(vertex, fragment);
  }
}
