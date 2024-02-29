import PuppeteerScrapper from './providers/puppeteer.js'
import fe from './providers/Cities.js'
import xlsx, { IJsonSheet } from 'json-as-xlsx'

class WriteXlsx {
  download(data: any[], sheet_name: string): void {
    let settings = {
      fileName: 'retail_stores', // Name of the resulting spreadsheet
      extraLength: 3, // A bigger number means that columns will be wider
      writeMode: 'writeFile', // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
      writeOptions: {
        sheet: sheet_name,
      }, // Style options from https://docs.sheetjs.com/docs/api/write-options
      RTL: false, // Display the columns from right-to-left (the default value is false)
    }
    const Data: IJsonSheet[] = [
      {
        sheet: sheet_name,
        columns: [
          { label: 'Name', value: 'name' },
          { label: 'Latitude', value: 'latitude' },
          { label: 'Longitude', value: 'longitude' },
        ],
        //@ts-ignore
        content: data,
      },
    ]
    xlsx(Data, settings, () => {
      console.log('Data Finished Writing ...')
    })
  }
}

class CollectLinks extends PuppeteerScrapper<string[]> {
  constructor(private capital: capital) {
    super([], { protocolTimeout: 999999, headless: false })
  }
  private async scrollDown() {
    await this.$page!.evaluate(async () => {
      await new Promise((resolve, reject) => {
        let derd = document.querySelector('div[role=feed]')
        var totalHeight = 0
        var distance = 100
        var timer = setInterval(() => {
          var scrollHeight = derd!.scrollHeight
          derd!.scrollBy(0, distance)
          totalHeight += distance
          if (totalHeight >= scrollHeight) {
            clearInterval(timer)
            resolve('')
          }
        }, 1000)
      })
    })
  }
  private generateLink() {
    const { name, latitude, longitude } = this.capital
    const country_name = name.split(',')[1].trim()
    const capital_name = name.split(',')[0].split(' ').join('+')
    return `https://www.google.com/maps/search/retail+stores+${capital_name},+${country_name}+/@${latitude.toString()},${longitude.toString()}`
  }

  protected async $extract(): Promise<void> {
    // console.log(this.generateLink())
    await this.navigate(this.generateLink())
    await this.scrollDown()
    await this.$page
      ?.evaluate(() => {
        return Array.from(document.querySelectorAll('a.hfpxzc')).map(
          (x) => (x as HTMLAnchorElement).href,
        )
      })
      .then((links) => {
        links.map((x) => {
          this.payload.push(x)
        })
      })
  }
}
interface store {
  name: string
  latitude: string
  longitude: string
}

class Article {
  private payload: store[]
  constructor(
    private de: string[],
    private capital: string,
  ) {
    this.payload = []
  }
  detail() {
    console.log(
      `Number of Stores available in ${this.capital} :: ${this.de.length}`,
    )
    for (let i = 0; i < this.de.length; i++) {
      const element = this.de[i]
      const url = new URL(element)
      this.payload.push({
        name: url.pathname.split('/')[3].split('+').join(' '),
        latitude: url.pathname.split('!')[5].slice(2),
        longitude: url.pathname.split('!')[6].slice(2),
      })
    }
    return this.payload
  }
}

interface capital {
  name: string
  latitude: number
  longitude: number
}
class Index {
  constructor(private captitals: capital[]) {}
  public async go() {
    let data: any[] = []
    for (let i = 0; i < this.captitals.length; i++) {
      const element = this.captitals[i]

      new Article(await new CollectLinks(element).exec(), element.name)
        .detail()
        .map((article) => {
          data.push(article)
        })
    }
    new WriteXlsx().download(data, 'retail_stores')
  }
}

let test_data = [
  { name: 'Vermont, USA', latitude: 44.0, longitude: -72.699997 },
]
new Index(test_data).go()
