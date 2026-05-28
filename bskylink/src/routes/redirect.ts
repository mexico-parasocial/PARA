import assert from 'node:assert'

import {DAY, SECOND} from '@atproto/common'
import {type Express} from 'express'

import {type AppContext} from '../context.js'
import {linkRedirectContents} from '../html/linkRedirectContents.js'
import {linkWarningContents} from '../html/linkWarningContents.js'
import {linkWarningLayout} from '../html/linkWarningLayout.js'
import {redirectLogger} from '../logger.js'
import {handler} from './util.js'

export function isInternalHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  // Block punycode/IDN domains to prevent homograph attacks
  if (lower.startsWith('xn--')) {
    return true
  }

  // localhost variants and mDNS (.local, .localhost)
  if (
    lower === 'localhost' ||
    lower === 'localhost.' ||
    lower === 'localhost.localdomain' ||
    lower.endsWith('.local') ||
    lower.endsWith('.localhost')
  ) {
    return true
  }

  // IPv6
  if (lower.startsWith('[')) {
    // Loopback and unspecified
    if (
      lower === '[::1]' ||
      lower === '[::]' ||
      lower === '[0:0:0:0:0:0:0:0]' ||
      lower === '[0:0:0:0:0:0:0:1]'
    ) {
      return true
    }
    // IPv4-mapped IPv6 loopback (::ffff:127.*)
    if (
      lower.startsWith('[::ffff:127.') ||
      lower.startsWith('[::ffff:7f') ||
      lower.startsWith('[::ffff:0:127.') ||
      lower.startsWith('[::ffff:0:7f')
    ) {
      return true
    }
    // IPv4-mapped IPv6 for 0.0.0.0
    if (lower === '[::ffff:0:0]' || lower === '[::ffff:0.0.0.0]') {
      return true
    }
    return false
  }

  // IPv4 shorthand: 127.1, 127.0.1, etc. all resolve to 127.0.0.1
  // Only block if the remainder looks like an IP address (digits and dots)
  // to avoid blocking public domains like 127.com
  if (lower.startsWith('127.')) {
    const rest = lower.slice(4)
    if (/^[0-9.]+$/.test(rest)) {
      return true
    }
  }

  // Check for standard dotted-decimal IPv4
  const parts = lower.split('.')
  if (parts.length === 4) {
    const nums = parts.map(p => parseInt(p, 10))
    if (nums.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
      // 0.0.0.0/8
      if (nums[0] === 0) return true
      // 10.0.0.0/8
      if (nums[0] === 10) return true
      // 127.0.0.0/8 (already caught by startsWith above, but double-check)
      if (nums[0] === 127) return true
      // 169.254.0.0/16 (link-local)
      if (nums[0] === 169 && nums[1] === 254) return true
      // 172.16.0.0/12
      if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return true
      // 192.168.0.0/16
      if (nums[0] === 192 && nums[1] === 168) return true
      // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
      if (nums[0] === 192 && nums[1] === 0 && nums[2] === 2) return true
      if (nums[0] === 198 && nums[1] === 51 && nums[2] === 100) return true
      if (nums[0] === 203 && nums[1] === 0 && nums[2] === 113) return true
    }
  }

  return false
}

export default function (ctx: AppContext, app: Express) {
  return app.get(
    '/redirect',
    handler(async (req, res) => {
      let link = req.query.u
      assert(
        typeof link === 'string',
        'express guarantees link query parameter is a string',
      )

      let url: URL | undefined
      try {
        url = new URL(link)
      } catch {}

      if (
        !url ||
        (url.protocol !== 'http:' && url.protocol !== 'https:') || // is a http(s) url
        (ctx.cfg.service.hostnames.includes(url.hostname.toLowerCase()) &&
          url.pathname === '/redirect') || // is a redirect loop
        isInternalHostname(url.hostname) // isn't directing to an internal location
      ) {
        ctx.metrics.track('invalid_redirect', {link})
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Location', `https://${ctx.cfg.service.appHostname}`)
        return res.status(302).end()
      }

      // Default to a max age header
      res.setHeader('Cache-Control', `max-age=${(7 * DAY) / SECOND}`)
      res.status(200)
      res.type('html')

      let html: string | undefined
      let whitelisted: 'unknown' | 'yes' = 'unknown'
      let blocked = false
      let warned = false

      if (ctx.cfg.service.safelinkEnabled) {
        const rule = await ctx.safelinkClient.tryFindRule(link)
        if (rule !== 'ok') {
          switch (rule.action) {
            case 'whitelist':
              redirectLogger.info({rule}, 'Whitelist rule matched')
              whitelisted = 'yes'
              break
            case 'block':
              html = linkWarningLayout(
                'Blocked Link Warning',
                linkWarningContents(req, {
                  type: 'block',
                  link: url.href,
                }),
              )
              res.setHeader('Cache-Control', 'no-store')
              redirectLogger.info({rule}, 'Block rule matched')
              blocked = true
              break
            case 'warn':
              html = linkWarningLayout(
                'Malicious Link Warning',
                linkWarningContents(req, {
                  type: 'warn',
                  link: url.href,
                }),
              )
              res.setHeader('Cache-Control', 'no-store')
              redirectLogger.info({rule}, 'Warn rule matched')
              warned = true
              break
            default:
              redirectLogger.warn({rule}, 'Unknown rule matched')
          }
        }
      }

      // If there is no html defined yet, we will create a redirect html
      if (!html) {
        html = linkRedirectContents(url.href)
      }

      ctx.metrics.track('redirect', {
        link,
        whitelisted,
        blocked,
        warned,
        utm_source: req.query.utm_source?.toString(),
        utm_medium: req.query.utm_medium?.toString(),
        utm_campaign: req.query.utm_campaign?.toString(),
        utm_content: req.query.utm_content?.toString(),
        utm_term: req.query.utm_term?.toString(),
      })

      return res.end(html)
    }),
  )
}
