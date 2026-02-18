declare module "three/examples/jsm/utils/SkeletonUtils" {
  import { Object3D } from "three"
  export function clone<T extends Object3D>(source: T): T
}