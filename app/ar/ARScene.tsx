"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { XR, createXRStore, useXR } from "@react-three/xr"
import { useGLTF, Environment } from "@react-three/drei"
import { EffectComposer, Noise } from "@react-three/postprocessing"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { SkeletonUtils } from "three-stdlib"

/* XR STORE */

export const store = createXRStore({
  requiredFeatures:["hit-test","anchors","local-floor"],
  optionalFeatures:["light-estimation"]
} as any)

/* GLOBAL STATE */

export const xrState={
  placed:false,
  object:null as {
    anchor:any
    pivot:THREE.Group
    mixer?:THREE.AnimationMixer
    actions?:THREE.AnimationAction[]
  }|null
}

/* REAL WORLD SIZE (METERS) */

const REAL_WORLD_SIZE=0.6

/* PLACEMENT SYSTEM */

function PlacementSystem(){

  const { session } = useXR()
  const gltf = useGLTF("/models/gift_box.glb")

  const hitSource = useRef<any>(null)
  const lastHit   = useRef<any>(null)
  const reticle   = useRef<THREE.Mesh>(null!)

  useEffect(()=>{

    if(!session) return
    const xr=session as XRSession

    xr.requestReferenceSpace("viewer")
    .then((viewer)=>{

      ;(xr as any)
      .requestHitTestSource({space:viewer})
      .then((src:any)=>{
        hitSource.current=src
      })

    })

  },[session])

  useEffect(()=>{

    if(!session) return
    const xr=session as XRSession

    const onSelect=()=>{

      if(!lastHit.current) return

      /* REVEAL ANIMATION */

      if(xrState.placed && xrState.object?.actions){

        xrState.object.actions.forEach(a=>{
          a.stop()
          a.reset()
          a.play()
        })

        return
      }

      /* PLACE */

      ;(lastHit.current as any)
      .createAnchor()
      .then((anchor:any)=>{

        const model=SkeletonUtils.clone(gltf.scene)

        /* AUTO SCALE */

        const box=new THREE.Box3().setFromObject(model)
        const size=new THREE.Vector3()
        box.getSize(size)
        const max=Math.max(size.x,size.y,size.z)

        model.scale.setScalar(REAL_WORLD_SIZE/max)
        model.updateMatrixWorld(true)

        /* SHADOW ENABLE */

        model.traverse((o:any)=>{
          if(o.isMesh){
            o.castShadow=true
            o.receiveShadow=true
          }
        })

        /* PIVOT FIX (PREVENT ANIMATION DRIFT) */

        const pivot=new THREE.Group()
        pivot.add(model)

        /* ANIMATION */

        let mixer:THREE.AnimationMixer|undefined
        let actions:THREE.AnimationAction[]=[]

        if(gltf.animations.length){

          mixer=new THREE.AnimationMixer(pivot)

          gltf.animations.forEach((clip)=>{

            const action=
            mixer!
            .clipAction(clip,pivot)

            action.setLoop(THREE.LoopOnce,1)
            action.clampWhenFinished=true
            action.paused=true

            actions.push(action)
          })
        }

        xrState.object={
          anchor,
          pivot,
          mixer,
          actions
        }

        xrState.placed=true
      })
    }

    xr.addEventListener("select",onSelect)
    return()=>xr.removeEventListener("select",onSelect)

  },[session])

  useFrame((_,delta,frame)=>{

    if(!frame) return
    if(!hitSource.current) return

    const refSpace=store.getState().originReferenceSpace
    if(!refSpace) return

    const hits=frame.getHitTestResults(hitSource.current)

    if(hits.length===0){
      reticle.current.visible=false
      return
    }

    const pose=hits[0].getPose(refSpace)
    if(!pose) return

    lastHit.current=hits[0]

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

    if(!xrState.object) return

    const objPose=
    frame.getPose(
      xrState.object.anchor.anchorSpace,
      refSpace
    )

    if(!objPose) return

    xrState.object.pivot.position.set(
      objPose.transform.position.x,
      objPose.transform.position.y,
      objPose.transform.position.z
    )

    xrState.object.pivot.quaternion.set(
      objPose.transform.orientation.x,
      objPose.transform.orientation.y,
      objPose.transform.orientation.z,
      objPose.transform.orientation.w
    )

    if(xrState.object.mixer){
      xrState.object.mixer.update(delta)
    }
  })

  return(
    <>
      <mesh ref={reticle} visible={false}>
        <ringGeometry args={[0.05,0.07,32]}/>
        <meshBasicMaterial color="white"/>
      </mesh>

      {/* CONTACT SHADOW */}

      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow position={[0,-0.001,0]}>
        <planeGeometry args={[5,5]}/>
        <shadowMaterial opacity={0.35}/>
      </mesh>

      {xrState.object && (
        <primitive object={xrState.object.pivot}/>
      )}
    </>
  )
}

/* MAIN */

export default function ARScene(){

  useEffect(()=>{

    const start=async()=>{
      if(!navigator.xr) return
      await store.enterAR()
    }

    window.addEventListener("start-webxr",start)
    return()=>window.removeEventListener("start-webxr",start)

  },[])

  return(
    <div style={{
      width:"100%",
      height:"65vh",
      borderRadius:"24px",
      overflow:"hidden",
      background:"#000"
    }}>
      <Canvas
        shadows
        gl={{
          antialias:true,
          alpha:true
        }}
        onCreated={({gl})=>{

          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1

        }}
      >

        <XR store={store}>

          <ambientLight intensity={0.5}/>
          <Environment preset="apartment"/>

          <PlacementSystem/>

          <EffectComposer>
            <Noise opacity={0.025}/>
          </EffectComposer>

        </XR>
      </Canvas>
    </div>
  )
}