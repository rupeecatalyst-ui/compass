export default function Image({ src, alt, ...props }) {
  return <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} {...props} />;
}
