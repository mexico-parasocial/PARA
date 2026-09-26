// oxlint-disable-next-line import/no-nodejs-modules -- Test-only syntax check of the generated browser script.
import {Script} from 'node:vm'

import {buildConfiguredClientHtml} from './matrix-client'

describe('Matrix client configuration', () => {
  it('sets translated strings before the chat initializer and escapes HTML in room names', () => {
    const html = buildConfiguredClientHtml('window.matrixcs = {};', {
      accessToken: 'token',
      userId: '@alice:example.org',
      homeServer: 'https://example.org',
      deviceId: 'DEVICE',
      roomId: '!room:example.org',
      communityName: '</script><script>bad()</script>',
      strings: {retry: 'Try again', messagePlaceholder: 'Type a message'},
    })

    expect(html.indexOf('window.PARA_CONFIG =')).toBeLessThan(
      html.indexOf('const CONFIG = window.PARA_CONFIG'),
    )
    expect(html).toContain('"retry":"Try again"')
    expect(html).toContain('"messagePlaceholder":"Type a message"')
    expect(html).not.toContain('</script><script>bad()')
    expect(html).toContain('\\u003c/script>')
  })

  it('targets the configured app origin for membership messages', () => {
    const html = buildConfiguredClientHtml(undefined, {
      accessToken: 'token',
      userId: '@alice:example.org',
      homeServer: 'https://example.org',
      deviceId: 'DEVICE',
      roomId: '!room:example.org',
      communityName: 'Community',
      parentOrigin: 'https://app.example.org',
    })

    expect(html).toContain('"parentOrigin":"https://app.example.org"')
    expect(html).toContain(
      'window.parent.postMessage(message, CONFIG.parentOrigin)',
    )
    expect(html).not.toContain("window.parent.postMessage(message, '*')")
  })

  const config = {
    accessToken: 'token',
    userId: '@alice:example.org',
    homeServer: 'https://example.org',
    deviceId: 'DEVICE',
    roomId: '!room:example.org',
    communityName: 'Community',
    parentOrigin: 'https://app.example.org',
    strings: {reportMessage: 'Report message'},
  }

  it('generates inline scripts that parse', () => {
    const html = buildConfiguredClientHtml(undefined, config)
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      m => m[1],
    )
    expect(scripts.length).toBeGreaterThan(0)
    // Compiles without running: a syntax error in the string-built client
    // would otherwise only show up as a blank chat on a device.
    for (const code of scripts) {
      expect(() => new Script(code)).not.toThrow()
    }
  })

  it('reports a message by room and event only, never its text', () => {
    const html = buildConfiguredClientHtml(undefined, config)
    expect(html).toContain('id="report-message"')
    expect(html).toContain('"reportMessage":"Report message"')
    expect(html).toContain(
      "postToApp({type: 'matrix-report-message', roomId: CONFIG.roomId, eventId: eventId})",
    )
    // Own messages hide the action.
    expect(html).toContain(
      "document.getElementById('report-message').hidden = !!isSelf",
    )
  })
})
