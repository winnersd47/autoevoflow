'use strict'
const fs = require('fs')
const path = require('path')

const BRANDS_FILE = path.join(__dirname, '../public/data/brands.json')
const brands = JSON.parse(fs.readFileSync(BRANDS_FILE, 'utf-8'))
const existingIds = new Set(brands.map(b => b.id))

const NOW = '2026-01-01T00:00:00Z'

const newBrands = [
  {
    id: 'brand-byd', slug: 'byd', name: 'BYD', fullName: 'BYD Auto',
    country: 'China', countryCode: 'CN', foundingYear: 2003,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'BYD Auto is a Chinese automobile manufacturer and the world largest EV producer, founded in Shenzhen in 2003.',
    parentCompany: 'BYD Company', headquarters: 'Shenzhen, China',
    modelCount: 10, generationCount: 15,
    tags: ['china', 'ev', 'phev', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-nio', slug: 'nio', name: 'NIO', fullName: 'NIO Inc.',
    country: 'China', countryCode: 'CN', foundingYear: 2014,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'NIO is a Chinese premium smart electric vehicle company known for battery swapping technology and the ET, ES, EC model families.',
    parentCompany: 'NIO Inc.', headquarters: 'Shanghai, China',
    modelCount: 8, generationCount: 12,
    tags: ['china', 'ev', 'premium', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-xpeng', slug: 'xpeng', name: 'Xpeng', fullName: 'Xpeng Motors',
    country: 'China', countryCode: 'CN', foundingYear: 2014,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Xpeng (XPEV) is a Chinese smart EV company focused on autonomous driving technology, founded in Guangzhou.',
    parentCompany: 'Xpeng Inc.', headquarters: 'Guangzhou, China',
    modelCount: 5, generationCount: 8,
    tags: ['china', 'ev', 'autonomous', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-geely', slug: 'geely', name: 'Geely', fullName: 'Geely Automobile',
    country: 'China', countryCode: 'CN', foundingYear: 1986,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Geely Automobile is China largest private automotive group, owning Volvo, Polestar, Zeekr, Lynk & Co, and Lotus.',
    parentCompany: 'Geely Holding Group', headquarters: 'Hangzhou, China',
    modelCount: 8, generationCount: 10,
    tags: ['china', 'automotive', 'phev', 'bev'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-zeekr', slug: 'zeekr', name: 'Zeekr', fullName: 'Zeekr Intelligent Technology',
    country: 'China', countryCode: 'CN', foundingYear: 2021,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Zeekr is a premium EV brand of Geely targeting tech-savvy buyers with the 001 fastback, 009 MPV, X compact SUV, and MIX.',
    parentCompany: 'Geely Holding Group', headquarters: 'Hangzhou, China',
    modelCount: 5, generationCount: 6,
    tags: ['china', 'ev', 'premium', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-lynk-co', slug: 'lynk-co', name: 'Lynk & Co', fullName: 'Lynk & Co Automotive',
    country: 'China', countryCode: 'CN', foundingYear: 2016,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Lynk & Co is a joint brand of Geely and Volvo Cars targeting global markets with PHEV and BEV models on the CMA platform.',
    parentCompany: 'Geely Holding Group', headquarters: 'Gothenburg / Hangzhou',
    modelCount: 5, generationCount: 6,
    tags: ['china', 'sweden', 'phev', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-li-auto', slug: 'li-auto', name: 'Li Auto', fullName: 'Li Auto Inc.',
    country: 'China', countryCode: 'CN', foundingYear: 2015,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Li Auto (Li Xiang, 理想汽车) is China leading EREV maker. The L-series SUVs deliver 1000+ km range and 6-seat luxury at mid-premium prices.',
    parentCompany: 'Li Auto Inc.', headquarters: 'Beijing, China',
    modelCount: 6, generationCount: 7,
    tags: ['china', 'erev', 'suv', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-denza', slug: 'denza', name: 'Denza', fullName: 'Denza (腾势)',
    country: 'China', countryCode: 'CN', foundingYear: 2010,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Denza (腾势) is a premium EV brand jointly founded by BYD (90%) and Mercedes-Benz (10%). The Z9 GT blends BYD DMO platform with Mercedes-inspired GT proportions.',
    parentCompany: 'BYD Company', headquarters: 'Shenzhen, China',
    modelCount: 4, generationCount: 4,
    tags: ['china', 'ev', 'phev', 'premium', 'byd', 'mercedes', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-aito', slug: 'aito', name: 'Aito', fullName: 'Aito (问界)',
    country: 'China', countryCode: 'CN', foundingYear: 2021,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Aito (问界) is a smart car brand co-created by Huawei and Seres. Known for HUAWEI ADS autonomous driving, HarmonyOS Cockpit 3.0, and extended-range PHEV technology.',
    parentCompany: 'Seres Group / Huawei', headquarters: 'Chongqing, China',
    modelCount: 4, generationCount: 5,
    tags: ['china', 'phev', 'bev', 'huawei', 'smart', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-hiphi', slug: 'hiphi', name: 'HiPhi', fullName: 'HiPhi (高合)',
    country: 'China', countryCode: 'CN', foundingYear: 2019,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'HiPhi (高合) is a Chinese ultra-luxury EV brand. The HiPhi X features 6 active scissor doors and a fully programmable body panel system — the most technologically ambitious BEV from China.',
    parentCompany: 'Human Horizons', headquarters: 'Shanghai, China',
    modelCount: 3, generationCount: 3,
    tags: ['china', 'ev', 'ultra-luxury', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-avatr', slug: 'avatr', name: 'Avatr', fullName: 'Avatr Technology (阿维塔)',
    country: 'China', countryCode: 'CN', foundingYear: 2021,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Avatr (阿维塔) is a premium EV brand co-founded by Chery Automobile, Huawei, and CATL — representing the most powerful technology alliance in the Chinese EV space.',
    parentCompany: 'Chery / Huawei / CATL', headquarters: 'Chongqing, China',
    modelCount: 3, generationCount: 3,
    tags: ['china', 'ev', 'premium', 'huawei', 'catl', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'brand-seres', slug: 'seres', name: 'Seres', fullName: 'Seres Group (赛力斯)',
    country: 'China', countryCode: 'CN', foundingYear: 2016,
    logoUrl: '', logoWhiteUrl: '', headerImageUrl: '',
    description: 'Seres (赛力斯) is a Chongqing-based EV manufacturer and the production partner for Huawei in the Aito brand joint venture.',
    parentCompany: 'Seres Group', headquarters: 'Chongqing, China',
    modelCount: 1, generationCount: 1,
    tags: ['china', 'phev', 'automotive'],
    aiAnalysisAvailable: false, createdAt: NOW, updatedAt: NOW,
  },
]

let added = 0
for (const b of newBrands) {
  if (!existingIds.has(b.id)) {
    brands.push(b)
    existingIds.add(b.id)
    added++
    console.log('  +', b.id, b.name)
  } else {
    console.log('  = skip (exists):', b.id)
  }
}

fs.writeFileSync(BRANDS_FILE, JSON.stringify(brands, null, 2))
console.log('\nAdded:', added, 'brands. Total:', brands.length)
