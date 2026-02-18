import { Inter } from "next/font/google"

const inter = Inter({ subsets:["latin"] })

export default function RootLayout({
  children
}:{
  children:React.ReactNode
}){

  return(
    <html
      lang="en"
      style={{
        width:"100%",
        height:"100%",
        margin:0,
        padding:0
      }}
    >
      <head>

        {/* REQUIRED FOR WEBXR */}

        <meta
          name="viewport"
          content="width=device-width,
                   initial-scale=1,
                   maximum-scale=1,
                   user-scalable=no,
                   viewport-fit=cover"
        />

        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>

        {/* ALLOW CAMERA */}

        <meta
          httpEquiv="origin-trial"
          content=""
        />

      </head>

      <body
        className={inter.className}
        style={{
          margin:0,
          padding:0,
          width:"100%",
          height:"100%",
          overflow:"hidden",
          background:"#000",
          touchAction:"none",
          overscrollBehavior:"none",
          WebkitOverflowScrolling:"touch"
        }}
      >
        {children}
      </body>
    </html>
  )
}