export default class BiasController {
  constructor() {
    this.location = null;
    this.radius = null;
    this.enabled = false;
  }
  init() {
    biasParamDiv;
  }
  setBias(loc, radius) {
    this.enable();
    this.location = loc;
    if (radius) {
      this.radius = radius;
    }
  }
  getLocation() {
    return this.enabled ? this.location : null;
  }
  setRadius(radius) {
    this.radius = radius;
  }
  getRadius() {
    return this.radius;
  }
  enable() {
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
  }
}
