interface LoaderProps {
  size?: "sm" | "md" | "lg";
  style?: "primary" | "secondary" | "accent";
}

function Loader({ size = "md", style = "secondary" }: LoaderProps) {
  return <div className={`loader loader-${size}`} data-style={style}></div>;
}

export default Loader;
