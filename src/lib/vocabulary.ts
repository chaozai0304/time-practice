import type { Question, Semester } from './model'
import Papa from 'papaparse'
import { parseGrade, parseLesson, parseSemester } from './model'

export interface VocabularyEntry { english: string; chinese: string; grade: number; unit: string; semester?: Semester; lesson?: number | null; lessonTitle?: string }
export const vocabularyNotice = '原创基础词库，非北京某版教材完整词表；请按实际教材导入上下册词汇进行校对。'
const groups: Record<string, string> = {
  '文具与学校': 'book:书|pen:钢笔|pencil:铅笔|ruler:尺子|eraser:橡皮|bag:包|school:学校|classroom:教室|teacher:老师|student:学生|desk:课桌|chair:椅子|blackboard:黑板|crayon:蜡笔|paper:纸|notebook:笔记本|box:盒子|door:门|window:窗户|computer:电脑',
  '颜色与形状': 'red:红色|blue:蓝色|green:绿色|yellow:黄色|black:黑色|white:白色|orange:橙子；橙色|pink:粉色|purple:紫色|brown:棕色|grey:灰色|circle:圆形|square:正方形|star:星星|colour:颜色',
  '身体与家庭': 'head:头|face:脸|eye:眼睛|ear:耳朵|nose:鼻子|mouth:嘴巴|arm:手臂|hand:手|leg:腿|foot:脚|hair:头发|body:身体|family:家庭|father:爸爸|mother:妈妈|brother:兄弟|sister:姐妹|grandfather:爷爷；外公|grandmother:奶奶；外婆|baby:婴儿|boy:男孩|girl:女孩|man:男人|woman:女人|friend:朋友|name:名字',
  '动物与自然': 'cat:猫|dog:狗|bird:鸟|fish:鱼|duck:鸭子|pig:猪|cow:奶牛|horse:马|sheep:绵羊|rabbit:兔子|monkey:猴子|panda:熊猫|tiger:老虎|lion:狮子|elephant:大象|bear:熊|zebra:斑马|giraffe:长颈鹿|mouse:老鼠|chicken:鸡|bee:蜜蜂|butterfly:蝴蝶|frog:青蛙|tree:树|flower:花|grass:草|sun:太阳|moon:月亮|sky:天空|rain:雨|snow:雪|water:水|river:河流|lake:湖泊|hill:小山',
  '食物与生活': 'apple:苹果|banana:香蕉|pear:梨|peach:桃子|grape:葡萄|lemon:柠檬|strawberry:草莓|watermelon:西瓜|fruit:水果|bread:面包|rice:米饭|noodles:面条|egg:鸡蛋|cake:蛋糕|milk:牛奶|juice:果汁|tea:茶|meat:肉|beef:牛肉|soup:汤|ice cream:冰淇淋|breakfast:早餐|lunch:午餐|dinner:晚餐|food:食物|home:家|room:房间|bed:床|table:桌子|clock:钟|ball:球|toy:玩具|kite:风筝|bike:自行车|car:汽车|bus:公共汽车|train:火车|plane:飞机|boat:小船|park:公园',
  '数字与时间': 'one:一|two:二|three:三|four:四|five:五|six:六|seven:七|eight:八|nine:九|ten:十|eleven:十一|twelve:十二|thirteen:十三|fourteen:十四|fifteen:十五|sixteen:十六|seventeen:十七|eighteen:十八|nineteen:十九|twenty:二十|day:天|week:星期|year:年|morning:早晨|afternoon:下午|evening:傍晚|night:夜晚|today:今天|birthday:生日|Monday:星期一|Tuesday:星期二|Wednesday:星期三|Thursday:星期四|Friday:星期五|Saturday:星期六|Sunday:星期日',
  '动作与描述': 'read:阅读|write:写|draw:画|sing:唱歌|dance:跳舞|run:跑|walk:走|jump:跳|swim:游泳|play:玩|eat:吃|drink:喝|look:看|listen:听|speak:说|open:打开|close:关闭|sit:坐|stand:站|sleep:睡觉|like:喜欢|love:爱|help:帮助|make:制作|go:去|come:来|have:有|see:看见|big:大的|small:小的|long:长的|short:短的；矮的|tall:高的|old:旧的；年老的|new:新的|good:好的|happy:开心的|sad:难过的|hot:热的|cold:冷的|warm:温暖的|cool:凉爽的|clean:干净的|nice:美好的|fast:快的|slow:慢的|hungry:饥饿的|thirsty:口渴的|beautiful:美丽的|young:年轻的',
  '问候与常用语': 'hello:你好|hi:嗨|goodbye:再见|please:请|thanks:谢谢|sorry:对不起|yes:是|no:不是|thank you:谢谢你|good morning:早上好|good afternoon:下午好|good night:晚安|you:你|I:我|we:我们|he:他|she:她|it:它|they:他们|my:我的|your:你的|this:这个|that:那个|what:什么|who:谁|where:哪里|how:怎样|and:和|with:和……一起|in:在……里面|on:在……上面|under:在……下面',
}
export const foundationVocabulary: VocabularyEntry[] = Object.entries(groups).flatMap(([unit, data]) => data.split('|').map(pair => {
  const [english, chinese] = pair.split(':')
  return { english, chinese, grade: 3, unit }
}))
export function vocabularyQuestions(entries: VocabularyEntry[], prefix = 'vocab'): Question[] {
  return entries.flatMap((entry, index) => {
    const alternatives = [...new Set(entries.filter(e => e.chinese !== entry.chinese).map(e => e.chinese))].slice(index % Math.max(1, entries.length - 4))
    const choices = [...new Set([entry.chinese, ...alternatives, ...entries.map(e => e.chinese)])].slice(0, 4)
    const base = { grade: entry.grade, subject: '英语' as const, enabled: true, semester: parseSemester(entry.semester), lesson: parseLesson(entry.lesson), lessonTitle: entry.lessonTitle ?? '', unit: entry.unit, word: entry.english, source: prefix === 'vocab' ? vocabularyNotice : prefix.startsWith('expand') ? '原创英语基础复习（非完整教材词表）' : '家长导入词表（教材覆盖范围由家长校对）', explanation: `${entry.english}：${entry.chinese}` }
    const locationId = base.semester === 'unspecified' && base.lesson == null ? '' : `-${base.semester}-${base.lesson ?? 'none'}`
    const id = `${prefix}-${entry.grade}-${encodeURIComponent(entry.english.toLowerCase())}${locationId}`
    return [
      { ...base, id: `${id}-choice`, type: 'choice' as const, prompt: `看英语选中文：“${entry.english}” 的意思是？`, options: choices.length >= 2 ? choices : [entry.chinese, entry.chinese === '以上都不是' ? '其他意思' : '以上都不是'], answer: entry.chinese },
      { ...base, id: `${id}-fill`, type: 'fill' as const, prompt: `看中文写英语：${entry.chinese}`, options: [], answer: entry.english },
    ]
  })
}
export function parseVocabulary(content: string, filename: string): VocabularyEntry[] {
  const cleaned = content.replace(/^\uFEFF/, '')
  let values: unknown
  if (/\.json$/i.test(filename)) values = JSON.parse(cleaned)
  else if (/\.csv$/i.test(filename)) { const parsed = Papa.parse(cleaned, { header: true, skipEmptyLines: 'greedy' }); if (parsed.errors.length) throw new Error('词表 CSV 格式错误'); values = parsed.data }
  else throw new Error('词表请选择 CSV 或 JSON')
  if (!Array.isArray(values) || !values.length || values.length > 1000) throw new Error('每次词表需包含 1–1000 个词条')
  const seen = new Set<string>()
  return values.map((value, i) => {
    const entry = value as Record<string, unknown>, english = String(entry?.english ?? '').trim(), chinese = String(entry?.chinese ?? '').trim(), grade = parseGrade(entry?.grade ?? 3)
    if (typeof entry?.english !== 'string' || typeof entry?.chinese !== 'string' || !/^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/.test(english) || english.length > 80 || !chinese || chinese.length > 160 || !Number.isInteger(grade) || grade < 1 || grade > 12) throw new Error(`词表第 ${i + 1} 行无效，请检查 english、chinese、grade`)
    let semester: Semester, lesson: number | null
    try { semester = parseSemester(entry.semester); lesson = parseLesson(entry.lesson) } catch (error) { throw new Error(`词表第 ${i + 1} 行：${error instanceof Error ? error.message : '册次/课次无效'}`) }
    const key = `${grade}-${semester}-${lesson}-${english.toLowerCase()}`; if (seen.has(key)) throw new Error(`词表第 ${i + 1} 行同一册次/课次单词重复`); seen.add(key)
    return { english, chinese, grade, semester, lesson, lessonTitle: String(entry.lessonTitle ?? '').trim().slice(0, 80), unit: String(entry?.unit ?? '导入词汇').trim().slice(0, 80) }
  })
}