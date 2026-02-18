export default function ARControls({
  rotate,
  scaleUp,
  scaleDown
}:any){

  return(
    <div
      style={{
        position:"absolute",
        top:20,
        left:20,
        display:"flex",
        gap:10
      }}
    >

      <button onClick={rotate}>
        Rotate
      </button>

      <button onClick={scaleUp}>
        Scale +
      </button>

      <button onClick={scaleDown}>
        Scale -
      </button>

    </div>
  )
}