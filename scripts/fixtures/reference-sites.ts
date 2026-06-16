export type ReferenceSite = {
  slug: string;
  name: string;
  url: string;
  referenceDesignMdUrl: string;
};

const RAW = 'https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md';

export const referenceSites: ReferenceSite[] = [
  {
    slug: 'apple',
    name: 'Apple',
    url: 'https://www.apple.com/',
    referenceDesignMdUrl: `${RAW}/apple/DESIGN.md`
  },
  {
    slug: 'bmw-m',
    name: 'BMW M',
    url: 'https://www.bmw-m.com/',
    referenceDesignMdUrl: `${RAW}/bmw-m/DESIGN.md`
  },
  {
    slug: 'airtable',
    name: 'Airtable',
    url: 'https://www.airtable.com/',
    referenceDesignMdUrl: `${RAW}/airtable/DESIGN.md`
  },
  {
    slug: 'binance',
    name: 'Binance',
    url: 'https://www.binance.com/',
    referenceDesignMdUrl: `${RAW}/binance/DESIGN.md`
  },
  {
    slug: 'ibm',
    name: 'IBM',
    url: 'https://www.ibm.com/',
    referenceDesignMdUrl: `${RAW}/ibm/DESIGN.md`
  }
];
