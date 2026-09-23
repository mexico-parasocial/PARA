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
})
