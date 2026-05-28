import {type BskyAgent} from '@atproto/api'

/**
 * Para Lexicon Registration
 *
 * The published @atproto/api npm package does not include PARA's custom
 * lexicons (com.para.*).  agent.call() validates every method against the
 * agent's internal Lexicons collection and throws "Lexicon not found" if the
 * schema is missing.  This helper registers all PARA lexicons at runtime so
 * civic and community XRPC calls work in the PARA app.
 */

// ─── Civic ───────────────────────────────────────────────────────────────────

const listCabildeos = {
  lexicon: 1,
  id: 'com.para.civic.listCabildeos',
  defs: {
    main: {
      type: 'query' as const,
      description:
        'List indexed Cabildeos with aggregate summaries and optional viewer context.',
      parameters: {
        type: 'params' as const,
        properties: {
          community: {
            type: 'string' as const,
            maxLength: 100,
          },
          phase: {
            type: 'string',
            enum: ['draft', 'open', 'deliberating', 'voting', 'resolved'],
          },
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 30,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['cabildeos'],
          properties: {
            cursor: {type: 'string' as const},
            cabildeos: {
              type: 'array' as const,
              items: {
                type: 'ref' as const,
                ref: 'lex:com.para.civic.defs#cabildeoView',
              },
            },
          },
        },
      },
    },
  },
}

const getCabildeo = {
  lexicon: 1,
  id: 'com.para.civic.getCabildeo',
  defs: {
    main: {
      type: 'query' as const,
      description: 'Get a single Cabildeo with full viewer context.',
      parameters: {
        type: 'params' as const,
        properties: {
          cabildeo: {type: 'string' as const, format: 'at-uri'},
          voteNullifier: {type: 'string' as const, maxLength: 128},
          eligibilityProofRef: {type: 'string' as const, maxLength: 512},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            cabildeo: {
              type: 'ref' as const,
              ref: 'lex:com.para.civic.defs#cabildeoView',
            },
          },
        },
      },
    },
  },
}

const listCabildeoPositions = {
  lexicon: 1,
  id: 'com.para.civic.listCabildeoPositions',
  defs: {
    main: {
      type: 'query' as const,
      description: 'List positions on a Cabildeo.',
      parameters: {
        type: 'params' as const,
        properties: {
          cabildeo: {type: 'string' as const, format: 'at-uri'},
          stance: {
            type: 'string' as const,
            knownValues: ['for', 'against', 'amendment'],
          },
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 30,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['positions'],
          properties: {
            cursor: {type: 'string' as const},
            positions: {
              type: 'array' as const,
              items: {
                type: 'ref' as const,
                ref: 'lex:com.para.civic.defs#positionView',
              },
            },
          },
        },
      },
    },
  },
}

const listDelegationCandidates = {
  lexicon: 1,
  id: 'com.para.civic.listDelegationCandidates',
  defs: {
    main: {
      type: 'query' as const,
      description: 'List eligible delegation candidates for a Cabildeo.',
      parameters: {
        type: 'params' as const,
        properties: {
          cabildeo: {type: 'string' as const, format: 'at-uri'},
          communityId: {type: 'string' as const},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['candidates'],
          properties: {
            cursor: {type: 'string' as const},
            candidates: {
              type: 'array' as const,
              items: {type: 'unknown' as const},
            },
          },
        },
      },
    },
  },
}

const castVote = {
  lexicon: 1,
  id: 'com.para.civic.castVote',
  defs: {
    main: {
      type: 'procedure' as const,
      description: 'Cast a vote on a Cabildeo.',
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['cabildeo', 'selectedOption'],
          properties: {
            cabildeo: {type: 'string' as const, format: 'at-uri'},
            selectedOption: {type: 'integer' as const, minimum: 0},
            voteNullifier: {type: 'string' as const, maxLength: 128},
            eligibilityProofRef: {type: 'string' as const, maxLength: 512},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            uri: {type: 'string' as const, format: 'at-uri'},
            cid: {type: 'string' as const, format: 'cid'},
            commit: {
              type: 'object' as const,
              properties: {
                cid: {type: 'string' as const, format: 'cid'},
                rev: {type: 'string' as const},
              },
            },
          },
        },
      },
    },
  },
}

const putLivePresence = {
  lexicon: 1,
  id: 'com.para.civic.putLivePresence',
  defs: {
    main: {
      type: 'procedure' as const,
      description: 'Report live presence for a Cabildeo session.',
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['cabildeoUri', 'actorDid', 'sessionId', 'present'],
          properties: {
            cabildeoUri: {type: 'string' as const, format: 'at-uri'},
            actorDid: {type: 'string' as const, format: 'did'},
            sessionId: {type: 'string' as const},
            present: {type: 'boolean' as const},
            hostLiveUri: {type: 'string' as const, format: 'uri'},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['cabildeoUri', 'present'],
          properties: {
            cabildeoUri: {type: 'string' as const, format: 'at-uri'},
            present: {type: 'boolean' as const},
            expiresAt: {type: 'string' as const, format: 'datetime'},
          },
        },
      },
    },
  },
}

const getPolicyTally = {
  lexicon: 1,
  id: 'com.para.civic.getPolicyTally',
  defs: {
    main: {
      type: 'query' as const,
      description: 'Get policy tally for a subject.',
      parameters: {
        type: 'params' as const,
        properties: {
          subject: {type: 'string' as const, format: 'at-uri'},
          subjectType: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            tally: {
              type: 'ref' as const,
              ref: 'lex:com.para.civic.defs#policyTally',
            },
          },
        },
      },
    },
  },
}

// ─── Collections ─────────────────────────────────────────────────────────────

const collectionDefs = {
  lexicon: 1,
  id: 'com.para.collection.defs',
  defs: {
    collection: {
      type: 'object' as const,
      required: ['id', 'name', 'items'],
      properties: {
        id: {type: 'string' as const},
        name: {type: 'string' as const, maxLength: 200},
        description: {type: 'string' as const, maxLength: 2000},
        color: {type: 'string' as const, maxLength: 7},
        items: {
          type: 'array' as const,
          items: {
            type: 'ref' as const,
            ref: 'lex:com.para.collection.defs#civicTreeItem',
          },
        },
        relations: {
          type: 'array' as const,
          items: {
            type: 'ref' as const,
            ref: 'lex:com.para.collection.defs#civicTreeRelation',
          },
        },
      },
    },
    civicTreeItem: {
      type: 'object' as const,
      required: ['addedAt'],
      properties: {
        itemId: {type: 'string' as const, maxLength: 200},
        kind: {
          type: 'string' as const,
          knownValues: ['policy', 'post', 'link', 'note', 'evidence'],
        },
        title: {type: 'string' as const, maxLength: 500},
        description: {type: 'string' as const, maxLength: 2000},
        url: {type: 'string' as const, format: 'uri', maxLength: 2000},
        sourceUri: {type: 'string' as const, format: 'at-uri'},
        sourceLabel: {type: 'string' as const, maxLength: 500},
        policyUri: {type: 'string' as const, format: 'at-uri'},
        policyCid: {type: 'string' as const, format: 'cid'},
        policyTitle: {type: 'string' as const, maxLength: 500},
        policyCategory: {type: 'string' as const, maxLength: 200},
        policyColor: {type: 'string' as const, maxLength: 7},
        note: {type: 'string' as const, maxLength: 1000},
        addedAt: {type: 'string' as const, format: 'datetime'},
      },
    },
    civicTreeRelation: {
      type: 'object' as const,
      required: ['id', 'fromItemId', 'toItemId', 'kind', 'createdAt'],
      properties: {
        id: {type: 'string' as const, maxLength: 200},
        fromItemId: {type: 'string' as const, maxLength: 200},
        toItemId: {type: 'string' as const, maxLength: 200},
        kind: {
          type: 'string' as const,
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
        note: {type: 'string' as const, maxLength: 1000},
        createdAt: {type: 'string' as const, format: 'datetime'},
      },
    },
    collectionView: {
      type: 'object' as const,
      required: ['id', 'name', 'items', 'createdAt', 'updatedAt'],
      properties: {
        id: {type: 'string' as const},
        name: {type: 'string' as const},
        description: {type: 'string' as const},
        color: {type: 'string' as const},
        items: {
          type: 'array' as const,
          items: {
            type: 'ref' as const,
            ref: 'lex:com.para.collection.defs#civicTreeItem',
          },
        },
        relations: {
          type: 'array' as const,
          items: {
            type: 'ref' as const,
            ref: 'lex:com.para.collection.defs#civicTreeRelation',
          },
        },
        createdAt: {type: 'string' as const, format: 'datetime'},
        updatedAt: {type: 'string' as const, format: 'datetime'},
      },
    },
  },
}

const listCollections = {
  lexicon: 1,
  id: 'com.para.collection.listCollections',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['collections'],
          properties: {
            cursor: {type: 'string' as const},
            collections: {
              type: 'array' as const,
              items: {
                type: 'ref' as const,
                ref: 'lex:com.para.collection.defs#collectionView',
              },
            },
          },
        },
      },
    },
  },
}

const getCollection = {
  lexicon: 1,
  id: 'com.para.collection.getCollection',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        required: ['id'],
        properties: {
          id: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['collection'],
          properties: {
            collection: {
              type: 'ref' as const,
              ref: 'lex:com.para.collection.defs#collectionView',
            },
          },
        },
      },
      errors: [{name: 'NotFound'}],
    },
  },
}

const createCollection = {
  lexicon: 1,
  id: 'com.para.collection.createCollection',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['name'],
          properties: {
            name: {type: 'string' as const, maxLength: 200},
            description: {type: 'string' as const, maxLength: 2000},
            color: {type: 'string' as const, maxLength: 7},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['id'],
          properties: {
            id: {type: 'string' as const},
          },
        },
      },
    },
  },
}

const updateCollection = {
  lexicon: 1,
  id: 'com.para.collection.updateCollection',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['id', 'collection'],
          properties: {
            id: {type: 'string' as const},
            collection: {
              type: 'ref' as const,
              ref: 'lex:com.para.collection.defs#collection',
            },
          },
        },
      },
      errors: [{name: 'NotFound'}],
    },
  },
}

const deleteCollection = {
  lexicon: 1,
  id: 'com.para.collection.deleteCollection',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['id'],
          properties: {
            id: {type: 'string' as const},
          },
        },
      },
    },
  },
}

// ─── Community ─────────────────────────────────────────────────────────────────

const listBoards = {
  lexicon: 1,
  id: 'com.para.community.listBoards',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 12,
          },
          query: {type: 'string' as const},
          state: {type: 'string' as const},
          quadrant: {type: 'string' as const},
          participationKind: {type: 'string' as const},
          flairId: {type: 'string' as const},
          sort: {type: 'string' as const},
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            cursor: {type: 'string' as const},
            boards: {type: 'array' as const, items: {type: 'unknown' as const}},
          },
        },
      },
    },
  },
}

const listMembers = {
  lexicon: 1,
  id: 'com.para.community.listMembers',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          communityId: {type: 'string' as const},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          membershipState: {type: 'string' as const},
          role: {type: 'string' as const},
          sort: {type: 'string' as const},
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            cursor: {type: 'string' as const},
            members: {
              type: 'array' as const,
              items: {type: 'unknown' as const},
            },
          },
        },
      },
    },
  },
}

const getBoard = {
  lexicon: 1,
  id: 'com.para.community.getBoard',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          communityId: {type: 'string' as const},
          uri: {type: 'string' as const, format: 'at-uri'},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            board: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

const createBoard = {
  lexicon: 1,
  id: 'com.para.community.createBoard',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            name: {type: 'string' as const},
            slug: {type: 'string' as const},
            description: {type: 'string' as const},
            quadrant: {type: 'string' as const},
            participationKind: {type: 'string' as const},
            officialRepresentatives: {
              type: 'array' as const,
              items: {type: 'unknown' as const},
            },
            matterFlairIds: {
              type: 'array' as const,
              items: {type: 'string' as const},
            },
            policyFlairIds: {
              type: 'array' as const,
              items: {type: 'string' as const},
            },
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            uri: {type: 'string' as const, format: 'at-uri'},
            cid: {type: 'string' as const, format: 'cid'},
          },
        },
      },
    },
  },
}

const joinCommunity = {
  lexicon: 1,
  id: 'com.para.community.join',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['communityUri'],
          properties: {
            communityUri: {type: 'string' as const, format: 'at-uri'},
            source: {type: 'string' as const, maxLength: 64},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            uri: {type: 'string' as const, format: 'at-uri'},
            cid: {type: 'string' as const, format: 'cid'},
            communityUri: {type: 'string' as const, format: 'at-uri'},
            membershipState: {type: 'string' as const},
            viewerCapabilities: {
              type: 'array' as const,
              items: {type: 'string' as const},
            },
          },
        },
      },
    },
  },
}

const leaveCommunity = {
  lexicon: 1,
  id: 'com.para.community.leave',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['communityUri'],
          properties: {
            communityUri: {type: 'string' as const, format: 'at-uri'},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            uri: {type: 'string' as const, format: 'at-uri'},
            cid: {type: 'string' as const, format: 'cid'},
            communityUri: {type: 'string' as const, format: 'at-uri'},
            membershipState: {type: 'string' as const},
            viewerCapabilities: {
              type: 'array' as const,
              items: {type: 'string' as const},
            },
          },
        },
      },
    },
  },
}

const getGovernance = {
  lexicon: 1,
  id: 'com.para.community.getGovernance',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          communityId: {type: 'string' as const},
          uri: {type: 'string' as const, format: 'at-uri'},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            governance: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

const listPosts = {
  lexicon: 1,
  id: 'com.para.community.listPosts',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        required: ['community'],
        properties: {
          community: {type: 'string' as const},
          postType: {type: 'string' as const},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['feed'],
          properties: {
            cursor: {type: 'string' as const},
            feed: {type: 'array' as const, items: {type: 'unknown' as const}},
          },
        },
      },
    },
  },
}

const listSharedContent = {
  lexicon: 1,
  id: 'com.para.community.listSharedContent',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        required: ['communityUri'],
        properties: {
          communityUri: {type: 'string' as const, format: 'at-uri'},
          contentType: {type: 'string' as const},
          includeRemoved: {type: 'boolean' as const},
          includeChildren: {type: 'boolean' as const},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['items'],
          properties: {
            items: {type: 'array' as const, items: {type: 'unknown' as const}},
            cursor: {type: 'string' as const},
          },
        },
      },
    },
  },
}

const shareContent = {
  lexicon: 1,
  id: 'com.para.community.shareContent',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['subject', 'communityUri', 'contentType'],
          properties: {
            subject: {type: 'unknown' as const},
            communityUri: {type: 'string' as const, format: 'at-uri'},
            contentType: {type: 'string' as const},
            note: {type: 'string' as const},
            visibility: {type: 'string' as const},
            sourceApp: {type: 'string' as const},
            embedContext: {type: 'unknown' as const},
            pinned: {type: 'boolean' as const},
            sortRank: {type: 'integer' as const},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {type: 'unknown' as const},
      },
    },
  },
}

const removeSharedContent = {
  lexicon: 1,
  id: 'com.para.community.removeSharedContent',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['sharedContent', 'communityUri'],
          properties: {
            sharedContent: {type: 'unknown' as const},
            communityUri: {type: 'string' as const, format: 'at-uri'},
            note: {type: 'string' as const},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {type: 'unknown' as const},
      },
    },
  },
}

const restoreSharedContent = {
  ...removeSharedContent,
  id: 'com.para.community.restoreSharedContent',
}

const listCommunityRelations = {
  lexicon: 1,
  id: 'com.para.community.listCommunityRelations',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          communityUri: {type: 'string' as const, format: 'at-uri'},
          parentCommunityUri: {type: 'string' as const, format: 'at-uri'},
          childCommunityUri: {type: 'string' as const, format: 'at-uri'},
          relation: {type: 'string' as const},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['relations'],
          properties: {
            relations: {
              type: 'array' as const,
              items: {type: 'unknown' as const},
            },
            cursor: {type: 'string' as const},
          },
        },
      },
    },
  },
}

const listChildCommunities = {
  ...listCommunityRelations,
  id: 'com.para.community.listChildCommunities',
}

const listParentCommunities = {
  ...listCommunityRelations,
  id: 'com.para.community.listParentCommunities',
}

const acceptDraftInvite = {
  lexicon: 1,
  id: 'com.para.community.acceptDraftInvite',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['communityId', 'inviteToken'],
          properties: {
            communityId: {type: 'string' as const},
            inviteToken: {type: 'string' as const},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            uri: {type: 'string' as const, format: 'at-uri'},
            cid: {type: 'string' as const, format: 'cid'},
            membershipState: {type: 'string' as const},
          },
        },
      },
    },
  },
}

// ─── Discourse ─────────────────────────────────────────────────────────────────

const getSnapshot = {
  lexicon: 1,
  id: 'com.para.discourse.getSnapshot',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          community: {type: 'string' as const},
          timeframe: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            snapshot: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

const getTopology = {
  lexicon: 1,
  id: 'com.para.discourse.getTopology',
  defs: {
    main: {
      type: 'query' as const,
      description: 'Get structural discourse topology for a community. Replaces ambiguous emotional sentiment with ideologically-grounded metrics.',
      parameters: {
        type: 'params' as const,
        properties: {
          community: {type: 'string' as const},
          timeframe: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['topology'],
          properties: {
            topology: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

const getTopics = {
  lexicon: 1,
  id: 'com.para.discourse.getTopics',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          community: {type: 'string' as const},
          timeframe: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            topics: {type: 'array' as const, items: {type: 'unknown' as const}},
          },
        },
      },
    },
  },
}

// ─── Feed ──────────────────────────────────────────────────────────────────────

const getAuthorFeed = {
  lexicon: 1,
  id: 'com.para.feed.getAuthorFeed',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          actor: {type: 'string' as const, format: 'did'},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 30,
          },
          cursor: {type: 'string' as const},
          party: {type: 'string' as const, maxLength: 128},
          community: {type: 'string' as const, maxLength: 128},
          flairTag: {type: 'string' as const, maxLength: 128},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            cursor: {type: 'string' as const},
            feed: {type: 'array' as const, items: {type: 'unknown' as const}},
          },
        },
      },
    },
  },
}

const getPostThread = {
  lexicon: 1,
  id: 'com.para.feed.getPostThread',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          uri: {type: 'string' as const, format: 'at-uri'},
          depth: {type: 'integer' as const},
          parentHeight: {type: 'integer' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            thread: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

const getPosts = {
  lexicon: 1,
  id: 'com.para.feed.getPosts',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          uris: {
            type: 'array' as const,
            items: {type: 'string' as const, format: 'at-uri'},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            posts: {type: 'array' as const, items: {type: 'unknown' as const}},
          },
        },
      },
    },
  },
}

const getTimeline = {
  lexicon: 1,
  id: 'com.para.feed.getTimeline',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          algorithm: {type: 'string' as const},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 30,
          },
          cursor: {type: 'string' as const},
          party: {type: 'string' as const, maxLength: 128},
          community: {type: 'string' as const, maxLength: 128},
          flairTag: {type: 'string' as const, maxLength: 128},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            cursor: {type: 'string' as const},
            feed: {type: 'array' as const, items: {type: 'unknown' as const}},
          },
        },
      },
    },
  },
}

// ─── Actor / Profile Stats ───────────────────────────────────────────────────

const getProfileStats = {
  lexicon: 1,
  id: 'com.para.actor.getProfileStats',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          actor: {type: 'string' as const, format: 'did'},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            stats: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

// ─── Social ────────────────────────────────────────────────────────────────────

const getPostMeta = {
  lexicon: 1,
  id: 'com.para.social.getPostMeta',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          uri: {type: 'string' as const, format: 'at-uri'},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            meta: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

// ─── Notification ─────────────────────────────────────────────────────────────

const getPostSubscription = {
  lexicon: 1,
  id: 'com.para.notification.getPostSubscription',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          uri: {type: 'string' as const, format: 'at-uri'},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            subscribed: {type: 'boolean' as const},
          },
        },
      },
    },
  },
}

const putPostSubscription = {
  lexicon: 1,
  id: 'com.para.notification.putPostSubscription',
  defs: {
    main: {
      type: 'procedure' as const,
      input: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['uri', 'subscribed'],
          properties: {
            uri: {type: 'string' as const, format: 'at-uri'},
            subscribed: {type: 'boolean' as const},
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            subscribed: {type: 'boolean' as const},
          },
        },
      },
    },
  },
}

// ─── Highlight ─────────────────────────────────────────────────────────────────

const getHighlight = {
  lexicon: 1,
  id: 'com.para.highlight.getHighlight',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        required: ['highlight'],
        properties: {
          highlight: {type: 'string' as const, format: 'at-uri'},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            highlight: {type: 'unknown' as const},
          },
        },
      },
    },
  },
}

const listHighlights = {
  lexicon: 1,
  id: 'com.para.highlight.listHighlights',
  defs: {
    main: {
      type: 'query' as const,
      parameters: {
        type: 'params' as const,
        properties: {
          community: {type: 'string' as const, maxLength: 100},
          state: {type: 'string' as const, maxLength: 100},
          subject: {type: 'string' as const, format: 'at-uri'},
          creator: {type: 'string' as const, format: 'did'},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 30,
          },
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          properties: {
            cursor: {type: 'string' as const},
            highlights: {
              type: 'array' as const,
              items: {type: 'unknown' as const},
            },
          },
        },
      },
    },
  },
}

// ─── RAQ ─────────────────────────────────────────────────────────────────────

const getUserAlignment = {
  lexicon: 1,
  id: 'com.para.raq.getUserAlignment',
  defs: {
    main: {
      type: 'query' as const,
      description: "Get a user's public RAQ alignment.",
      parameters: {
        type: 'params' as const,
        required: ['did'],
        properties: {
          did: {type: 'string' as const, format: 'did'},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['assessment'],
          properties: {
            assessment: {type: 'ref' as const, ref: '#assessmentView'},
          },
        },
      },
    },
    assessmentView: {
      type: 'object' as const,
      required: ['results', 'compass', 'ideology'],
      properties: {
        results: {
          type: 'array' as const,
          items: {type: 'ref' as const, ref: 'lex:com.para.raq.defs#axisResult'},
        },
        compass: {type: 'ref' as const, ref: 'lex:com.para.raq.defs#compassPosition'},
        ideology: {type: 'ref' as const, ref: 'lex:com.para.raq.defs#ideologyMatch'},
        secondaryIdeology: {type: 'ref' as const, ref: 'lex:com.para.raq.defs#ideologyMatch'},
        partyMatches: {
          type: 'array' as const,
          items: {type: 'ref' as const, ref: 'lex:com.para.raq.defs#partyMatch'},
        },
        completedAt: {type: 'string' as const, format: 'datetime'},
      },
    },
  },
}

const getCommunityAlignment = {
  lexicon: 1,
  id: 'com.para.raq.getCommunityAlignment',
  defs: {
    main: {
      type: 'query' as const,
      description: 'Get the aggregate RAQ alignment for a community.',
      parameters: {
        type: 'params' as const,
        required: ['community'],
        properties: {
          community: {type: 'string' as const, maxLength: 100},
          limit: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['axes'],
          properties: {
            axes: {
              type: 'array' as const,
              items: {type: 'ref' as const, ref: 'lex:com.para.raq.defs#axisResult'},
            },
            compass: {type: 'ref' as const, ref: 'lex:com.para.raq.defs#compassPosition'},
            participantCount: {type: 'integer' as const, minimum: 0},
            cursor: {type: 'string' as const},
          },
        },
      },
    },
  },
}

const proposalVote = {
  lexicon: 1,
  id: 'com.para.raq.proposalVote',
  defs: {
    main: {
      type: 'record' as const,
      description: 'A like/dislike vote on a proposed RAQ question.',
      key: 'tid',
      record: {
        type: 'object' as const,
        required: ['subject', 'value', 'createdAt'],
        properties: {
          subject: {type: 'string' as const, format: 'at-uri'},
          value: {type: 'integer' as const, minimum: -1, maximum: 1},
          voteNullifier: {type: 'string' as const, maxLength: 128},
          eligibilityProofRef: {type: 'string' as const, maxLength: 512},
          createdAt: {type: 'string' as const, format: 'datetime'},
        },
      },
    },
  },
}

const proposalAnswer = {
  lexicon: 1,
  id: 'com.para.raq.proposalAnswer',
  defs: {
    main: {
      type: 'record' as const,
      description: "A user's answer (-3 to 3) to a proposed RAQ question.",
      key: 'tid',
      record: {
        type: 'object' as const,
        required: ['subject', 'value', 'createdAt'],
        properties: {
          subject: {type: 'string' as const, format: 'at-uri'},
          value: {type: 'integer' as const, minimum: -3, maximum: 3},
          createdAt: {type: 'string' as const, format: 'datetime'},
        },
      },
    },
  },
}

const getProposals = {
  lexicon: 1,
  id: 'com.para.raq.getProposals',
  defs: {
    main: {
      type: 'query' as const,
      description: 'Get proposed RAQ questions with vote and answer aggregations.',
      parameters: {
        type: 'params' as const,
        properties: {
          community: {type: 'string' as const, maxLength: 128},
          limit: {type: 'integer' as const, minimum: 1, maximum: 100, default: 50},
          cursor: {type: 'string' as const},
        },
      },
      output: {
        encoding: 'application/json' as const,
        schema: {
          type: 'object' as const,
          required: ['proposals'],
          properties: {
            cursor: {type: 'string' as const},
            proposals: {
              type: 'array' as const,
              items: {type: 'ref' as const, ref: '#proposalView'},
            },
          },
        },
      },
    },
    proposalView: {
      type: 'object' as const,
      required: ['uri', 'cid', 'creator', 'text', 'upvotes', 'downvotes', 'createdAt'],
      properties: {
        uri: {type: 'string' as const, format: 'at-uri'},
        cid: {type: 'string' as const, format: 'cid'},
        creator: {type: 'string' as const, format: 'did'},
        text: {type: 'string' as const, maxLength: 1000},
        targetAxis: {type: 'string' as const, maxLength: 64},
        targetCommunity: {type: 'string' as const, maxLength: 128},
        upvotes: {type: 'integer' as const},
        downvotes: {type: 'integer' as const},
        answerCount: {type: 'integer' as const},
        answerAverage: {type: 'integer' as const},
        viewerUpvote: {type: 'boolean' as const},
        viewerDownvote: {type: 'boolean' as const},
        viewerAnswer: {type: 'integer' as const},
        createdAt: {type: 'string' as const, format: 'datetime'},
        indexedAt: {type: 'string' as const, format: 'datetime'},
      },
    },
  },
}

// ─── Registration ────────────────────────────────────────────────────────────

const ALL_PARA_LEXICONS = [
  // Civic
  listCabildeos,
  getCabildeo,
  listCabildeoPositions,
  listDelegationCandidates,
  castVote,
  putLivePresence,
  getPolicyTally,
  // Collections
  collectionDefs,
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  // Community
  listBoards,
  listMembers,
  getBoard,
  createBoard,
  joinCommunity,
  leaveCommunity,
  getGovernance,
  listPosts,
  listSharedContent,
  shareContent,
  removeSharedContent,
  restoreSharedContent,
  listCommunityRelations,
  listChildCommunities,
  listParentCommunities,
  acceptDraftInvite,
  // Discourse
  getSnapshot,
  getTopology,
  getTopics,
  // Feed
  getAuthorFeed,
  getPostThread,
  getPosts,
  getTimeline,
  // Actor
  getProfileStats,
  // Social
  getPostMeta,
  // Notification
  getPostSubscription,
  putPostSubscription,
  // Highlight
  getHighlight,
  listHighlights,
  // RAQ
  getUserAlignment,
  getCommunityAlignment,
  proposalVote,
  proposalAnswer,
  getProposals,
]

/**
 * Register all PARA custom lexicons on the given agent so that
 * agent.call('com.para.*', ...) works at runtime.
 */
export function registerParaLexicons(agent: BskyAgent) {
  for (const lex of ALL_PARA_LEXICONS) {
    try {
      if (agent.lex.get(lex.id)) {
        agent.lex.remove(lex.id)
      }
      // @ts-ignore — lex is plain JSON, Lexicons.add expects LexiconDoc
      agent.lex.add(lex)
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.warn(
        `[para-lexicons] Failed to register ${lex.id}:`,
        errorMessage,
      )
    }
  }
}
