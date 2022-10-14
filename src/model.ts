import { Geometry } from './geometries/geometry';
import { Material } from './material';
import { Transform } from './transform';

export class Model {
  public geometry: Geometry;
  public transform: Transform;
  public material: Material;

  public constructor(geometry: Geometry) {
    this.geometry = geometry;
    this.transform = new Transform();
    this.material = new Material();
  }

  public update() {
    this.transform.combine();
  }
}
