"use client"

import { useState } from "react"
import GiftARScene, { store } from "../components/GiftARScene"

export default function Page(){

  const [entered,setEntered]=useState(false)

  const startAR=async()=>{

    if(!navigator.xr){
      alert("AR not supported on this device")
      return
    }

    await store.enterAR()
    setEntered(true)
  }

  return(

    <main
      style={{
        position:"fixed",
        inset:0,
        width:"100vw",
        height:"100dvh",
        background:"#000",
        overflow:"hidden"
      }}
    >

      {/* XR CANVAS */}

      <GiftARScene/>

      {/* ENTRY OVERLAY */}

      {!entered && (

        <div
          style={{
            position:"absolute",
            inset:0,
            display:"flex",
            flexDirection:"column",
            justifyContent:"center",
            alignItems:"center",
            background:"#000",
            zIndex:10
          }}
        >

          <h2 style={{marginBottom:12}}>
            Scan your surface
          </h2>

          <p
            style={{
              opacity:0.6,
              marginBottom:24,
              textAlign:"center"
            }}
          >
            Move phone slowly to detect table or floor
          </p>

          <button
            onClick={startAR}
            style={{
              padding:"14px 28px",
              borderRadius:999,
              background:"#fff",
              color:"#000",
              fontWeight:500
            }}
          >
            Start AR
          </button>

        </div>
      )}

      {/* INSTRUCTIONS */}

      {entered && (

        <div
          style={{
            position:"absolute",
            bottom:40,
            width:"100%",
            textAlign:"center",
            color:"#fff",
            fontSize:14,
            zIndex:5,
            pointerEvents:"none"
          }}
        >
          Tap to place gift
        </div>

      )}

    </main>
  )
}