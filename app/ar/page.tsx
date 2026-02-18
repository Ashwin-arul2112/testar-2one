"use client"

import dynamic from "next/dynamic"

const ARScene = dynamic(()=>import("./ARScene"),{
  ssr:false
})

export default function ARPage(){

  const startAR = ()=>{
    window.dispatchEvent(new Event("start-webxr"))
  }

  return(
    <main
      style={{
        position:"fixed",
        inset:0,
        width:"100vw",
        height:"100dvh",
        overflow:"hidden",
        background:"#000"
      }}
    >

      {/* ---------- START AR ---------- */}

      <button
        onClick={startAR}
        style={{
          position:"absolute",
          top:"max(18px,env(safe-area-inset-top))",
          left:"50%",
          transform:"translateX(-50%)",
          zIndex:20,
          padding:"12px 26px",
          borderRadius:40,
          backdropFilter:"blur(10px)",
          background:"rgba(255,255,255,0.08)",
          border:"1px solid rgba(255,255,255,0.2)",
          color:"#fff",
          fontSize:14,
          WebkitTapHighlightColor:"transparent"
        }}
      >
        Enter AR
      </button>

      {/* ---------- XR SCENE ---------- */}

      <ARScene/>

    </main>
  )
}