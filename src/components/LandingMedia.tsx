'use client';

type LandingMediaProps = {
  alt: string;
  className?: string;
  poster?: string;
  src: string;
};

export default function LandingMedia({alt,className='',poster,src}:LandingMediaProps){
  return <figure className={`landing-media ${className}`} onContextMenu={event=>event.preventDefault()} aria-label={alt}>
    <video aria-hidden="true" autoPlay loop muted playsInline preload="metadata" poster={poster} src={src} className="" suppressHydrationWarning/>
    <span className="landing-media-sheen" aria-hidden="true"/>
  </figure>;
}
