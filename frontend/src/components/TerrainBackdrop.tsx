import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { TerrainAsset } from './terrain'
import { terrainVertexHeightM } from './terrain'

export default function TerrainBackdrop({ asset, reduced, emphasizeTaal }: { asset: TerrainAsset; reduced: boolean; emphasizeTaal: boolean }) {
  const geometry = useMemo(() => {
    const stride = reduced ? 2 : 1
    const east = asset.east_m.filter((_, index) => index % stride === 0)
    const north = asset.north_m.filter((_, index) => index % stride === 0)
    const positions = new Float32Array(east.length * north.length * 3)
    const colors = new Float32Array(positions.length)
    const indices = new Uint32Array((east.length - 1) * (north.length - 1) * 6)
    const low = new THREE.Color('#728875'), high = new THREE.Color('#b3a187'), sea = new THREE.Color('#628fae'), lake = new THREE.Color('#528aa9')
    north.forEach((n, y) => east.forEach((e, x) => {
      const originalY = y * stride, originalX = x * stride
      const mask = asset.land_mask[originalY][originalX]
      const elevation = terrainVertexHeightM(asset, originalX, originalY, emphasizeTaal)
      const i = (y * east.length + x) * 3
      positions[i] = e / 1000; positions[i + 1] = elevation / 1000; positions[i + 2] = -n / 1000
      const color = mask === 1 ? low.clone().lerp(high, Math.min(1, Math.max(0, elevation) / 2600)) : mask === 2 ? lake : sea
      colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b
    }))
    let index = 0
    for (let y = 0; y < north.length - 1; y++) for (let x = 0; x < east.length - 1; x++) {
      const a = y * east.length + x, b = a + east.length
      indices.set([a, a + 1, b, b, a + 1, b + 1], index); index += 6
    }
    const mesh = new THREE.BufferGeometry()
    mesh.setAttribute('position', new THREE.BufferAttribute(positions, 3)); mesh.setAttribute('color', new THREE.BufferAttribute(colors, 3)); mesh.setIndex(new THREE.BufferAttribute(indices, 1)); mesh.computeVertexNormals()
    return mesh
  }, [asset, reduced, emphasizeTaal])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshStandardMaterial vertexColors roughness={1} side={THREE.DoubleSide} /></mesh>
}
