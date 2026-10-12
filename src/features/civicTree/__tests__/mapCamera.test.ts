import {cameraToShow} from '../map'

const visible = {x: 0, y: 0, width: 800, height: 600}

describe('cameraToShow', () => {
  it('leaves the camera alone when the point is already in view', () => {
    const camera = {x: 0, y: 0, scale: 1}
    expect(cameraToShow(camera, {x: 400, y: 300}, visible)).toBe(camera)
  })

  it('centres a point that is off screen, keeping the zoom', () => {
    const next = cameraToShow({x: 0, y: 0, scale: 2}, {x: 1000, y: 50}, visible)
    expect(next.scale).toBe(2)
    expect(next.x + 1000 * 2).toBe(400)
    expect(next.y + 50 * 2).toBe(300)
  })

  it('treats a point under a panel as hidden', () => {
    // A docked panel covers the right 340px.
    const uncovered = {x: 0, y: 0, width: 460, height: 600}
    const camera = {x: 0, y: 0, scale: 1}
    const next = cameraToShow(camera, {x: 700, y: 300}, uncovered)
    expect(next).not.toBe(camera)
    expect(next.x + 700).toBe(230)
  })

  it('treats a point hugging the edge as hidden', () => {
    const camera = {x: 0, y: 0, scale: 1}
    expect(cameraToShow(camera, {x: 790, y: 300}, visible)).not.toBe(camera)
  })
})
