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

/* GLOBAL STATE */

export const xrState={
  placed:false,
  object:null as {
    anchor:any
    object:THREE.Group
    mixer?:THREE.AnimationMixer
    actions?:THREE.AnimationAction[]
  }|null
}

function PlacementSystem(){

  const {session}=useXR()
  const router=useRouter()

  const giftGLTF=useGLTF("/models/gift_box.glb")

  const hitSource=useRef<any>(null)
  const lastHit=useRef<any>(null)
  const reticle=useRef<THREE.Mesh>(null!)

  /* HIT TEST */

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

  /* TAP */

  useEffect(()=>{

    if(!session) return
    const xr=session as XRSession

    const onSelect=()=>{

      if(!lastHit.current) return

      /* PLAY OPEN ANIMATION */

      if(xrState.placed && xrState.object?.actions){

        xrState.object.actions.forEach(a=>{
          a.stop()
          a.reset()
          a.play()
        })

        return
      }

      /* PLACE GIFT */

      ;(lastHit.current as any)
      .createAnchor()
      .then((anchor:any)=>{

        const model=SkeletonUtils.clone(giftGLTF.scene)

        const box=new THREE.Box3().setFromObject(model)
        const size=new THREE.Vector3()
        box.getSize(size)
        const max=Math.max(size.x,size.y,size.z)

        model.scale.setScalar(0.6/max)
        model.updateMatrixWorld(true)

        const pivot=new THREE.Group()
        pivot.add(model)

        let mixer:THREE.AnimationMixer|undefined
        let actions:THREE.AnimationAction[]=[]

        if(giftGLTF.animations.length){

          mixer=new THREE.AnimationMixer(pivot)

          giftGLTF.animations.forEach((clip)=>{

            const action=
            mixer!.clipAction(clip,pivot)

            action.setLoop(THREE.LoopOnce,1)
            action.clampWhenFinished=true
            action.paused=true

            actions.push(action)
          })

          /* WHEN GIFT OPENS → CLOSE CAMERA + REDIRECT */

          mixer.addEventListener("finished",async ()=>{

            if(!session) return

            try{

              await (session as XRSession).end()

              setTimeout(()=>{
                router.push("/ar/building")
              },500)

            }catch(e){
              console.warn(e)
            }

          })
        }

        xrState.object={
          anchor,
          object:pivot,
          mixer,
          actions
        }

        xrState.placed=true
      })
    }

    xr.addEventListener("select",onSelect)
    return()=>xr.removeEventListener("select",onSelect)

  },[session])

  /* FRAME */

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

      {xrState.object && (
        <primitive object={xrState.object.object}/>
      )}
    </>
  )
}

export default function GiftARScene(){

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
      <Canvas shadows>
        <XR store={store}>
          <ambientLight intensity={0.6}/>
          <PlacementSystem/>
        </XR>
      </Canvas>
    </div>
  )
}