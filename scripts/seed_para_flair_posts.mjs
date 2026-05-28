import {AtUri, BskyAgent} from '@atproto/api'

const SERVICE = process.env.PARA_PDS_URL || 'http://localhost:2583'
const PASSWORD = process.env.PARA_TEST_PASSWORD || 'hunter2'

const ACCOUNTS = [
  {
    handle: 'alice.test',
    password: PASSWORD,
    party: 'p/Morena',
    community: 'p/Morena',
  },
  {handle: 'bob.test', password: PASSWORD, party: 'p/PAN', community: 'p/PAN'},
  {
    handle: 'carla.test',
    password: PASSWORD,
    party: 'p/MC',
    community: 'p/NuevoLeon',
  },
]

const POSTS = [
  // ALICE: Water Rights & Industrial Balance
  {
    visibility: 'private',
    account: 'alice.test',
    text: 'Es fundamental garantizar el acceso al agua como derecho humano. La propuesta de crear una empresa pública de agua debe ir acompañada de un plan hídrico integral para la región. ||#EmpresaPublicaDeAgua |#IndustriaHidrica',
    flairs: ['||#EmpresaPublicaDeAgua', '|#IndustriaHidrica'],
    tags: [
      'agua',
      'derechos',
      'infraestructura',
      '||#EmpresaPublicaDeAgua',
      '|#IndustriaHidrica',
    ],
    postType: 'policy',
    party: 'p/Morena',
    community: 'p/Morena',
    createMeta: true,
  },
  {
    visibility: 'private',
    account: 'alice.test',
    text: '¿Cómo equilibramos el desarrollo industrial con la protección de nuestros mantos acuíferos en la zona metropolitana? El debate está abierto en la asamblea de hoy. |#IndustriaHidrica |#?OpenQuestion',
    flairs: ['|#IndustriaHidrica', '|#?OpenQuestion'],
    tags: [
      'debate',
      'agua',
      'industria',
      '|#IndustriaHidrica',
      '|#?OpenQuestion',
    ],
    postType: 'open_question',
    party: 'p/Morena',
    community: 'p/Morena',
  },

  // BOB: Public Transit & Clarifications
  {
    visibility: 'private',
    account: 'bob.test',
    text: 'Se requiere ampliar la red de transporte público conectando la periferia con los centros de trabajo. Es una inversión prioritaria para reducir la desigualdad urbana y mejorar los tiempos de traslado. ||#TransportePublico |#SubvencionesDeViajesEnBus',
    flairs: ['||#TransportePublico', '|#SubvencionesDeViajesEnBus'],
    tags: [
      'movilidad',
      'transporte',
      'ciudad',
      '||#TransportePublico',
      '|#SubvencionesDeViajesEnBus',
    ],
    postType: 'policy',
    party: 'p/PAN',
    community: 'p/PAN',
    createMeta: true,
  },
  {
    visibility: 'private',
    account: 'bob.test',
    text: 'Para aclarar la votación de la asamblea de ayer respecto al dictamen: El subsidio al transporte se mantendrá sin cambios para estudiantes y adultos mayores; la reforma solo ajusta las tarifas generales. ||#TransportePublico |#!RAQ',
    flairs: ['||#TransportePublico', '|#!RAQ'],
    tags: [
      'aclaracion',
      'subsidios',
      'transporte',
      '||#TransportePublico',
      '|#!RAQ',
    ],
    postType: 'raq',
    party: 'p/PAN',
    community: 'p/PAN',
  },

  // CARLA: Education & Meta Coordination
  {
    visibility: 'private',
    account: 'carla.test',
    text: 'Necesitamos modernizar nuestras escuelas públicas con mejor infraestructura en la región escolar. La educación equitativa y científica es la base del futuro para nuestra comunidad. ||#EscuelasPublicas ||#EducacionLaica',
    flairs: ['||#EscuelasPublicas', '||#EducacionLaica'],
    tags: [
      'educacion',
      'escuelas',
      'presupuesto',
      '||#EscuelasPublicas',
      '||#EducacionLaica',
    ],
    postType: 'policy',
    party: 'p/MC',
    community: 'p/NuevoLeon',
    createMeta: true,
  },
  {
    visibility: 'private',
    account: 'carla.test',
    text: 'Recordatorio para los vocales de la mesa directiva: por favor revisen el borrador técnico sobre los comedores escolares antes de la sesión de votación de este viernes a mediodía. ||#ComedoresEscolaresGratuitos #META',
    flairs: ['||#ComedoresEscolaresGratuitos', '#META'],
    tags: [
      'anuncio',
      'asamblea',
      'comite',
      '||#ComedoresEscolaresGratuitos',
      '#META',
    ],
    postType: 'meta',
    party: 'p/MC',
    community: 'p/NuevoLeon',
  },

  // PUBLIC MIRRORS
  {
    visibility: 'public',
    account: 'alice.test',
    text: 'Es fundamental garantizar el acceso al agua como derecho humano. La propuesta de crear una empresa pública de agua debe ir acompañada de un plan hídrico integral para la región. ||#EmpresaPublicaDeAgua |#IndustriaHidrica',
    tags: ['||#EmpresaPublicaDeAgua', '|#IndustriaHidrica'],
    party: 'p/Morena',
    community: 'p/Morena',
  },
  {
    visibility: 'public',
    account: 'bob.test',
    text: 'Se requiere ampliar la red de transporte público conectando la periferia con los centros de trabajo. Es una inversión prioritaria para reducir la desigualdad urbana y mejorar los tiempos de traslado. ||#TransportePublico |#SubvencionesDeViajesEnBus',
    tags: ['||#TransportePublico', '|#SubvencionesDeViajesEnBus'],
    party: 'p/PAN',
    community: 'p/PAN',
  },
  {
    visibility: 'public',
    account: 'carla.test',
    text: 'Necesitamos modernizar nuestras escuelas públicas con mejor infraestructura en la región escolar. La educación equitativa y científica es la base del futuro para nuestra comunidad. ||#EscuelasPublicas ||#EducacionLaica',
    tags: ['||#EscuelasPublicas', '||#EducacionLaica'],
    party: 'p/MC',
    community: 'p/NuevoLeon',
  },
]

async function listRecords(agent, collection) {
  const records = []
  let cursor

  do {
    const res = await agent.api.com.atproto.repo.listRecords({
      repo: agent.assertDid,
      collection,
      limit: 100,
      cursor,
      reverse: true,
    })
    records.push(...res.data.records)
    cursor = res.data.cursor
  } while (cursor)

  return records
}

async function cleanupSeedRecords(agent) {
  const privatePosts = await listRecords(agent, 'com.para.post')
  const publicPosts = await listRecords(agent, 'app.bsky.feed.post')

  const deletions = []

  for (const record of [...privatePosts, ...publicPosts]) {
    const text = record.value?.text
    if (typeof text !== 'string' || !text.includes('[Seed]')) {
      continue
    }

    deletions.push({
      collection: record.uri.split('/')[3],
      rkey: new AtUri(record.uri).rkey,
    })

    if (record.uri.includes('/com.para.post/')) {
      deletions.push({
        collection: 'com.para.social.postMeta',
        rkey: new AtUri(record.uri).rkey,
      })
    }
  }

  for (const deletion of deletions) {
    try {
      await agent.api.com.atproto.repo.deleteRecord({
        repo: agent.assertDid,
        collection: deletion.collection,
        rkey: deletion.rkey,
      })
    } catch (err) {
      if (!String(err).includes('Could not locate record')) {
        throw err
      }
    }
  }
}

async function createPost(agent, post) {
  const record = {
    $type:
      post.visibility === 'private' ? 'com.para.post' : 'app.bsky.feed.post',
    text: post.text,
    createdAt: new Date().toISOString(),
    langs: ['en'],
    tags: post.tags,
    ...(post.visibility === 'private'
      ? {
          flairs: post.flairs,
          postType: post.postType,
        }
      : {}),
  }

  const res = await agent.api.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection:
      post.visibility === 'private' ? 'com.para.post' : 'app.bsky.feed.post',
    record,
  })

  if (post.visibility === 'private' && post.createMeta && post.postType) {
    const rkey = new AtUri(res.data.uri).rkey
    await agent.api.com.atproto.repo.createRecord({
      repo: agent.assertDid,
      collection: 'com.para.social.postMeta',
      rkey,
      record: {
        $type: 'com.para.social.postMeta',
        post: res.data.uri,
        postType: post.postType,
        official: post.official || undefined,
        party: post.party,
        community: post.community,
        flairs: post.flairs,
        voteScore: 0,
        createdAt: new Date().toISOString(),
      },
    })
  }

  return res.data.uri
}

async function login(account) {
  const agent = new BskyAgent({service: SERVICE})
  await agent.login({
    identifier: account.handle,
    password: account.password,
  })
  return agent
}

async function main() {
  const agents = new Map()

  for (const account of ACCOUNTS) {
    const agent = await login(account)
    agents.set(account.handle, agent)
    await cleanupSeedRecords(agent)
    console.log(`Logged in and cleaned seed records for ${account.handle}`)
  }

  const created = []

  for (const post of POSTS) {
    const agent = agents.get(post.account)
    if (!agent) {
      throw new Error(`Missing logged-in agent for ${post.account}`)
    }

    const uri = await createPost(agent, post)
    created.push({
      account: post.account,
      party: post.party,
      visibility: post.visibility,
      uri,
      text: post.text,
    })
    console.log(
      `Created ${post.visibility} post for ${post.account} (${post.party}): ${post.text} -> ${uri}`,
    )
  }

  console.log('\nSeed complete.\n')
  for (const item of created) {
    console.log(
      `[${item.visibility}] ${item.party} ${item.account} ${item.uri}`,
    )
  }
}

main().catch(err => {
  console.error('Failed to seed flair posts:', err)
  process.exit(1)
})
