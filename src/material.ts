export class Material {
  public albedo: number[];
  public metallic: number;
  public roughness: number;
  public ao: number;

  public constructor() {
    this.albedo = [1.0, 1.0, 1.0];
    this.metallic = 0.5;
    this.roughness = 0.5;
    this.ao = 1.0;
  }
}
