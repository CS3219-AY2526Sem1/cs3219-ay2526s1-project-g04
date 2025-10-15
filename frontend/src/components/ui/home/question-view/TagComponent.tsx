interface props {
  tagText: string;
  color_hex: string;
}

export default function TagComponent({ tagText, color_hex }: props) {
  return (
    <span
      className='py-1 px-4 rounded-full border'
      style={{
        borderColor: color_hex,
        color: color_hex
      }}>
      {tagText}
    </span>
  )
}
