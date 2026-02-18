"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { XR, createXRStore, useXR } from "@react-three/xr"
import { useGLTF } from "@react-three/drei"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { SkeletonUtils } from "three-stdlib"

export const store=createXRStore({
  requiredFeatures:["hit-test","anchors","local-floor"]
} as any)

export const xrState={
  placed:false,
  placing:false,
  object:null as {
    anchor:any
    object:THREE.Group
  }|null
}

const REAL_WORLD_SIZE=0.8

function PlacementSystem(){

  const {session}=useXR()
  const buildingGLTF=useGLTF("/models/building.glb")

  const viewerSpace=useRef<XRReferenceSpace|null>(null)
  const localSpace=useRef<XRReferenceSpace|null>(null)
  const hitSource=useRef<any>(null)
  const lastHit=useRef<any>(null)
  const reticle=useRef<THREE.Mesh>(null!)

  /* HIT TEST */

  useEffect(()=>{

    if(!session) return
    const xr=session as XRSession

    Promise.all([
      xr.requestReferenceSpace("viewer"),
      xr.requestReferenceSpace("local-floor")
    ])
    .then(([viewer,local])=>{

      viewerSpace.current=viewer
      localSpace.current=local

      ;(xr as any)
      .requestHitTestSource({space:viewer})
      .then((src:any)=>{
        hitSource.current=src
      })
    })

  },[session])

  /* TAP */

  useEffect(()=>{

    if(!session) return
    const xr=session as XRSession

    const onSelect=()=>{

      if(!lastHit.current) return
      if(xrState.placed || xrState.placing) return
      if(!localSpace.current) return

      xrState.placing=true

      const hitPose=
      lastHit.current.getPose(localSpace.current)

      if(!hitPose) return

      ;(lastHit.current as any)
      .createAnchor(hitPose.transform)
      .then((anchor:any)=>{

        const model=
        SkeletonUtils.clone(buildingGLTF.scene)

        const box=new THREE.Box3().setFromObject(model)
        const size=new THREE.Vector3()
        box.getSize(size)
        const max=Math.max(size.x,size.y,size.z)

        model.scale.setScalar(REAL_WORLD_SIZE/max)
        model.updateMatrixWorld(true)

        const pivot=new THREE.Group()
        pivot.add(model)

        xrState.object={anchor,object:pivot}
        xrState.placed=true
      })
    }

    xr.addEventListener("select",onSelect)
    return()=>xr.removeEventListener("select",onSelect)

  },[session])

  /* FRAME */

  useFrame((_,__,frame)=>{

    if(!frame) return
    if(!hitSource.current) return
    if(!localSpace.current) return

    const hits=
    frame.getHitTestResults(hitSource.current)

    if(hits.length===0){
      reticle.current.visible=false
      return
    }

    const pose=
    hits[0].getPose(localSpace.current)

    if(!pose) return

    lastHit.current=hits[0]

    if(!xrState.placed){

      reticle.current.visible=true
      reticle.current.position.set(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      )
      reticle.current.rotation.x=-Math.PI/2

    }else{
      reticle.current.visible=false
    }

    if(!xrState.object) return

    const objPose=
    frame.getPose(
      xrState.object.anchor.anchorSpace,
      localSpace.current
    )

    if(!objPose) return

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
        <ringGeometry args={[0.05,0.07,32]}/>
        <meshBasicMaterial color="white"/>
      </mesh>

      {xrState.object && (
        <primitive object={xrState.object.object}/>
      )}
    </>
  )
}

export default function BuildingARScene(){

  useEffect(()=>{
    const start=async()=>{
      if(!navigator.xr) return
      await store.enterAR()
    }
    window.addEventListener("start-webxr",start)
    return()=>window.removeEventListener("start-webxr",start)
  },[])

  return(
    <div style={{width:"100%",height:"100%"}}>
      <Canvas
        shadows
        gl={{antialias:true,alpha:true}}
        onCreated={({gl,scene})=>{
          gl.autoClear=false
          scene.background=null
          gl.outputColorSpace=THREE.SRGBColorSpace
          gl.toneMapping=THREE.ACESFilmicToneMapping
        }}
      >
        <XR store={store}>
          <ambientLight intensity={0.8}/>
          <PlacementSystem/>
        </XR>
      </Canvas>
    </div>
  )
}