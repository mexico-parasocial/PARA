import {describe, it} from 'node:test'
import assert from 'node:assert'

import {isInternalHostname} from './redirect.js'

describe('isInternalHostname', () => {
  // Public / safe hostnames that should NOT be blocked
  const safeHostnames = [
    'bsky.app',
    'example.com',
    'sub.domain.example.co.uk',
    '192.com',
    '127.com',
    '10.com',
    '172.com',
    'localhost.com',
    'notlocal.host',
    'example.localdomain',
    '200.200.200.200',
    '8.8.8.8',
    '1.1.1.1',
    '255.255.255.255',
    '123.45.67.89',
  ]

  for (const hostname of safeHostnames) {
    it(`returns false for public hostname: ${hostname}`, () => {
      assert.strictEqual(
        isInternalHostname(hostname),
        false,
        `expected ${hostname} to be public`,
      )
    })
  }

  // Internal / unsafe hostnames that SHOULD be blocked
  const unsafeHostnames = [
    // IPv4 loopback variants
    '127.0.0.1',
    '127.1.1.1',
    '127.255.255.255',
    '127.1',
    '127.0.1',
    '127.0.0.1:8080',

    // IPv4 shorthand loopback
    '127.1',
    '127.0.1',

    // 0.0.0.0 / zero-net
    '0.0.0.0',
    '0.1.2.3',
    '0.255.255.255',

    // RFC1918 private ranges
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.1',
    '192.168.255.255',

    // Link-local
    '169.254.1.1',
    '169.254.255.255',

    // TEST-NET ranges
    '192.0.2.1',
    '198.51.100.1',
    '203.0.113.1',

    // localhost variants
    'localhost',
    'localhost.localdomain',
    'localhost4',
    'localhost6',

    // mDNS / Bonjour / RFC6761 special-use
    'myhost.local',
    'something.local',
    'anything.localhost',

    // IPv6 loopback
    '[::1]',
    '[::]',
    '[0:0:0:0:0:0:0:0]',
    '[0:0:0:0:0:0:0:1]',

    // IPv4-mapped IPv6 loopback
    '[::ffff:127.0.0.1]',
    '[::ffff:127.1.1.1]',
    '[::ffff:7f00:1]',

    // IDN / Punycode (homograph attack prevention)
    'xn--localhost-ob26h',
    'xn--bky-6cd.app',
  ]

  for (const hostname of unsafeHostnames) {
    it(`returns true for internal hostname: ${hostname}`, () => {
      assert.strictEqual(
        isInternalHostname(hostname),
        true,
        `expected ${hostname} to be internal`,
      )
    })
  }

  // Case insensitivity
  it('is case-insensitive for localhost', () => {
    assert.strictEqual(isInternalHostname('LOCALHOST'), true)
    assert.strictEqual(isInternalHostname('LocalHost'), true)
  })

  it('is case-insensitive for IPv4', () => {
    assert.strictEqual(isInternalHostname('127.0.0.1'), true)
  })

  it('is case-insensitive for punycode', () => {
    assert.strictEqual(isInternalHostname('XN--localhost-ob26h'), true)
    assert.strictEqual(isInternalHostname('Xn--Bky-6cd.App'), true)
  })
})
