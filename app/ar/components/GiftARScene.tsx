"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { XR, createXRStore, useXR } from "@react-three/xr"
import { useGLTF } from "@react-three/drei"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { SkeletonUtils } from "three-stdlib"
import { useRouter } from "next/navigation"

export const store=createXRStore({
  requiredFeatures:["hit-test","anchors","local-floor"]
} as any)

export const xrState={
  placed:false,
  placing:false,
  animating:false,
  redirecting:false,
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
      if(xrState.redirecting) return

      /* SECOND TAP → PLAY */

      if(xrState.placed && !xrState.animating){

        xrState.animating=true

        xrState.object?.actions?.forEach(a=>{
          a.stop()
          a.reset()
          a.play()
        })

        return
      }

      /* BLOCK MULTI SELECT */

      if(xrState.placed || xrState.placing) return
      xrState.placing=true

      /* PLACE */

      ;(lastHit.current as any)
      .createAnchor()
      .then((anchor:any)=>{

        /* CLONE ROOT */

        const cloned=SkeletonUtils.clone(giftGLTF.scene)

        /* SCALE */

        const box=new THREE.Box3().setFromObject(cloned)
        const size=new THREE.Vector3()
        box.getSize(size)
        const max=Math.max(size.x,size.y,size.z)

        cloned.scale.setScalar(0.6/max)
        cloned.updateMatrixWorld(true)

        /* 🔴 MIXER MUST BIND TO CLONED ROOT */

        let mixer:THREE.AnimationMixer|undefined
        let actions:THREE.AnimationAction[]=[]

        if(giftGLTF.animations.length){

          mixer=new THREE.AnimationMixer(cloned)

          giftGLTF.animations.forEach((clip)=>{

            const action=mixer!.clipAction(clip)

            action.setLoop(THREE.LoopOnce,1)
            action.clampWhenFinished=true
            action.paused=true

            actions.push(action)
          })

          mixer.addEventListener("finished",async ()=>{

            if(xrState.redirecting) return
            xrState.redirecting=true

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

        /* NOW WRAP */

        const pivot=new THREE.Group()
        pivot.add(cloned)

        xrState.object={anchor,object:pivot,mixer,actions}
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
    reticle.current.rotation.x=-Math.PI/2

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
          gl.toneMappingExposure=1
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