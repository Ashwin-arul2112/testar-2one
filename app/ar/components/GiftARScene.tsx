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

/* GLOBAL LOCK */

export const xrState={
  placed:false,
  placing:false,
  animating:false,
  redirecting:false,
  object:null as {
    anchor:any
    anchorGroup:THREE.Group
    mixer?:THREE.AnimationMixer
    actions?:THREE.AnimationAction[]
  }|null
}

function PlacementSystem(){

  const {session}=useXR()
  const router=useRouter()
  const giftGLTF=useGLTF("/models/gift_box.glb")

  const viewerSpace=useRef<XRReferenceSpace|null>(null)
  const localSpace=useRef<XRReferenceSpace|null>(null)
  const hitSource=useRef<any>(null)
  const lastHit=useRef<any>(null)
  const reticle=useRef<THREE.Mesh>(null!)

  /* PRODUCTION HIT TEST */

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
      if(xrState.redirecting) return

      /* PLAY OPEN */

      if(xrState.placed && !xrState.animating){

        xrState.animating=true
        xrState.object?.actions?.forEach(a=>{
          a.reset()
          a.play()
        })
        return
      }

      /* BLOCK MULTIPLE */

      if(xrState.placed || xrState.placing) return
      xrState.placing=true

      const hitPose=
      lastHit.current.getPose(localSpace.current!)

      if(!hitPose) return

      ;(lastHit.current as any)
      .createAnchor(hitPose.transform)
      .then((anchor:any)=>{

        const cloned=
        SkeletonUtils.clone(giftGLTF.scene)

        /* SCALE */

        const box=new THREE.Box3().setFromObject(cloned)
        const size=new THREE.Vector3()
        box.getSize(size)
        const max=Math.max(size.x,size.y,size.z)

        cloned.scale.setScalar(0.6/max)
        cloned.updateMatrixWorld(true)

        /* LIFT ABOVE FLOOR */

        const liftBox=new THREE.Box3().setFromObject(cloned)
        const liftSize=new THREE.Vector3()
        liftBox.getSize(liftSize)
        cloned.position.y=liftSize.y/2

        /* XR GROUP */

        const anchorGroup=new THREE.Group()
        anchorGroup.add(cloned)

        /* ANIMATION */

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

            try{
              await (session as XRSession).end()
              setTimeout(()=>{
                router.push("/ar/building")
              },500)
            }catch(e){}
          })
        }

        xrState.object={
          anchor,
          anchorGroup,
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
    if(!localSpace.current) return

    const hits=
    frame.getHitTestResults(hitSource.current)

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

    reticle.current.quaternion.set(
      pose.transform.orientation.x,
      pose.transform.orientation.y,
      pose.transform.orientation.z,
      pose.transform.orientation.w
    )

    reticle.current.rotation.x=-Math.PI/2

    if(!xrState.object) return

    const objPose=
    frame.getPose(
      xrState.object.anchor.anchorSpace,
      localSpace.current
    )

    if(!objPose) return

    xrState.object.anchorGroup.position.set(
      objPose.transform.position.x,
      objPose.transform.position.y,
      objPose.transform.position.z
    )

    xrState.object.anchorGroup.quaternion.set(
      objPose.transform.orientation.x,
      objPose.transform.orientation.y,
      objPose.transform.orientation.z,
      objPose.transform.orientation.w
    )

    xrState.object.mixer?.update(delta)
  })

  return(
    <>
      <mesh ref={reticle} visible={false}>
        <ringGeometry args={[0.05,0.07,32]}/>
        <meshBasicMaterial color="white"/>
      </mesh>

      {xrState.object && (
        <primitive object={xrState.object.anchorGroup}/>
      )}
    </>
  )
}

/* MAIN */

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