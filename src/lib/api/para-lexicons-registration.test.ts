import {BskyAgent} from '@atproto/api'

import {registerParaLexicons} from './para-lexicons-registration'

describe('registerParaLexicons', () => {
  it('registers timeline party and community params', () => {
    const agent = new BskyAgent({service: 'https://example.com'})

    registerParaLexicons(agent)

    const def = agent.lex.getDef('com.para.feed.getTimeline#main')
    expect(def).toMatchObject({
      type: 'query',
      parameters: {
        properties: {
          party: {type: 'string', maxLength: 128},
          community: {type: 'string', maxLength: 128},
        },
      },
    })
  })

  it('overwrites stale locally registered timeline params', () => {
    const agent = new BskyAgent({service: 'https://example.com'})
    agent.lex.add({
      lexicon: 1,
      id: 'com.para.feed.getTimeline',
      defs: {
        main: {
          type: 'query',
          parameters: {
            type: 'params',
            properties: {
              limit: {type: 'integer'},
            },
          },
          output: {
            encoding: 'application/json',
            schema: {type: 'object', properties: {}},
          },
        },
      },
    })

    registerParaLexicons(agent)

    const def = agent.lex.getDef('com.para.feed.getTimeline#main')
    expect(def).toMatchObject({
      parameters: {
        properties: {
          party: {type: 'string', maxLength: 128},
          community: {type: 'string', maxLength: 128},
        },
      },
    })
  })

  it('registers collection procedures used by the civic tree', () => {
    const agent = new BskyAgent({service: 'https://example.com'})

    registerParaLexicons(agent)

    expect(
      agent.lex.getDef('com.para.collection.createCollection#main'),
    ).toMatchObject({
      type: 'procedure',
      input: {
        schema: {
          required: ['name'],
        },
      },
    })
    expect(
      agent.lex.getDef('com.para.collection.updateCollection#main'),
    ).toMatchObject({
      type: 'procedure',
      input: {
        schema: {
          required: ['id', 'collection'],
        },
      },
    })
  })

  it('registers collection items for mixed civic tree cards', () => {
    const agent = new BskyAgent({service: 'https://example.com'})

    registerParaLexicons(agent)

    expect(
      agent.lex.getDef('com.para.collection.defs#civicTreeItem'),
    ).toMatchObject({
      required: ['addedAt'],
      properties: {
        itemId: {type: 'string', maxLength: 200},
        kind: {
          type: 'string',
          knownValues: ['policy', 'post', 'link', 'note', 'evidence'],
        },
        title: {type: 'string', maxLength: 500},
        description: {type: 'string', maxLength: 2000},
        url: {type: 'string', format: 'uri', maxLength: 2000},
        sourceUri: {type: 'string', format: 'at-uri'},
        policyUri: {type: 'string', format: 'at-uri'},
      },
    })
    expect(
      agent.lex.getDef('com.para.collection.defs#civicTreeRelation'),
    ).toMatchObject({
      required: ['id', 'fromItemId', 'toItemId', 'kind', 'createdAt'],
      properties: {
        kind: {
          knownValues: [
            'supports',
            'opposes',
            'evidence_for',
            'context_for',
            'duplicates',
            'depends_on',
            'related_to',
          ],
        },
      },
    })
  })

  it('registers community join with the backend communityUri payload', () => {
    const agent = new BskyAgent({service: 'https://example.com'})

    registerParaLexicons(agent)

    expect(agent.lex.getDef('com.para.community.join#main')).toMatchObject({
      type: 'procedure',
      input: {
        schema: {
          required: ['communityUri'],
          properties: {
            communityUri: {type: 'string', format: 'at-uri'},
            source: {type: 'string'},
          },
        },
      },
    })
    expect(agent.lex.getDef('com.para.community.leave#main')).toMatchObject({
      type: 'procedure',
      input: {
        schema: {
          required: ['communityUri'],
          properties: {
            communityUri: {type: 'string', format: 'at-uri'},
          },
        },
      },
    })
  })

  it('registers highlight queries with backend parameter names', () => {
    const agent = new BskyAgent({service: 'https://example.com'})

    registerParaLexicons(agent)

    expect(agent.lex.getDef('com.para.highlight.getHighlight#main')).toMatchObject({
      type: 'query',
      parameters: {
        required: ['highlight'],
        properties: {
          highlight: {type: 'string', format: 'at-uri'},
        },
      },
    })
    expect(
      agent.lex.getDef('com.para.highlight.listHighlights#main'),
    ).toMatchObject({
      type: 'query',
      parameters: {
        properties: {
          community: {type: 'string'},
          state: {type: 'string'},
          subject: {type: 'string', format: 'at-uri'},
          creator: {type: 'string', format: 'did'},
        },
      },
    })
  })
})
