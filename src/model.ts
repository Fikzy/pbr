import { Geometry } from './geometries/geometry';
import { Transform } from './transform';

export class Model {
  public geometry: Geometry;
  public transform: Transform;

  public constructor(geometry: Geometry) {
    this.geometry = geometry;
    this.transform = new Transform();
  }

  public update() {
    this.transform.combine();
  }
}
