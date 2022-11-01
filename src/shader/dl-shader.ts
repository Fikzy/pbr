import { Shader } from './shader';

import fragment from './dl.frag';
import vertex from './pbr.vert';

export class DLShader extends Shader {
  public constructor() {
    super(vertex, fragment);
  }

  public set useLightProbe(flag: boolean) {
    this.defines.LIGHT_PROBE = flag;
  }

  public set directionalLightCount(count: number) {
    this.defines.DIRECTIONAL_LIGHT_COUNT = count;
  }

  public set pointLightCount(count: number) {
    this.defines.POINT_LIGHT_COUNT = count;
  }
}
