"use client"

import { useRouter } from "next/navigation"

export default function Home(){

  const router = useRouter()

  return(

    <main
      style={{
        position:"fixed",
        inset:0,
        width:"100vw",
        height:"100dvh",
        display:"flex",
        flexDirection:"column",
        justifyContent:"space-between",
        paddingTop:"max(28px,env(safe-area-inset-top))",
        paddingBottom:"max(24px,env(safe-area-inset-bottom))",
        paddingLeft:20,
        paddingRight:20,
        background:"#050507",
        overflow:"hidden",
        color:"#fff"
      }}
    >

      {/* BACK LIGHT */}

      <div
        style={{
          position:"absolute",
          top:-160,
          left:"50%",
          transform:"translateX(-50%)",
          width:360,
          height:360,
          borderRadius:"50%",
          background:"radial-gradient(circle,#6a5cff 0%,transparent 65%)",
          filter:"blur(100px)",
          opacity:0.5,
          pointerEvents:"none"
        }}
      />

      <div
        style={{
          position:"absolute",
          bottom:-240,
          left:"50%",
          transform:"translateX(-50%)",
          width:420,
          height:420,
          borderRadius:"50%",
          background:"radial-gradient(circle,#8b7fff 0%,transparent 70%)",
          filter:"blur(120px)",
          opacity:0.35,
          pointerEvents:"none"
        }}
      />

      {/* TITLE */}

      <div style={{zIndex:2}}>
        <h1
          style={{
            fontSize:30,
            fontWeight:600,
            lineHeight:1.25,
            letterSpacing:-0.4
          }}
        >
          Place Objects <br/>In Your Space
        </h1>

        <p
          style={{
            marginTop:6,
            color:"#9a9a9a",
            fontSize:13
          }}
        >
          Tap to launch AR
        </p>
      </div>

      {/* CENTER GLOW */}

      <div
        style={{
          flex:1,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          zIndex:1
        }}
      >
        <div
          style={{
            width:180,
            height:180,
            borderRadius:"50%",
            background:"linear-gradient(145deg,#6a5cff,#8b7fff)",
            filter:"blur(70px)",
            opacity:0.4
          }}
        />
      </div>

      {/* CTA */}

      <div
        style={{
          position:"absolute",
          bottom:"50%",
          left:"50%",
          transform:"translateX(-50%)",
          width:"100%",
          display:"flex",
          justifyContent:"center",
          zIndex:5,
          paddingLeft:20,
          paddingRight:20
        }}
      >
        <button
          onClick={()=>router.push("/ar/gift")}
          style={{
            padding:"14px 32px",
            borderRadius:999,
            backdropFilter:"blur(18px)",
            background:"rgba(255,255,255,0.08)",
            border:"1px solid rgba(255,255,255,0.2)",
            fontSize:14,
            fontWeight:500,
            color:"#fff",
            letterSpacing:0.3,
            boxShadow:"0 10px 30px rgba(0,0,0,0.4)",
            WebkitTapHighlightColor:"transparent",
            minWidth:160
          }}
        >
          Launch AR
        </button>
      </div>

    </main>
  )
}