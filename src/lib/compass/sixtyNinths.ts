export type SixtyNinthsIdeology = {
  id: string
  title: string
  label: string
  row: number
  col: number
  kind: 'main' | 'extra' | 'center'
  shortIntro: string
  related?: string[]
}

export const SIXTY_NINTHS_IDEOLOGIES: SixtyNinthsIdeology[] = [
  {
    id: 'marxist-leninist',
    title: 'Marxist-Leninist',
    label: 'Marxist\nLeninist',
    row: 0,
    col: 0,
    kind: 'main',
    shortIntro:
      'Marxism-Leninism combines a communist command economy with a disciplined vanguard state meant to direct revolutionary transition.',
    related: ['leninism', 'orthodox-marxism'],
  },
  {
    id: 'national-bolshevism',
    title: 'National Bolshevism',
    label: 'National\nBolshevism',
    row: 0,
    col: 1,
    kind: 'main',
    shortIntro:
      'National Bolshevism blends communist economics with intense nationalism and a highly centralized state.',
    related: ['strasserism', 'marxist-leninist'],
  },
  {
    id: 'strasserism',
    title: 'Strasserism',
    label: 'Strasserism',
    row: 0,
    col: 2,
    kind: 'main',
    shortIntro:
      'Strasserism is a radical nationalist current that mixes authoritarian politics with anti-capitalist or state-directed economic ideas.',
    related: ['national-bolshevism', 'baathism'],
  },
  {
    id: 'baathism',
    title: 'Baathism',
    label: 'Baathism',
    row: 0,
    col: 3,
    kind: 'main',
    shortIntro:
      'Baathism promotes Arab nationalist unity, strong state leadership, and a state-managed developmental economy.',
    related: ['strasserism', 'state-capitalism'],
  },
  {
    id: 'nazism',
    title: 'Nazism',
    label: 'Nazism',
    row: 0,
    col: 4,
    kind: 'main',
    shortIntro:
      'Nazism is a totalitarian and racial supremacist ideology built around dictatorship, militarism, and exclusionary nationalism.',
    related: ['fascism', 'religious-traditionalism'],
  },
  {
    id: 'fascism',
    title: 'Fascism',
    label: 'Fascism',
    row: 0,
    col: 5,
    kind: 'main',
    shortIntro:
      'Fascism centers on dictatorial rule, national myth, hierarchy, and the subordination of civil society to the state.',
    related: ['nazism', 'reactionary-conservatism'],
  },
  {
    id: 'military-junta',
    title: 'Military Junta',
    label: 'Military\njunta',
    row: 0,
    col: 6,
    kind: 'main',
    shortIntro:
      'A military junta is rule by armed forces leadership, usually justified by order, security, or emergency control.',
    related: ['fascism', 'liberal-autocracy'],
  },
  {
    id: 'liberal-autocracy',
    title: 'Liberal Autocracy',
    label: 'Liberal\nAutocracy',
    row: 0,
    col: 7,
    kind: 'main',
    shortIntro:
      'Liberal autocracy pairs market-friendly or institutionally liberal policy with concentrated executive power and weak democratic accountability.',
    related: ['military-junta', 'corporate-conservatism'],
  },
  {
    id: 'leninism',
    title: 'Leninism',
    label: 'Leninism',
    row: 1,
    col: 0,
    kind: 'main',
    shortIntro:
      'Leninism emphasizes a revolutionary party, democratic centralism, and state power as the vehicle for socialist transformation.',
    related: ['marxist-leninist', 'orthodox-marxism'],
  },
  {
    id: 'national-syndicalism',
    title: 'National Syndicalism',
    label: 'National\nSyndicalism',
    row: 1,
    col: 1,
    kind: 'main',
    shortIntro:
      'National syndicalism combines corporatist labor organization with nationalist politics and authoritarian coordination.',
    related: ['national-bolshevism', 'state-socialism'],
  },
  {
    id: 'state-socialism',
    title: 'State Socialism',
    label: 'State\nSocialism',
    row: 1,
    col: 2,
    kind: 'main',
    shortIntro:
      'State socialism relies on extensive public ownership and central administration to direct production and distribution.',
    related: ['leninism', 'state-capitalism'],
  },
  {
    id: 'state-capitalism',
    title: 'State Capitalism',
    label: 'State\nCapitalism',
    row: 1,
    col: 3,
    kind: 'main',
    shortIntro:
      'State capitalism keeps markets or capital accumulation but places commanding sectors under direct state control.',
    related: ['state-socialism', 'baathism'],
  },
  {
    id: 'religious-traditionalism',
    title: 'Religious Traditionalism',
    label: 'Religious\nTraditionalism',
    row: 1,
    col: 4,
    kind: 'main',
    shortIntro:
      'Religious traditionalism grounds political order in inherited faith, moral hierarchy, and social authority.',
    related: ['paternalistic-conservatism', 'reactionary-conservatism'],
  },
  {
    id: 'reactionary-conservatism',
    title: 'Reactionary Conservatism',
    label: 'Reactionary\nConservatism',
    row: 1,
    col: 5,
    kind: 'main',
    shortIntro:
      'Reactionary conservatism seeks to restore or defend older hierarchies against egalitarian or liberal change.',
    related: ['religious-traditionalism', 'classic-conservatism'],
  },
  {
    id: 'corporate-conservatism',
    title: 'Corporate Conservatism',
    label: 'Corporate\nConservatism',
    row: 1,
    col: 6,
    kind: 'main',
    shortIntro:
      'Corporate conservatism favors business-led social order, stable institutions, and limited mass-democratic disruption.',
    related: ['liberal-autocracy', 'liberal-conservatism'],
  },
  {
    id: 'paleo-conservative',
    title: 'Paleoconservative',
    label: 'Paleo-\nConservative',
    row: 1,
    col: 7,
    kind: 'main',
    shortIntro:
      'Paleoconservatism stresses localism, tradition, national sovereignty, and skepticism toward global liberal consensus.',
    related: ['corporate-conservatism', 'neo-conservatism'],
  },
  {
    id: 'orthodox-marxism',
    title: 'Orthodox Marxism',
    label: 'Orthodox\nMarxism',
    row: 2,
    col: 0,
    kind: 'main',
    shortIntro:
      'Orthodox Marxism focuses on class struggle, historical materialism, and systemic critique without necessarily embracing every later communist model.',
    related: ['leninism', 'trotskyism'],
  },
  {
    id: 'ho-chi-minh-thought',
    title: 'Ho Chi Minh Thought',
    label: 'Ho Chi Minh\nThought',
    row: 2,
    col: 1,
    kind: 'main',
    shortIntro:
      'Ho Chi Minh Thought combines Vietnamese nationalism, Marxist-Leninist organization, and anti-colonial state-building.',
    related: ['orthodox-marxism', 'left-wing-populism'],
  },
  {
    id: 'left-wing-populism',
    title: 'Left-wing Populism',
    label: 'Left-wing\nPopulism',
    row: 2,
    col: 2,
    kind: 'main',
    shortIntro:
      'Left-wing populism frames politics as ordinary people versus entrenched elites while favoring redistribution and mass participation.',
    related: ['distributism', 'democratic-socialism'],
  },
  {
    id: 'paternalistic-conservatism',
    title: 'Paternalistic Conservatism',
    label: 'Paternalistic\nConservatism',
    row: 2,
    col: 3,
    kind: 'main',
    shortIntro:
      'Paternalistic conservatism supports social hierarchy and tradition while accepting some welfare or state stewardship.',
    related: ['christian-democracy', 'social-conservatism'],
  },
  {
    id: 'social-conservatism',
    title: 'Social Conservatism',
    label: 'Social\nConservatism',
    row: 2,
    col: 4,
    kind: 'main',
    shortIntro:
      'Social conservatism prioritizes preserving traditional moral norms, family structures, and cultural continuity.',
    related: ['paternalistic-conservatism', 'classic-conservatism'],
  },
  {
    id: 'classic-conservatism',
    title: 'Classic Conservatism',
    label: 'Classic\nConservatism',
    row: 2,
    col: 5,
    kind: 'main',
    shortIntro:
      'Classic conservatism emphasizes cautious change, inherited institutions, and social order over abstract redesign.',
    related: ['social-conservatism', 'liberal-conservatism'],
  },
  {
    id: 'liberal-conservatism',
    title: 'Liberal Conservatism',
    label: 'Liberal\nConservatism',
    row: 2,
    col: 6,
    kind: 'main',
    shortIntro:
      'Liberal conservatism combines market economics and constitutional liberties with a preference for stable institutions and gradual reform.',
    related: ['classic-conservatism', 'conservative-liberalism'],
  },
  {
    id: 'neo-conservatism',
    title: 'Neoconservatism',
    label: 'Neo-\nConservatism',
    row: 2,
    col: 7,
    kind: 'main',
    shortIntro:
      'Neoconservatism mixes market liberalism with activist statecraft, assertive national power, and a willingness to use state capacity abroad.',
    related: ['liberal-conservatism', 'paleo-conservative'],
  },
  {
    id: 'trotskyism',
    title: 'Trotskyism',
    label: 'Trotskyism',
    row: 3,
    col: 0,
    kind: 'main',
    shortIntro:
      'Trotskyism argues for permanent revolution, internationalism, and a critique of bureaucratic communist rule.',
    related: ['orthodox-marxism', 'classical-marxism'],
  },
  {
    id: 'collectivism',
    title: 'Collectivism',
    label: 'Collectivism',
    row: 3,
    col: 1,
    kind: 'main',
    shortIntro:
      'Collectivism gives priority to shared social goals and group institutions over strongly individualized market ordering.',
    related: ['community-unionism', 'democratic-socialism'],
  },
  {
    id: 'distributism',
    title: 'Distributism',
    label: 'Distributism',
    row: 3,
    col: 2,
    kind: 'main',
    shortIntro:
      'Distributism favors broad small-scale ownership of productive property over both concentrated capital and centralized state control.',
    related: ['christian-democracy', 'social-democracy'],
  },
  {
    id: 'christian-democracy',
    title: 'Christian Democracy',
    label: 'Christian\nDemocracy',
    row: 3,
    col: 3,
    kind: 'main',
    shortIntro:
      'Christian democracy blends social welfare, constitutional government, and market society with Christian social ethics.',
    related: ['distributism', 'paternalistic-conservatism'],
  },
  {
    id: 'third-way',
    title: 'Third Way',
    label: 'Third Way',
    row: 3,
    col: 4,
    kind: 'main',
    shortIntro:
      'Third Way politics seeks a centrist compromise between social protection and market-friendly modernization.',
    related: ['social-liberalism', 'conservative-liberalism'],
  },
  {
    id: 'conservative-liberalism',
    title: 'Conservative Liberalism',
    label: 'Conservative\nLiberalism',
    row: 3,
    col: 5,
    kind: 'main',
    shortIntro:
      'Conservative liberalism supports civil freedoms and markets while keeping a culturally or institutionally cautious political style.',
    related: ['liberal-conservatism', 'ordo-liberalism'],
  },
  {
    id: 'corporatocracy',
    title: 'Corporatocracy',
    label: 'Corp-\noratocracy',
    row: 3,
    col: 6,
    kind: 'main',
    shortIntro:
      'Corporatocracy describes a system where large firms or business interests dominate political decision-making.',
    related: ['corporate-conservatism', 'neo-liberalism'],
  },
  {
    id: 'conservative-libertarianism',
    title: 'Conservative Libertarianism',
    label: 'Conservative\nLibertarianism',
    row: 3,
    col: 7,
    kind: 'main',
    shortIntro:
      'Conservative libertarianism combines small-government economics with culturally traditional social preferences.',
    related: ['paleo-libertarianism', 'minarchism'],
  },
  {
    id: 'classical-marxism',
    title: 'Classical Marxism',
    label: 'Classical\nMarxism',
    row: 4,
    col: 0,
    kind: 'main',
    shortIntro:
      'Classical Marxism centers on class conflict, capitalism’s structural dynamics, and collective ownership as a post-capitalist horizon.',
    related: ['trotskyism', 'council-communism'],
  },
  {
    id: 'community-unionism',
    title: 'Community Unionism',
    label: 'Community\nUnionism',
    row: 4,
    col: 1,
    kind: 'main',
    shortIntro:
      'Community unionism extends labor organization into broader local social solidarity and civic mutual support.',
    related: ['collectivism', 'green-syndicalism'],
  },
  {
    id: 'democratic-socialism',
    title: 'Democratic Socialism',
    label: 'Democratic\nSocialism',
    row: 4,
    col: 2,
    kind: 'main',
    shortIntro:
      'Democratic socialism pursues deeper economic democracy and social ownership through electoral and participatory institutions.',
    related: ['social-democracy', 'liberal-socialism'],
  },
  {
    id: 'social-democracy',
    title: 'Social Democracy',
    label: 'Social\nDemocracy',
    row: 4,
    col: 3,
    kind: 'main',
    shortIntro:
      'Social democracy keeps a market economy but uses democratic government to tame inequality and provide broad social protection.',
    related: ['democratic-socialism', 'social-liberalism'],
  },
  {
    id: 'social-liberalism',
    title: 'Social Liberalism',
    label: 'Social\nLiberalism',
    row: 4,
    col: 4,
    kind: 'main',
    shortIntro:
      'Social liberalism supports individual rights and markets while accepting a welfare state and public correction of inequality.',
    related: ['social-democracy', 'ordo-liberalism'],
  },
  {
    id: 'ordo-liberalism',
    title: 'Ordo-liberalism',
    label: 'Ordo\nLiberalism',
    row: 4,
    col: 5,
    kind: 'main',
    shortIntro:
      'Ordo-liberalism argues that markets work best when a strong legal framework prevents monopoly, corruption, and disorder.',
    related: ['social-liberalism', 'classical-liberalism'],
  },
  {
    id: 'paleo-libertarianism',
    title: 'Paleolibertarianism',
    label: 'Paleo-\nLibertarianism',
    row: 4,
    col: 6,
    kind: 'main',
    shortIntro:
      'Paleolibertarianism combines strongly pro-market, anti-state economics with more traditionalist or culturally conservative instincts.',
    related: ['conservative-libertarianism', 'neo-libertarianism'],
  },
  {
    id: 'neo-liberalism',
    title: 'Neoliberalism',
    label: 'Neo-\nLiberalism',
    row: 4,
    col: 7,
    kind: 'main',
    shortIntro:
      'Neoliberalism favors deregulation, trade openness, market competition, and technocratic policy frameworks.',
    related: ['ordo-liberalism', 'classical-liberalism'],
  },
  {
    id: 'council-communism',
    title: 'Council Communism',
    label: 'Council\nCommunism',
    row: 5,
    col: 0,
    kind: 'main',
    shortIntro:
      'Council communism emphasizes worker self-management and councils instead of party or state command from above.',
    related: ['classical-marxism', 'libertarian-marxism'],
  },
  {
    id: 'green-syndicalism',
    title: 'Green Syndicalism',
    label: 'Green\nSyndicalism',
    row: 5,
    col: 1,
    kind: 'main',
    shortIntro:
      'Green syndicalism combines workplace democracy with ecological priorities and decentralized organization.',
    related: ['community-unionism', 'libertarian-socialism'],
  },
  {
    id: 'liberal-socialism',
    title: 'Liberal Socialism',
    label: 'Liberal\nSocialism',
    row: 5,
    col: 2,
    kind: 'main',
    shortIntro:
      'Liberal socialism tries to reconcile socialism with civil liberties, pluralism, and democratic constitutional norms.',
    related: ['democratic-socialism', 'market-socialism'],
  },
  {
    id: 'green-liberalism',
    title: 'Green Liberalism',
    label: 'Green\nLiberalism',
    row: 5,
    col: 3,
    kind: 'main',
    shortIntro:
      'Green liberalism combines liberal rights and market tools with strong environmental safeguards and sustainability goals.',
    related: ['social-liberalism', 'georgism'],
  },
  {
    id: 'techno-liberalism',
    title: 'Techno-Liberalism',
    label: 'Techno-\nLiberalism',
    row: 5,
    col: 4,
    kind: 'main',
    shortIntro:
      'Techno-liberalism trusts expert knowledge, innovation, and data-driven institutions to improve a largely liberal market order.',
    related: ['classical-liberalism', 'geolibertarianism', 'radical-centrism'],
  },
  {
    id: 'classical-liberalism',
    title: 'Classical Liberalism',
    label: 'Classical\nLiberalism',
    row: 5,
    col: 5,
    kind: 'main',
    shortIntro:
      'Classical liberalism emphasizes limited government, strong property rights, free exchange, and individual liberty.',
    related: ['techno-liberalism', 'neo-liberalism'],
  },
  {
    id: 'neo-libertarianism',
    title: 'Neolibertarianism',
    label: 'Neo-\nLibertarianism',
    row: 5,
    col: 6,
    kind: 'main',
    shortIntro:
      'Neolibertarianism pairs broadly libertarian economics with a more modern or strategic openness to statecraft and institutions.',
    related: ['classical-liberalism', 'right-libertarianism'],
  },
  {
    id: 'objectivism',
    title: 'Objectivism',
    label: 'Objectivism',
    row: 5,
    col: 7,
    kind: 'main',
    shortIntro:
      'Objectivism advocates rational self-interest, individual rights, and laissez-faire capitalism as the ideal political order.',
    related: ['classical-liberalism', 'anarcho-capitalism'],
  },
  {
    id: 'libertarian-marxism',
    title: 'Libertarian Marxism',
    label: 'Libertarian\nMarxism',
    row: 6,
    col: 0,
    kind: 'main',
    shortIntro:
      'Libertarian Marxism rejects authoritarian communist rule and stresses emancipation through decentralized collective power.',
    related: ['council-communism', 'libertarian-socialism'],
  },
  {
    id: 'libertarian-socialism',
    title: 'Libertarian Socialism',
    label: 'Libertarian\nSocialism',
    row: 6,
    col: 1,
    kind: 'main',
    shortIntro:
      'Libertarian socialism supports social ownership and equality while opposing centralized state domination.',
    related: ['libertarian-marxism', 'market-socialism'],
  },
  {
    id: 'market-socialism',
    title: 'Market Socialism',
    label: 'Market\nSocialism',
    row: 6,
    col: 2,
    kind: 'main',
    shortIntro:
      'Market socialism keeps market exchange while replacing private capital dominance with worker, public, or cooperative ownership.',
    related: ['liberal-socialism', 'georgism'],
  },
  {
    id: 'georgism',
    title: 'Georgism',
    label: 'Georgism',
    row: 6,
    col: 3,
    kind: 'main',
    shortIntro:
      'Georgism favors private enterprise with land value taxation and the idea that natural rents should benefit the community.',
    related: ['green-liberalism', 'geo-libertarianism'],
  },
  {
    id: 'geo-libertarianism',
    title: 'Geo-Libertarianism',
    label: 'Geo-\nLibertarianism',
    row: 6,
    col: 4,
    kind: 'main',
    shortIntro:
      'Geo-libertarianism combines strong individual liberty and markets with the Georgist view that natural resource rents belong to all.',
    related: ['georgism', 'techno-liberalism'],
  },
  {
    id: 'democratic-libertarianism',
    title: 'Democratic Libertarianism',
    label: 'Democratic\nLibertarianism',
    row: 6,
    col: 5,
    kind: 'main',
    shortIntro:
      'Democratic libertarianism tries to pair robust civil liberty and small-government instincts with explicit democratic accountability.',
    related: ['classical-liberalism', 'right-libertarianism'],
  },
  {
    id: 'right-libertarianism',
    title: 'Right-Libertarianism',
    label: 'Right-\nLibertarianism',
    row: 6,
    col: 6,
    kind: 'main',
    shortIntro:
      'Right-libertarianism advocates very strong property rights, free markets, and a sharply limited state.',
    related: ['democratic-libertarianism', 'minarchism'],
  },
  {
    id: 'minarchism',
    title: 'Minarchism',
    label: 'Minarchism',
    row: 6,
    col: 7,
    kind: 'main',
    shortIntro:
      'Minarchism supports a minimal night-watchman state focused on courts, policing, and defense.',
    related: ['right-libertarianism', 'anarcho-capitalism'],
  },
  {
    id: 'anarcho-communism',
    title: 'Anarcho-Communism',
    label: 'Anarcho\nCommunism',
    row: 7,
    col: 0,
    kind: 'main',
    shortIntro:
      'Anarcho-communism seeks a stateless and classless society based on common ownership and voluntary association.',
    related: ['anarcho-syndicalism', 'libertarian-marxism'],
  },
  {
    id: 'anarcho-syndicalism',
    title: 'Anarcho-Syndicalism',
    label: 'Anarcho-\nSyndicalism',
    row: 7,
    col: 1,
    kind: 'main',
    shortIntro:
      'Anarcho-syndicalism sees militant labor organization and federated unions as the path to a stateless socialist society.',
    related: ['anarcho-communism', 'mutualism'],
  },
  {
    id: 'mutualism',
    title: 'Mutualism',
    label: 'Mutualism',
    row: 7,
    col: 2,
    kind: 'main',
    shortIntro:
      'Mutualism supports voluntary exchange, worker possession, and cooperative institutions without capitalist domination or a centralized state.',
    related: ['market-socialism', 'individualist-anarchism'],
  },
  {
    id: 'individualist-anarchism',
    title: 'Individualist Anarchism',
    label: 'Individualist\nAnarchism',
    row: 7,
    col: 3,
    kind: 'main',
    shortIntro:
      'Individualist anarchism stresses personal autonomy, voluntary relations, and skepticism toward both state and imposed hierarchy.',
    related: ['mutualism', 'egoist-anarchism'],
  },
  {
    id: 'agorism',
    title: 'Agorism',
    label: 'Agorism',
    row: 7,
    col: 4,
    kind: 'main',
    shortIntro:
      'Agorism advocates building freer society through counter-economics, black markets, and voluntary exchange outside state control.',
    related: ['individualist-anarchism', 'crypto-anarchism'],
  },
  {
    id: 'crypto-anarchism',
    title: 'Crypto-Anarchism',
    label: 'Crypto-\nAnarchism',
    row: 7,
    col: 5,
    kind: 'main',
    shortIntro:
      'Crypto-anarchism uses encryption and digital privacy tools to reduce state and institutional control over communication and exchange.',
    related: ['agorism', 'voluntaryism'],
  },
  {
    id: 'voluntaryism',
    title: 'Voluntaryism',
    label: 'Voluntaryism',
    row: 7,
    col: 6,
    kind: 'main',
    shortIntro:
      'Voluntaryism holds that social and economic relations should rest on consent rather than coercive political authority.',
    related: ['crypto-anarchism', 'anarcho-capitalism'],
  },
  {
    id: 'anarcho-capitalism',
    title: 'Anarcho-Capitalism',
    label: 'Anarcho\nCapitalism',
    row: 7,
    col: 7,
    kind: 'main',
    shortIntro:
      'Anarcho-capitalism envisions a stateless order based on private property, contracts, and fully privatized law and security.',
    related: ['voluntaryism', 'minarchism'],
  },
  {
    id: 'nathan-larson-fuckedupism',
    title: 'Nathan Larson Fuckedupism',
    label: 'Nathan\nLarson\nFuckedupism',
    row: 6,
    col: 8,
    kind: 'extra',
    shortIntro:
      'This label is a meme outlier on the source chart rather than a serious ideology category and should be treated as a joke placement.',
  },
  {
    id: 'anarcho-primitivism',
    title: 'Anarcho-Primitivism',
    label: 'Anarcho\nPrimitivism',
    row: 8,
    col: 3,
    kind: 'extra',
    shortIntro:
      'Anarcho-primitivism critiques industrial civilization itself and favors radically simpler, non-hierarchical forms of life.',
    related: ['anarcho-communism', 'egoist-anarchism'],
  },
  {
    id: 'egoist-anarchism',
    title: 'Egoist Anarchism',
    label: 'Egoist\nAnarchism',
    row: 8,
    col: 4,
    kind: 'extra',
    shortIntro:
      'Egoist anarchism treats the individual will and self-ownership as primary, rejecting fixed moral and political obligations.',
    related: ['individualist-anarchism', 'anarcho-primitivism'],
  },
  {
    id: 'anarcho-epsteinism',
    title: 'Anarcho-Epsteinism',
    label: 'Anarcho\nEpsteinism',
    row: 8,
    col: 7,
    kind: 'extra',
    shortIntro:
      'This is another intentionally provocative meme label from the source image, not a serious political taxonomy entry.',
  },
  {
    id: 'radical-centrism',
    title: 'Radical Centrism',
    label: 'Radical\nCentrism',
    row: 4,
    col: 4,
    kind: 'center',
    shortIntro:
      'Radical centrism looks for pragmatic synthesis across ideological camps and favors institutional experimentation over strict tribal alignment.',
    related: ['third-way', 'techno-liberalism'],
  },
]

export const SIXTY_NINTHS_BY_ID = Object.fromEntries(
  SIXTY_NINTHS_IDEOLOGIES.map(item => [item.id, item]),
) as Record<string, SixtyNinthsIdeology>
