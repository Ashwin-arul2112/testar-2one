"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { XR, createXRStore, useXR } from "@react-three/xr"
import { useGLTF } from "@react-three/drei"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { SkeletonUtils } from "three-stdlib"
import { useRouter } from "next/navigation"

/* XR STORE */

export const store=createXRStore({
  requiredFeatures:["hit-test","anchors","local-floor"]
} as any)

/* SESSION LOCK STATE */

const sessionState={
  hitSource:null as XRHitTestSource|null,
  listenerAdded:false,
  placing:false,
  placed:false,
  animating:false,
  redirecting:false
}

function PlacementSystem(){

  const {session}=useXR()
  const router=useRouter()
  const giftGLTF=useGLTF("/models/gift_box.glb")

  const localSpace=useRef<XRReferenceSpace|null>(null)
  const lastHit=useRef<any>(null)
  const reticle=useRef<THREE.Mesh>(null!)

  const anchorGroup=useRef<THREE.Group|null>(null)
  const mixer=useRef<THREE.AnimationMixer|null>(null)
  const actions=useRef<THREE.AnimationAction[]>([])

  /* RUN ONLY WHEN XR SESSION CHANGES */

  useEffect(()=>{

    if(!session) return

    /* RESET ON NEW SESSION */

    sessionState.hitSource=null
    sessionState.listenerAdded=false
    sessionState.placing=false
    sessionState.placed=false
    sessionState.animating=false
    sessionState.redirecting=false

    const xr=session as XRSession

    Promise.all([
      xr.requestReferenceSpace("viewer"),
      xr.requestReferenceSpace("local-floor")
    ])
    .then(([viewer,local])=>{

      localSpace.current=local

      ;(xr as any)
      .requestHitTestSource({space:viewer})
      .then((src:any)=>{
        sessionState.hitSource=src
      })
    })

    if(sessionState.listenerAdded) return
    sessionState.listenerAdded=true

    const onSelect=()=>{

      if(!lastHit.current) return
      if(sessionState.redirecting) return

      /* SECOND TAP → PLAY */

      if(sessionState.placed && !sessionState.animating){

        sessionState.animating=true
        actions.current.forEach(a=>a.reset().play())
        return
      }

      /* BLOCK MULTI PLACE */

      if(sessionState.placed || sessionState.placing) return
      sessionState.placing=true

      const hitPose=
      lastHit.current.getPose(localSpace.current!)

      if(!hitPose) return

      ;(lastHit.current as any)
      .createAnchor(hitPose.transform)
      .then((anchor:any)=>{

        const model=
        SkeletonUtils.clone(giftGLTF.scene)

        const box=new THREE.Box3().setFromObject(model)
        const size=new THREE.Vector3()
        box.getSize(size)
        const max=Math.max(size.x,size.y,size.z)

        model.scale.setScalar(0.6/max)

        const liftBox=new THREE.Box3().setFromObject(model)
        const liftSize=new THREE.Vector3()
        liftBox.getSize(liftSize)
        model.position.y=liftSize.y/2

        const pivot=new THREE.Group()
        pivot.add(model)

        anchorGroup.current=new THREE.Group()
        anchorGroup.current.add(pivot)

        mixer.current=new THREE.AnimationMixer(pivot)

        giftGLTF.animations.forEach((clip)=>{

          const action=mixer.current!.clipAction(clip)
          action.setLoop(THREE.LoopOnce,1)
          action.clampWhenFinished=true
          action.paused=true

          actions.current.push(action)
        })

        mixer.current.addEventListener("finished",async ()=>{

          if(sessionState.redirecting) return
          sessionState.redirecting=true

          await xr.end()

          setTimeout(()=>{
            router.push("/ar/building")
          },500)
        })

        sessionState.placed=true
      })
    }

    xr.addEventListener("select",onSelect)

    return()=>{
      xr.removeEventListener("select",onSelect)
    }

  },[session])

  useFrame((_,delta,frame)=>{

    if(!frame) return
    if(!sessionState.hitSource) return
    if(!localSpace.current) return

    const hits=
    frame.getHitTestResults(sessionState.hitSource)

    if(hits.length===0){
      reticle.current.visible=false
      return
    }

    const pose=hits[0].getPose(localSpace.current)
    if(!pose) return

    lastHit.current=hits[0]

    reticle.current.visible=true
    reticle.current.position.set(
      pose.transform.position.x,
      pose.transform.position.y,
      pose.transform.position.z
    )
    reticle.current.rotation.x=-Math.PI/2

    if(!anchorGroup.current) return

    const objPose=
    frame.getPose(
      (lastHit.current as any).anchorSpace,
      localSpace.current
    )

    if(!objPose) return

    anchorGroup.current.position.set(
      objPose.transform.position.x,
      objPose.transform.position.y,
      objPose.transform.position.z
    )

    anchorGroup.current.quaternion.set(
      objPose.transform.orientation.x,
      objPose.transform.orientation.y,
      objPose.transform.orientation.z,
      objPose.transform.orientation.w
    )

    mixer.current?.update(delta)
  })

  return(
    <>
      <mesh ref={reticle} visible={false}>
        <ringGeometry args={[0.05,0.07,32]}/>
        <meshBasicMaterial color="white"/>
      </mesh>

      {anchorGroup.current && (
        <primitive object={anchorGroup.current}/>
      )}
    </>
  )
}

export default function GiftARScene(){

  return(
    <div style={{width:"100%",height:"100%"}}>
      <Canvas
        gl={{antialias:true,alpha:true}}
        onCreated={({gl,scene})=>{
          gl.autoClear=false
          scene.background=null
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