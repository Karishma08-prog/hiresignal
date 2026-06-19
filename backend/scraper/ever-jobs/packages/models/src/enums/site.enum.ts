export enum Site {
  LINKEDIN = 'linkedin',
  INDEED = 'indeed',
  ZIP_RECRUITER = 'zip_recruiter',
  GLASSDOOR = 'glassdoor',
  GOOGLE = 'google',
  BAYT = 'bayt',
  NAUKRI = 'naukri',
  BDJOBS = 'bdjobs',
  INTERNSHALA = 'internshala',
  EXA = 'exa',
  UPWORK = 'upwork',
  ASHBY = 'ashby',
  GREENHOUSE = 'greenhouse',
  LEVER = 'lever',
  WORKABLE = 'workable',
  SMARTRECRUITERS = 'smartrecruiters',
  RIPPLING = 'rippling',
  WORKDAY = 'workday',
  AMAZON = 'amazon',
  APPLE = 'apple',
  MICROSOFT = 'microsoft',
  NVIDIA = 'nvidia',
  TIKTOK = 'tiktok',
  UBER = 'uber',
  CURSOR = 'cursor',
  JOBICY = 'jobicy',
  HIMALAYAS = 'himalayas',
  REMOTEOK = 'remoteok',
  REMOTIVE = 'remotive',
  RECRUITEE = 'recruitee',
  TEAMTAILOR = 'teamtailor',
  ARBEITNOW = 'arbeitnow',
  WEWORKREMOTELY = 'weworkremotely',
  USAJOBS = 'usajobs',
  ADZUNA = 'adzuna',
  REED = 'reed',
  JOOBLE = 'jooble',
  CAREERJET = 'careerjet',
  BAMBOOHR = 'bamboohr',
  PERSONIO = 'personio',
  JAZZHR = 'jazzhr',
  DICE = 'dice',
  SIMPLYHIRED = 'simplyhired',
  WELLFOUND = 'wellfound',
  STEPSTONE = 'stepstone',
  MONSTER = 'monster',
  CAREERBUILDER = 'careerbuilder',
  ICIMS = 'icims',
  TALEO = 'taleo',
  SUCCESSFACTORS = 'successfactors',
  JOBVITE = 'jobvite',
  ADP = 'adp',
  UKG = 'ukg',
  // Phase 6: New company scrapers
  GOOGLE_CAREERS = 'google_careers',
  META = 'meta',
  NETFLIX = 'netflix',
  STRIPE = 'stripe',
  OPENAI = 'openai',
  // Phase 6: New ATS integrations
  BREEZYHR = 'breezyhr',
  COMEET = 'comeet',
  PINPOINT = 'pinpoint',
  // Phase 7: Additional job boards
  BUILTIN = 'builtin',
  SNAGAJOB = 'snagajob',
  DRIBBBLE = 'dribbble',
  // Phase 8: ATS Expansion
  MANATAL = 'manatal',
  PAYLOCITY = 'paylocity',
  FRESHTEAM = 'freshteam',
  BULLHORN = 'bullhorn',
  TRAKSTAR = 'trakstar',
  HIRINGTHING = 'hiringthing',
  LOXO = 'loxo',
  FOUNTAIN = 'fountain',
  DEEL = 'deel',
  PHENOM = 'phenom',
  // Phase 8: Company scrapers
  IBM = 'ibm',
  BOEING = 'boeing',
  ZOOM = 'zoom',
  // Phase 9: Job board expansion
  THEMUSE = 'themuse',
  WORKINGNOMADS = 'workingnomads',
  FOURDAYWEEK = 'fourdayweek',
  STARTUPJOBS = 'startupjobs',
  NODESK = 'nodesk',
  WEB3CAREER = 'web3career',
  ECHOJOBS = 'echojobs',
  JOBSTREET = 'jobstreet',
  // Phase 10: Government boards & ATS expansion
  CAREERONESTOP = 'careeronestop',
  ARBEITSAGENTUR = 'arbeitsagentur',
  JOBYLON = 'jobylon',
  HOMERUN = 'homerun',
  // Phase 11: Niche boards & developer API expansion
  HACKERNEWS = 'hackernews',
  LANDINGJOBS = 'landingjobs',
  FINDWORK = 'findwork',
  JOBDATAAPI = 'jobdataapi',
  // Phase 12: ATS & niche board expansion
  AUTHENTICJOBS = 'authenticjobs',
  JOBSCORE = 'jobscore',
  TALENTLYFT = 'talentlyft',
  // Phase 13: RSS niche board expansion
  CRYPTOJOBSLIST = 'cryptojobslist',
  JOBSPRESSO = 'jobspresso',
  HIGHEREDJOBS = 'higheredjobs',
  FOSSJOBS = 'fossjobs',
  LARAJOBS = 'larajobs',
  PYTHONJOBS = 'pythonjobs',
  DRUPALJOBS = 'drupaljobs',
  REALWORKFROMANYWHERE = 'realworkfromanywhere',
  GOLANGJOBS = 'golangjobs',
  WORDPRESSJOBS = 'wordpressjobs',
  // Phase 14: API-key sources & ATS expansion
  TALROO = 'talroo',
  INFOJOBS = 'infojobs',
  CRELATE = 'crelate',
  ISMARTRECRUIT = 'ismartrecruit',
  RECRUITERFLOW = 'recruiterflow',
  // Phase 15: European government & regional boards
  JOBTECHDEV = 'jobtechdev',
  FRANCETRAVAIL = 'francetravail',
  NAVJOBS = 'navjobs',
  JOBSACUK = 'jobsacuk',
  JOBINDEX = 'jobindex',
  // Phase 16: Global expansion (LatAm, gig, startup, Canada)
  GETONBOARD = 'getonboard',
  FREELANCERCOM = 'freelancercom',
  JOINRISE = 'joinrise',
  CANADAJOBBANK = 'canadajobbank',
  // Phase 17: Niche & international expansion (NGO, UN, IT)
  RELIEFWEB = 'reliefweb',
  UNDPJOBS = 'undpjobs',
  DEVITJOBS = 'devitjobs',
  // Phase 18: Niche RSS expansion (tech, design, environment, regional)
  PYJOBS = 'pyjobs',
  VUEJOBS = 'vuejobs',
  CONSERVATIONJOBS = 'conservationjobs',
  COROFLOT = 'coroflot',
  BERLINSTARTUPJOBS = 'berlinstartupjobs',
  // Phase 19: Tech niche, crypto, regional expansion
  RAILSJOBS = 'railsjobs',
  ELIXIRJOBS = 'elixirjobs',
  CRUNCHBOARD = 'crunchboard',
  CRYPTOCURRENCYJOBS = 'cryptocurrencyjobs',
  HASJOB = 'hasjob',
  // Phase 20: European regional & niche expansion
  ICRUNCHDATA = 'icrunchdata',
  SWISSDEVJOBS = 'swissdevjobs',
  GERMANTECHJOBS = 'germantechjobs',
  VIRTUALVOCATIONS = 'virtualvocations',
  NOFLUFFJOBS = 'nofluffjobs',
  // Phase 21: Niche & academic expansion
  GREENJOBSBOARD = 'greenjobsboard',
  EUROJOBS = 'eurojobs',
  OPENSOURCEDESIGNJOBS = 'opensourcedesignjobs',
  ACADEMICCAREERS = 'academiccareers',
  REMOTEFIRSTJOBS = 'remotefirstjobs',
  // Phase 22: Eastern European, CIS & Singapore expansion
  DJINNI = 'djinni',
  HEADHUNTER = 'headhunter',
  HABRCAREER = 'habrcareer',
  MYCAREERSFUTURE = 'mycareersfuture',
  // Phase 23: Japan, Nordic & Swiss expansion
  JOBSINJAPAN = 'jobsinjapan',
  DUUNITORI = 'duunitori',
  JOBSCH = 'jobsch',
  // Phase 24: UK & mobile dev expansion
  GUARDIANJOBS = 'guardianjobs',
  ANDROIDJOBS = 'androidjobs',
  IOSDEVJOBS = 'iosdevjobs',
  // Phase 25: DevOps, FP, diversity & niche expansion
  DEVOPSJOBS = 'devopsjobs',
  FUNCTIONALWORKS = 'functionalworks',
  POWERTOFLY = 'powertofly',
  CLOJUREJOBS = 'clojurejobs',
  // Phase 26: Environmental & conservation
  ECOJOBS = 'ecojobs',
  // Phase 27: Asia-Pacific & US tech expansion
  JOBSDB = 'jobsdb',
  TECHCAREERS = 'techcareers',
  // Phase 28: Spec 006 — ATS-Scrapers Parity, Batch 1
  AVATURE = 'avature',
  GEM = 'gem',
  JOIN_COM = 'join_com',
  // Phase 29: Spec 013 — ATS-Scrapers Parity, Batch 2 (Oracle HCM / Mercor / Tesla)
  ORACLE = 'oracle',
  MERCOR = 'mercor',
  TESLA = 'tesla',
  TESLA_PLAYWRIGHT = 'tesla_playwright',
  // Phase 30: Spec 020 — Source Company Plugin: Anthropic
  ANTHROPIC = 'anthropic',
  // Phase 31: Spec 021 — Source Company Plugin: Databricks
  DATABRICKS = 'databricks',
  // Phase 32: Spec 022 — Source Company Plugin: Discord
  DISCORD = 'discord',
  // Phase 33: Spec 023 — Source Company Plugin: Coinbase
  COINBASE = 'coinbase',
  // Phase 34: Spec 024 — Source Company Plugin: DoorDash
  DOORDASH = 'doordash',
  // Phase 35: Spec 025 — Source Company Plugin: Airbnb
  AIRBNB = 'airbnb',
  // Phase 36: Spec 026 — Source Company Plugin: Robinhood
  ROBINHOOD = 'robinhood',
  // Phase 37: Spec 027 — Source Company Plugin: Reddit
  REDDIT = 'reddit',
  // Phase 38: Spec 028 — Source Company Plugin: Pinterest
  PINTEREST = 'pinterest',
  // Phase 39: Spec 029 — Source Company Plugin: Lyft
  LYFT = 'lyft',
  // Phase 40: Spec 030 — Source Company Plugin: Plaid
  PLAID = 'plaid',
  // Phase 41: Spec 031 — Source Company Plugin: Asana
  ASANA = 'asana',
  // Phase 42: Spec 032 — Source Company Plugin: Figma
  FIGMA = 'figma',
  // Phase 43: Spec 033 — Source Company Plugin: Gitlab
  GITLAB = 'gitlab',
  // Phase 44: Spec 034 — Source Company Plugin: Twitch
  TWITCH = 'twitch',
  // Phase 45: Spec 035 — Source Company Plugin: Twilio
  TWILIO = 'twilio',
  // Phase 46: Spec 036 — Source Company Plugin: Cloudflare
  CLOUDFLARE = 'cloudflare',
  // Phase 47: Spec 037 — Source Company Plugin: MongoDB
  MONGODB = 'mongodb',
  // Phase 48: Spec 038 — Source Company Plugin: Datadog
  DATADOG = 'datadog',
  // Phase 49: Spec 039 — Source Company Plugin: Instacart
  INSTACART = 'instacart',
  // Phase 50: Spec 040 — Source Company Plugin: Dropbox
  DROPBOX = 'dropbox',
  // Phase 51: Spec 041 — Source Company Plugin: Roblox
  ROBLOX = 'roblox',
  // Phase 52: Spec 042 — Source Company Plugin: Block
  BLOCK = 'block',
  // Phase 53: Spec 043 — Source Company Plugin: Vercel
  VERCEL = 'vercel',
  // Phase 54: Spec 044 — Source Company Plugin: Affirm
  AFFIRM = 'affirm',
  // Phase 55: Spec 045 — Source Company Plugin: Klaviyo
  KLAVIYO = 'klaviyo',
  // Phase 56: Spec 046 — Source Company Plugin: Duolingo
  DUOLINGO = 'duolingo',
  // Phase 57: Spec 047 — Source Company Plugin: Brex
  BREX = 'brex',
  // Phase 58: Spec 048 — Source Company Plugin: Gusto
  GUSTO = 'gusto',
  // Phase 59: Spec 049 — Source Company Plugin: Mercury
  MERCURY = 'mercury',
  // Phase 60: Spec 050 — Source Company Plugin: Buildkite
  BUILDKITE = 'buildkite',
  // Phase 61: Spec 051 — Source Company Plugin: CircleCI
  CIRCLECI = 'circleci',
  // Phase 62: Spec 052 — Source Company Plugin: Ramp Network
  RAMPNETWORK = 'rampnetwork',
  // Phase 63: Spec 053 — Source Company Plugin: Netlify
  NETLIFY = 'netlify',
  // Phase 64: Spec 054 — Source Company Plugin: Postman
  POSTMAN = 'postman',
  // Phase 65: Spec 055 — Source Company Plugin: Toast
  TOAST = 'toast',
  // Phase 66: Spec 056 — Source Company Plugin: Webflow
  WEBFLOW = 'webflow',
  // Phase 67: Spec 057 — Source Company Plugin: ZoomInfo
  ZOOMINFO = 'zoominfo',
  // Phase 68: Spec 058 — Source Company Plugin: Attentive
  ATTENTIVE = 'attentive',
  // Phase 69: Spec 059 — Source Company Plugin: Chime
  CHIME = 'chime',
  // Phase 70: Spec 060 — Source Company Plugin: Elastic
  ELASTIC = 'elastic',
  // Phase 71: Spec 061 — Source Company Plugin: Intercom
  INTERCOM = 'intercom',
  // Phase 72: Spec 062 — Source Company Plugin: Mixpanel
  MIXPANEL = 'mixpanel',
  // Phase 73: Spec 063 — Source Company Plugin: Faire
  FAIRE = 'faire',
  // Phase 74: Spec 064 — Source Company Plugin: Scale AI
  SCALEAI = 'scaleai',
  // Phase 75: Spec 065 — Source Company Plugin: Cameo
  CAMEO = 'cameo',
  // Phase 76: Spec 066 — Source Company Plugin: Carta
  CARTA = 'carta',
  // Phase 77: Spec 067 — Source Company Plugin: ClassPass
  CLASSPASS = 'classpass',
  // Phase 78: Spec 068 — Source Company Plugin: Coursera
  COURSERA = 'coursera',
  // Phase 79: Spec 069 — Source Company Plugin: Epic Games
  EPICGAMES = 'epicgames',
  // Phase 80: Spec 070 — Source Company Plugin: Flexport
  FLEXPORT = 'flexport',
  // Phase 81: Spec 071 — Source Company Plugin: fuboTV
  FUBOTV = 'fubotv',
  // Phase 82: Spec 072 — Source Company Plugin: Glossier
  GLOSSIER = 'glossier',
  // Phase 83: Spec 073 — Source Company Plugin: Honeycomb
  HONEYCOMB = 'honeycomb',
  // Phase 84: Spec 074 — Source Company Plugin: Lattice
  LATTICE = 'lattice',
  // Phase 85: Spec 075 — Source Company Plugin: MasterClass
  MASTERCLASS = 'masterclass',
  // Phase 86: Spec 076 — Source Company Plugin: Maven Clinic
  MAVENCLINIC = 'mavenclinic',
  // Phase 87: Spec 077 — Source Company Plugin: Stitch Fix
  STITCHFIX = 'stitchfix',
  // Phase 88: Spec 078 — Source Company Plugin: Udemy
  UDEMY = 'udemy',
  // Phase 89: Spec 079 — Source Company Plugin: Bitwarden
  BITWARDEN = 'bitwarden',
  // Phase 90: Spec 080 — Source Company Plugin: Calendly
  CALENDLY = 'calendly',
  // Phase 91: Spec 081 — Source Company Plugin: DataCamp
  DATACAMP = 'datacamp',
  // Phase 92: Spec 082 — Source Company Plugin: Fivetran
  FIVETRAN = 'fivetran',
  // Phase 93: Spec 083 — Source Company Plugin: Lookout
  LOOKOUT = 'lookout',
  // Phase 94: Spec 084 — Source Company Plugin: Marqeta
  MARQETA = 'marqeta',
  // Phase 95: Spec 085 — Source Company Plugin: New Relic
  NEWRELIC = 'newrelic',
  // Phase 96: Spec 086 — Source Company Plugin: Peloton
  PELOTON = 'peloton',
  // Phase 97: Spec 087 — Source Company Plugin: Scopely
  SCOPELY = 'scopely',
  // Phase 98: Spec 088 — Source Company Plugin: Squarespace
  SQUARESPACE = 'squarespace',
  // Phase 99: Spec 089 — Source Company Plugin: Typeform
  TYPEFORM = 'typeform',
  // Phase 100: Spec 090 — Source Company Plugin: Adyen
  ADYEN = 'adyen',
  // Phase 101: Spec 091 — Source Company Plugin: Benevity
  BENEVITY = 'benevity',
  // Phase 102: Spec 092 — Source Company Plugin: BILL (billcom)
  BILLCOM = 'billcom',
  // Phase 103: Spec 093 — Source Company Plugin: Bobbie
  BOBBIE = 'bobbie',
  // Phase 104: Spec 094 — Source Company Plugin: Cerebral
  CEREBRAL = 'cerebral',
  // Phase 105: Spec 095 — Source Company Plugin: Coalition
  COALITION = 'coalition',
  // Phase 106: Spec 096 — Source Company Plugin: Dollar Shave Club
  DOLLARSHAVECLUB = 'dollarshaveclub',
  // Phase 107: Spec 097 — Source Company Plugin: HelloFresh
  HELLOFRESH = 'hellofresh',
  // Phase 108: Spec 098 — Source Company Plugin: Misfits Market
  MISFITSMARKET = 'misfitsmarket',
  // Phase 109: Spec 099 — Source Company Plugin: Monzo
  MONZO = 'monzo',
  // Phase 110: Spec 100 — Source Company Plugin: N26
  N26 = 'n26',
  // Phase 111: Spec 101 — Source Company Plugin: PlanetScale
  PLANETSCALE = 'planetscale',
  // Phase 112: Spec 102 — Source Company Plugin: SoFi
  SOFI = 'sofi',
  // Phase 113: Spec 103 — Source Company Plugin: StockX
  STOCKX = 'stockx',
  // Phase 114: Spec 104 — Source Company Plugin: sweetgreen
  SWEETGREEN = 'sweetgreen',
  // Phase 115: Spec 105 — Source Company Plugin: xAI
  XAI = 'xai',
  // Phase 116: Spec 106 — Source Company Plugin: Airtable
  AIRTABLE = 'airtable',
  // Phase 117: Spec 107 — Source Company Plugin: Amplitude
  AMPLITUDE = 'amplitude',
  // Phase 118: Spec 108 — Source Company Plugin: AssemblyAI
  ASSEMBLYAI = 'assemblyai',
  // Phase 119: Spec 109 — Source Company Plugin: Bandwidth
  BANDWIDTH = 'bandwidth',
  // Phase 120: Spec 110 — Source Company Plugin: Braze
  BRAZE = 'braze',
  // Phase 121: Spec 111 — Source Company Plugin: Constant Contact
  CONSTANTCONTACT = 'constantcontact',
  // Phase 122: Spec 112 — Source Company Plugin: Descript
  DESCRIPT = 'descript',
  // Phase 123: Spec 113 — Source Company Plugin: Fastly
  FASTLY = 'fastly',
  // Phase 124: Spec 114 — Source Company Plugin: LaunchDarkly
  LAUNCHDARKLY = 'launchdarkly',
  // Phase 125: Spec 115 — Source Company Plugin: Okta
  OKTA = 'okta',
  // Phase 126: Spec 116 — Source Company Plugin: Otter
  OTTER = 'otter',
  // Phase 127: Spec 117 — Source Company Plugin: PagerDuty
  PAGERDUTY = 'pagerduty',
  // Phase 128: Spec 118 — Source Company Plugin: Pendo
  PENDO = 'pendo',
  // Phase 129: Spec 119 — Source Company Plugin: Vonage
  VONAGE = 'vonage',
  // Phase 130: Spec 120 — Source Company Plugin: Betterment
  BETTERMENT = 'betterment',
  // Phase 131: Spec 121 — Source Company Plugin: Branch
  BRANCH = 'branch',
  // Phase 132: Spec 122 — Source Company Plugin: Chainguard
  CHAINGUARD = 'chainguard',
  // Phase 133: Spec 123 — Source Company Plugin: Checkr
  CHECKR = 'checkr',
  // Phase 134: Spec 124 — Source Company Plugin: Contentful
  CONTENTFUL = 'contentful',
  // Phase 135: Spec 125 — Source Company Plugin: Descope
  DESCOPE = 'descope',
  // Phase 136: Spec 126 — Source Company Plugin: Dialpad
  DIALPAD = 'dialpad',
  // Phase 137: Spec 127 — Source Company Plugin: Doximity
  DOXIMITY = 'doximity',
  // Phase 138: Spec 128 — Source Company Plugin: Dremio
  DREMIO = 'dremio',
  // Phase 139: Spec 129 — Source Company Plugin: Justworks
  JUSTWORKS = 'justworks',
  // Phase 140: Spec 130 — Source Company Plugin: Melio
  MELIO = 'melio',
  // Phase 141: Spec 131 — Source Company Plugin: Modern Health
  MODERNHEALTH = 'modernhealth',
  // Phase 142: Spec 132 — Source Company Plugin: Opendoor
  OPENDOOR = 'opendoor',
  // Phase 143: Spec 133 — Source Company Plugin: Oscar
  OSCAR = 'oscar',
  // Phase 144: Spec 134 — Source Company Plugin: Starburst
  STARBURST = 'starburst',
  // Phase 145: Spec 135 — Source Company Plugin: Axon
  AXON = 'axon',
  // Phase 146: Spec 136 — Source Company Plugin: BEAM
  BEAM = 'beam',
  // Phase 147: Spec 137 — Source Company Plugin: BigID
  BIGID = 'bigid',
  // Phase 148: Spec 138 — Source Company Plugin: Blend
  BLEND = 'blend',
  // Phase 149: Spec 139 — Source Company Plugin: Bloomreach
  BLOOMREACH = 'bloomreach',
  // Phase 150: Spec 140 — Source Company Plugin: Celonis
  CELONIS = 'celonis',
  // Phase 151: Spec 141 — Source Company Plugin: ComplyAdvantage
  COMPLYADVANTAGE = 'complyadvantage',
  // Phase 152: Spec 142 — Source Company Plugin: Conviva
  CONVIVA = 'conviva',
  // Phase 153: Spec 143 — Source Company Plugin: Cribl
  CRIBL = 'cribl',
  // Phase 154: Spec 144 — Source Company Plugin: Earnest
  EARNEST = 'earnest',
  // Phase 155: Spec 145 — Source Company Plugin: ExpressVPN
  EXPRESSVPN = 'expressvpn',
  // Phase 156: Spec 146 — Source Company Plugin: Fairmarkit
  FAIRMARKIT = 'fairmarkit',
  // Phase 157: Spec 147 — Source Company Plugin: Formlabs
  FORMLABS = 'formlabs',
  // Phase 158: Spec 148 — Source Company Plugin: Founders
  FOUNDERS = 'founders',
  // Phase 159: Spec 149 — Source Company Plugin: Fox
  FOX = 'fox',
  // Phase 160: Spec 150 — Source Company Plugin: GoCardless
  GOCARDLESS = 'gocardless',
  // Phase 161: Spec 151 — Source Company Plugin: GoFundMe
  GOFUNDME = 'gofundme',
  // Phase 162: Spec 152 — Source Company Plugin: Alma
  ALMA = 'alma',
  // Phase 163: Spec 153 — Source Company Plugin: Bird
  BIRD = 'bird',
  // Phase 164: Spec 154 — Source Company Plugin: BitGo
  BITGO = 'bitgo',
  // Phase 165: Spec 155 — Source Company Plugin: Collective Health
  COLLECTIVEHEALTH = 'collectivehealth',
  // Phase 166: Spec 156 — Source Company Plugin: DeepMind
  DEEPMIND = 'deepmind',
  // Phase 167: Spec 157 — Source Company Plugin: Indigo
  INDIGO = 'indigo',
  // Phase 168: Spec 158 — Source Company Plugin: Instabase
  INSTABASE = 'instabase',
  // Phase 169: Spec 159 — Source Company Plugin: Iterable
  ITERABLE = 'iterable',
  // Phase 170: Spec 160 — Source Company Plugin: Labelbox
  LABELBOX = 'labelbox',
  // Phase 171: Spec 161 — Source Company Plugin: Markforged
  MARKFORGED = 'markforged',
  // Phase 172: Spec 162 — Source Company Plugin: Maven
  MAVEN = 'maven',
  // Phase 173: Spec 163 — Source Company Plugin: Netskope
  NETSKOPE = 'netskope',
  // Phase 174: Spec 164 — Source Company Plugin: Postscript
  POSTSCRIPT = 'postscript',
  // Phase 175: Spec 165 — Source Company Plugin: Cresta
  CRESTA = 'cresta',
  // Phase 176: Spec 166 — Source Company Plugin: Quanata
  QUANATA = 'quanata',
  // Phase 177: Spec 167 — Source Company Plugin: Recharge
  RECHARGE = 'recharge',
  // Phase 178: Spec 168 — Source Company Plugin: Samsara
  SAMSARA = 'samsara',
  // Phase 179: Spec 169 — Source Company Plugin: Sezzle
  SEZZLE = 'sezzle',
  // Phase 180: Spec 170 — Source Company Plugin: Shopmonkey
  SHOPMONKEY = 'shopmonkey',
  // Phase 181: Spec 171 — Source Company Plugin: SimpliSafe
  SIMPLISAFE = 'simplisafe',
  // Phase 182: Spec 172 — Source Company Plugin: Symphony
  SYMPHONY = 'symphony',
  // Phase 183: Spec 173 — Source Company Plugin: Tatari
  TATARI = 'tatari',
  // Phase 184: Spec 174 — Source Company Plugin: Textio
  TEXTIO = 'textio',
  // Phase 185: Spec 175 — Source Company Plugin: AccuWeather
  ACCUWEATHER = 'accuweather',
  // Phase 186: Spec 176 — Source Company Plugin: ACI Learning
  ACILEARNING = 'acilearning',
  // Phase 187: Spec 177 — Source Company Plugin: Ackermann Group
  ACKERMANNGROUP = 'ackermanngroup',
  // Phase 188: Spec 178 — Source Company Plugin: ACLU
  ACLU = 'aclu',
  // Phase 189: Spec 179 — Source Company Plugin: ACOG
  ACOG = 'acog',
  // Phase 190: Spec 180 — Source Company Plugin: aCommerce
  ACOMMERCE = 'acommerce',
  // Phase 191: Spec 181 — Source Company Plugin: ACP
  ACP = 'acp',
  // Phase 192: Spec 182 — Source Company Plugin: Acquia
  ACQUIA = 'acquia',
  // Phase 193: Spec 183 — Source Company Plugin: Acrisure Innovation
  ACRISUREINNOVATION = 'acrisureinnovation',
  // Phase 194: Spec 184 — Source Company Plugin: Acryl Data
  ACRYLDATA = 'acryldata',
  // Phase 195: Spec 185 — Source Company Plugin: Acumen
  ACUMEN = 'acumen',
}

/**
 * Map a raw string (case-insensitive) to a Site enum value.
 */
export function mapStringToSite(siteName: string): Site {
  const key = siteName.toUpperCase() as keyof typeof Site;
  if (Site[key] !== undefined) {
    return Site[key];
  }
  // Fallback for custom plugins/scrapers
  return siteName.toLowerCase() as Site;
}
