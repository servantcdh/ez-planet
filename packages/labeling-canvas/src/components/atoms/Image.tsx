import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Icon from "./Icon";

interface ImageProps {
  className?: string;
  fallback?: React.ReactNode;
  src: string;
  alt: string;
  forceRefresh?: boolean;
  style?: React.CSSProperties;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

function Image({
  className,
  alt,
  src,
  fallback,
  forceRefresh,
  style,
  onLoad,
  onError,
}: ImageProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadHandledRef = useRef(false);

  const forceRefreshSrc = useMemo(() => {
    return forceRefresh ? src + "?t=" + Date.now() : src;
  }, [src, forceRefresh]);

  useEffect(() => {
    loadHandledRef.current = false;
    setShowFallback(false);
  }, [src]);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (loadHandledRef.current) {
        return;
      }
      loadHandledRef.current = true;
      onLoad?.(event);
    },
    [onLoad]
  );

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      if (loadHandledRef.current) {
        return;
      }
      loadHandledRef.current = true;
      setShowFallback(true);
      onError?.(event);
    },
    [onError]
  );

  useEffect(() => {
    if (shouldLoad) {
      return;
    }

    const imageElement = imgRef.current;
    if (!imageElement) {
      return;
    }

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            obs.disconnect();
          }
        });
      },
      {
        rootMargin: "160px",
      }
    );

    observer.observe(imageElement);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    const imageElement = imgRef.current;
    if (!imageElement) {
      return;
    }

    if (imageElement.complete && imageElement.naturalWidth > 0) {
      handleLoad({
        currentTarget: imageElement,
        target: imageElement,
      } as unknown as React.SyntheticEvent<HTMLImageElement>);
    }
  }, [shouldLoad, handleLoad, src]);

  return (
    <>
      {!showFallback && (
        <img
          ref={imgRef}
          className={className}
          alt={alt}
          src={shouldLoad ? forceRefreshSrc : undefined}
          loading="lazy"
          decoding="async"
          style={style}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      {showFallback &&
        (fallback ?? <Icon className="fallback" iconType="icon-broken" />)}
    </>
  );
}

export default Image;
