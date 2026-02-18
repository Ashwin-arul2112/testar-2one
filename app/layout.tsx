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
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover"
        />
      </head>

      <body
        className={inter.className}
        style={{
          margin:0,
          padding:0,
          width:"100%",
          height:"100%",
          background:"#000",
          overscrollBehavior:"none",
          WebkitOverflowScrolling:"touch"
        }}
      >
        {children}
      </body>
    </html>
  )
}