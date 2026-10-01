/*
 * This is a reimplementation of what exists in our HTML template files
 * already. Once the React tree mounts, this is what gets rendered first, until
 * the app is ready to go.
 */
/* eslint-disable bsky-internal/avoid-unwrapped-text -- This web-only splash mirrors HTML and renders before text providers are available. */

import {useEffect, useRef, useState} from 'react'

import {Logomark} from '#/view/icons/Logomark'
import {atoms as a, flattenToCSS} from '#/alf'

export function Splash({
  isReady,
  children,
}: React.PropsWithChildren<{
  isReady: boolean
}>) {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const splashRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // hide the static one that's baked into the HTML - gets replaced by our React version below
  useEffect(() => {
    // double rAF ensures that the React version gets painted first
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const splash = document.getElementById('splash')
        if (splash) {
          splash.remove()
        }
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  // when ready, we fade/scale out
  useEffect(() => {
    if (!isReady) return

    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const node = splashRef.current
    const content = contentRef.current
    if (!node?.animate || !content?.animate || reduceMotion) {
      setIsAnimationComplete(true)
      return
    }

    const animations: Animation[] = []
    try {
      const options: KeyframeAnimationOptions = {
        duration: 300,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards',
      }
      const fade = node.animate([{opacity: 1}, {opacity: 0}], options)
      animations.push(fade)
      animations.push(
        content.animate(
          [{transform: 'scale(1)'}, {transform: 'scale(1.5)'}],
          options,
        ),
      )
      fade.onfinish = () => setIsAnimationComplete(true)
    } catch {
      // Animation failures must never keep the app behind the splash.
      animations.forEach(animation => animation.cancel())
      setIsAnimationComplete(true)
    }

    return () => {
      animations.forEach(animation => {
        animation.onfinish = null
        animation.cancel()
      })
    }
  }, [isReady])

  return (
    <>
      {isReady && children}

      {!isAnimationComplete && (
        <div
          ref={splashRef}
          className="para-splash"
          data-ready={isReady}
          style={flattenToCSS([
            a.fixed,
            a.inset_0,
            a.flex,
            a.align_center,
            a.justify_center,
            {pointerEvents: isReady ? 'none' : 'auto'},
          ])}>
          <div ref={contentRef} className="splash-content">
            <div className="splash-logo">
              <Logomark
                allowVariants={false}
                width={40}
                fill="var(--text)"
                aria-hidden
              />
              <span className="splash-logo-text">PARA</span>
            </div>
            <div className="splash-tagline">
              Real people. Real conversations.
            </div>
            <div
              className="splash-loader"
              role="progressbar"
              aria-label="Loading PARA">
              <div className="splash-loader-bar" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
