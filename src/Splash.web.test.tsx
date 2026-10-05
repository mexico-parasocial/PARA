/** @jest-environment jsdom */
import fs from 'node:fs'
import path from 'node:path'

import {act} from 'react'
import {createRoot, type Root} from 'react-dom/client'

import {Splash} from './Splash.web'

jest.mock('#/alf', () => ({
  atoms: {},
  flattenToCSS: (styles: object[]) => Object.assign({}, ...styles),
}))

jest.mock('#/view/icons/Logomark', () => ({
  Logomark: () => <svg data-testid="para-mark" />,
}))

type TestAnimation = {
  cancel: jest.Mock
  onfinish: (() => void) | null
}

let container: HTMLDivElement
let root: Root
let frames: Map<number, FrameRequestCallback>
let animations: TestAnimation[]
let animate: jest.Mock<TestAnimation, [Keyframe[], KeyframeAnimationOptions]>
let reducedMotion: boolean
let frameId: number

function render(isReady: boolean) {
  act(() => {
    root.render(
      <Splash isReady={isReady}>
        {/* eslint-disable-next-line bsky-internal/avoid-unwrapped-text -- DOM fixture for the web splash. */}
        <div data-testid="app">App content</div>
      </Splash>,
    )
  })
}

function paintFrame() {
  const pending = [...frames.entries()]
  frames.clear()
  pending.forEach(([, callback]) => callback(0))
}

beforeEach(() => {
  Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true})
  document.body.innerHTML = '<div id="splash">Initial HTML splash</div>'
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  frames = new Map()
  frameId = 0
  animations = []
  reducedMotion = false
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++frameId, callback)
    return frameId
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
    // React Native's global typing makes the handle nullable; there is no frame
    // to forget for a nullish one.
    if (id != null) frames.delete(id)
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn(() => ({matches: reducedMotion})),
  })
  animate = jest.fn<TestAnimation, [Keyframe[], KeyframeAnimationOptions]>(
    () => {
      const animation: TestAnimation = {cancel: jest.fn(), onfinish: null}
      animations.push(animation)
      return animation
    },
  )
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: animate,
  })
})

afterEach(() => {
  act(() => root.unmount())
  jest.restoreAllMocks()
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate
  document.body.innerHTML = ''
})

it('keeps the PARA splash visible and the app hidden while startup is pending', () => {
  render(false)
  expect(container.querySelector('[data-testid="para-mark"]')).not.toBeNull()
  expect(container.textContent).toContain('Real people. Real conversations.')
  expect(container.querySelector('[data-testid="app"]')).toBeNull()
  const indicator = container.querySelector('[role="progressbar"]')
  expect(indicator?.getAttribute('aria-label')).toBe('Loading PARA')
  expect(indicator?.hasAttribute('aria-valuenow')).toBe(false)
  expect(animate).not.toHaveBeenCalled()
})

it('removes the initial HTML splash only after the React splash has painted', () => {
  render(false)
  paintFrame()
  expect(document.getElementById('splash')).not.toBeNull()
  paintFrame()
  expect(document.getElementById('splash')).toBeNull()
  expect(container.querySelector('.para-splash')).not.toBeNull()
})

it.each([0, 1])(
  'cancels the pending handoff frame after %i frames on unmount',
  paints => {
    render(false)
    for (let i = 0; i < paints; i++) paintFrame()
    act(() => root.unmount())
    expect(frames.size).toBe(0)
    expect(document.getElementById('splash')).not.toBeNull()
  },
)

it('reveals the app when ready and removes the splash after the 300ms exit', () => {
  render(false)
  render(true)
  expect(container.querySelector('[data-testid="app"]')).not.toBeNull()
  expect(container.querySelector('.para-splash')).not.toBeNull()
  expect(
    container.querySelector('.para-splash')?.getAttribute('data-ready'),
  ).toBe('true')
  expect(animate).toHaveBeenCalledTimes(2)
  expect(animate.mock.calls[0][1]).toMatchObject({duration: 300})
  act(() => animations[0].onfinish?.())
  expect(container.querySelector('.para-splash')).toBeNull()
  expect(container.querySelector('[data-testid="app"]')).not.toBeNull()
})

it('skips the exit animation when reduced motion is requested', () => {
  reducedMotion = true
  render(true)
  expect(animate).not.toHaveBeenCalled()
  expect(container.querySelector('.para-splash')).toBeNull()
  expect(container.querySelector('[data-testid="app"]')).not.toBeNull()
})

it('dismisses immediately when the browser has no animation support', () => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate
  render(true)
  expect(container.querySelector('.para-splash')).toBeNull()
  expect(container.querySelector('[data-testid="app"]')).not.toBeNull()
})

it('cancels an already-created animation and reveals the app if animation setup fails', () => {
  animate
    .mockImplementationOnce(() => {
      const animation: TestAnimation = {cancel: jest.fn(), onfinish: null}
      animations.push(animation)
      return animation
    })
    .mockImplementationOnce(() => {
      throw new Error('Animation unavailable')
    })
  render(true)
  expect(animations[0].cancel).toHaveBeenCalled()
  expect(container.querySelector('.para-splash')).toBeNull()
  expect(container.querySelector('[data-testid="app"]')).not.toBeNull()
})

it('clears completion callbacks and cancels both exit animations on unmount', () => {
  render(true)
  act(() => root.unmount())
  expect(animations).toHaveLength(2)
  animations.forEach(animation => {
    expect(animation.onfinish).toBeNull()
    expect(animation.cancel).toHaveBeenCalledTimes(1)
  })
})

it('keeps both pre-React web splashes consistent, animated, and accessible', () => {
  const templates = ['web/index.html', 'bskyweb/templates/base.html'].map(
    file => {
      const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
      return new DOMParser().parseFromString(source, 'text/html')
    },
  )
  const styles = templates.map(template => {
    const css = template.querySelector('style')!.textContent
    return css.slice(
      css.indexOf('      .para-splash {'),
      css.indexOf('      /**', css.indexOf('      .para-splash {')),
    )
  })
  expect(styles[0]).toBe(styles[1])
  expect(styles[0]).toContain('para-splash-loading 1.2s')
  expect(styles[0]).toContain('prefers-reduced-motion: reduce')
  expect(templates[0].getElementById('splash')!.outerHTML).toBe(
    templates[1].getElementById('splash')!.outerHTML,
  )
  templates.forEach(template => {
    const splash = template.getElementById('splash')!
    expect(splash.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 2048 2048',
    )
    expect(
      splash.querySelector('[role="progressbar"]')?.getAttribute('aria-label'),
    ).toBe('Loading PARA')
    expect(splash.querySelector('[aria-valuenow]')).toBeNull()
  })
})
