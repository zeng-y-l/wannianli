import { SearchSunLongitude, AstroTime, SearchMoonPhase } from 'astronomy-engine'
import { DateTime, FixedOffsetZone, Settings } from 'luxon'

Settings.throwOnInvalid = true
declare module 'luxon' {
  interface TSSettings {
    throwOnInvalid: true
  }
}

Settings.defaultZone = FixedOffsetZone.parseSpecifier('UTC+8')

function 判空<T>(val: T) {
  if (val == null) throw 'null'
  return val
}

function 记忆化<R>(f: (arg: number) => R): (arg: number) => R {
  const 缓存: Record<number, R> = {}
  return arg => 缓存.hasOwnProperty(arg) ? 缓存[arg] : (缓存[arg] = f(arg))
}

const 一到九 = [...'一二三四五六七八九']
const 日名 = [
  ...一到九.map(x => '初' + x), '初十',
  ...一到九.map(x => '十' + x), '二十',
  ...一到九.map(x => '廿' + x), '三十',
]
const 月名 = [...'正二三四五六七八九十', '十一', '十二']
const 节气名 = ['春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒',
  '立春', '雨水', '惊蛰']
const i冬至 = 270 / 15

const 计算节气 = 记忆化((年: number) => {
  let 开始 = new AstroTime(DateTime.fromObject({
    year: 年, month: 3, day: 10
  }).toJSDate())
  return Array.from({ length: 24 }, (_, i) => {
    const t = 判空(SearchSunLongitude(i * 15, 开始, 30))
    开始 = 开始.AddDays(15)
    return t
  })
})

const 计算月相 = (年: number) => {
  const 冬至 = 计算节气(年 - 1)[i冬至]
  const 下一个冬至 = +计算节气(年)[i冬至].date

  const 月相: ({ 朔日: DateTime } & Record<'上弦' | '望' | '下弦' | '朔', AstroTime>)[] = []
  let 朔 = 判空(SearchMoonPhase(0, 冬至.AddDays(-30), 30))
  for (; ;) {
    const 朔日 = DateTime.fromJSDate(朔.date).startOf('day')
    if (+朔日 > 下一个冬至) break
    const 上弦 = 判空(SearchMoonPhase(90, 朔, 10))
    const 望 = 判空(SearchMoonPhase(180, 上弦, 10))
    const 下弦 = 判空(SearchMoonPhase(270, 望, 10))
    月相.push({ 朔日, 朔, 上弦, 望, 下弦 })
    朔 = 判空(SearchMoonPhase(0, 下弦, 10))
  }

  月相.splice(0, 月相.findIndex(({ 朔日 }) => +朔日 > +冬至.date) - 1)
  return 月相
}

const 计算月份 = 记忆化((年: number) => {
  const 节气 = 计算节气(年 - 1).concat(计算节气(年))
  const 月相 = 计算月相(年)
  let 尚有闰月 = 月相.length == 14
  let 月份 = 10
  let i节气 = 节气.findIndex(t => +t.date >= +月相[0].朔日)
  return Array.from({ length: 月相.length - 1 }, (_, i) => {
    const 本月 = 月相[i]
    const 下月 = 月相[i + 1]
    const 事件: [string, DateTime][] = [
      ['朔', DateTime.fromJSDate(本月.朔.date)],
      ['上弦', DateTime.fromJSDate(本月.上弦.date)],
      ['望', DateTime.fromJSDate(本月.望.date)],
      ['下弦', DateTime.fromJSDate(本月.下弦.date)],
    ]

    let 是闰月 = 尚有闰月
    for (; i节气 < 节气.length; i节气++) {
      if (+节气[i节气].date >= +下月.朔日) break
      是闰月 &&= i节气 % 2 != 0
      事件.push([节气名[i节气 % 24], DateTime.fromJSDate(节气[i节气].date)])
    }
    尚有闰月 &&= !是闰月
    if (!是闰月) 月份++

    事件.sort(([, d1], [, d2]) => +d1 - +d2)
    return {
      月份: (月份 - 1) % 12,
      是闰月,
      事件,
      朔日: 本月.朔日,
      下月朔日: 下月.朔日,
    }
  })
})

export const 农历 = (年: number) =>
  计算月份(年).filter(({ 月份 }) => 月份 < 10)
    .concat(计算月份(年 + 1).filter(({ 月份 }) => 月份 >= 10))
    .map(({ 月份, 是闰月, 事件: 本月事件, 朔日, 下月朔日 }) => {
      const 名字 = (是闰月 ? '闰' : '') + 月名[月份] + '月'
      const 天数 = Math.round(下月朔日.diff(朔日, 'day').days)

      let i事件 = 0
      const 每周: ({ 日: number, 名字: string, 事件: string[], 日期: DateTime } | undefined)[][] = []
      let 这周 = Array(朔日.weekday - 1).fill(undefined)
      for (let 日 = 0; 日 < 天数; 日++) {
        if (这周.length == 7) {
          每周.push(这周)
          这周 = []
        }
        const 事件: string[] = []
        const 日期 = 朔日.plus({ day: 日 })
        for (; i事件 < 本月事件.length &&
          本月事件[i事件][1].hasSame(日期, 'day'); i事件++) {
          事件.push(本月事件[i事件][0])
        }
        这周.push({ 日, 名字: 日名[日], 事件, 日期 })
      }
      这周.length = 7
      每周.push(这周.fill(undefined, 这周.length))

      return {
        名字,
        每周,
        大小: 天数 == 29 ? '小' : '大',
        事件: 本月事件,
        朔日,
        下月朔日,
      }
    })
