"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { XR, createXRStore, useXR } from "@react-three/xr"
import { useGLTF } from "@react-three/drei"
import { useEffect, useRef } from "react"
import * as THREE from "three"

/* ✔ v10 SESSION FEATURES MUST BE HERE ONLY */
export const store = createXRStore({
  requiredFeatures:[
    "hit-test",
    "anchors",
    "local-floor"
  ]
} as any)

/* ✔ SINGLE OBJECT ONLY */
export const xrState={
  placed:false,
  object:null as any
}

/* ---------------- SYSTEM ---------------- */

function PlacementSystem(){

  const { session } = useXR()
  const { scene } = useGLTF("/models/wand.glb")

  const hitSource = useRef<any>(null)
  const lastHit   = useRef<any>(null)
  const reticle   = useRef<THREE.Mesh>(null!)

  /* ---------- HIT TEST ---------- */

  useEffect(()=>{

    if(!session) return
    const xr = session as XRSession

    xr.requestReferenceSpace("viewer")
    .then((viewer:XRReferenceSpace)=>{

      ;(xr as any)
      .requestHitTestSource({space:viewer})
      .then((src:any)=>{
        hitSource.current = src
      })

    })

  },[session])

  /* ---------- TAP = PLACE ONCE ---------- */

  useEffect(()=>{

    if(!session) return
    const xr = session as XRSession

    const onSelect = ()=>{

      if(!lastHit.current) return
      if(xrState.placed) return

      ;(lastHit.current as any)
      .createAnchor()
      .then((anchor:any)=>{

        const model = scene.clone(true)

        /* REAL WORLD TABLE SIZE */

        const box  = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3()
        box.getSize(size)

        const max = Math.max(size.x,size.y,size.z)

        model.scale.setScalar(0.12/max)

        xrState.object={
          anchor,
          object:model
        }

        xrState.placed=true
      })
    }

    xr.addEventListener("select",onSelect)
    return()=>xr.removeEventListener("select",onSelect)

  },[session])

  /* ---------- RETICLE TRACK ---------- */

  useFrame((_,__,frame)=>{

    if(!frame) return
    if(!hitSource.current) return

    const refSpace =
    store.getState().originReferenceSpace
    if(!refSpace) return

    const hits =
    frame.getHitTestResults(hitSource.current)

    if(hits.length===0){
      reticle.current.visible=false
      return
    }

    const pose =
    hits[0].getPose(refSpace)
    if(!pose) return

    lastHit.current = hits[0]

    reticle.current.visible=true

    reticle.current.position.set(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z
    )

    reticle.current.quaternion.set(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    )

    /* UPDATE SINGLE OBJECT */

    if(!xrState.object) return

    const objPose =
    frame.getPose(
      xrState.object.anchor.anchorSpace,
      refSpace
    )

    if(!objPose) return

    xrState.object.object.visible=true

    xrState.object.object.position.set(
      objPose.transform.position.x,
      objPose.transform.position.y,
      objPose.transform.position.z
    )

    xrState.object.object.quaternion.set(
      objPose.transform.orientation.x,
      objPose.transform.orientation.y,
      objPose.transform.orientation.z,
      objPose.transform.orientation.w
    )
  })

  return(
    <>
      <mesh ref={reticle} visible={false}>
        <ringGeometry args={[0.05,0.07,32]} />
        <meshBasicMaterial color="white"/>
      </mesh>

      {xrState.object && (
        <primitive object={xrState.object.object}/>
      )}
    </>
  )
}

/* ---------------- MAIN ---------------- */

export default function ARScene(){

  useEffect(()=>{

    const start = async()=>{
      if(!navigator.xr) return
      await store.enterAR()
    }

    window.addEventListener("start-webxr",start)
    return()=>window.removeEventListener("start-webxr",start)

  },[])

  return(
    <div
      style={{
        width:"100%",
        height:"65vh",
        borderRadius:"24px",
        overflow:"hidden",
        background:"#000",
        position:"relative"
      }}
    >
      <Canvas
        style={{
          width:"100%",
          height:"100%"
        }}
      >
        <XR store={store}>
          <ambientLight intensity={1}/>
          <PlacementSystem/>
        </XR>
      </Canvas>
    </div>
  )
}