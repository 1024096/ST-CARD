export interface Girl {
  id: number
  name: string
  title: string
  specialty: string
  skill: string
  quote: string
}

export const girls: Girl[] = [
  {
    id: 1,
    name: '红蝶',
    title: 'La Papillon Rouge',
    specialty: '扇子舞 · 魅惑术',
    skill: '欲擒故纵，以退为进，将猎物玩弄于股掌之间',
    quote: '"先生，您的心跳声太响了——吵到我了呢。"',
  },
  {
    id: 2,
    name: '柳如烟',
    title: 'Fumée de Saule',
    specialty: '古琴 · 茶道 · 香疗',
    skill: '如丝缎包裹烈火，缓慢而致命，让人甘愿沉沦',
    quote: '"别急，夜还很长。先喝杯茶，让我听你呼吸。"',
  },
  {
    id: 3,
    name: '玫瑰',
    title: 'La Rose Sauvage',
    specialty: '西洋按摩 · 精油调香',
    skill: '毫无保留的奔放，像浪潮反复拍打礁石直至碎裂',
    quote: '"你看起来紧绷得像个钟表发条。脱掉外套，趴下。"',
  },
  {
    id: 4,
    name: '碧落',
    title: "Chute d'Émeraude",
    specialty: '香道 · 水墨画 · 心理暗示',
    skill: '若即若离的折磨，撩拨到极点却悄然退开，反复三次',
    quote: '"靠近一点。……不，太近了。"',
  },
  {
    id: 5,
    name: '紫嫣',
    title: 'Violette Pourpre',
    specialty: '歌喉婉转 · 镜房艺术',
    skill: '野性难驯，指甲划过后背的刺痛与耳边的呢喃交织',
    quote: '"你确定要我唱歌？我的歌……会让衣服自己掉下来哦。"',
  },
  {
    id: 6,
    name: '春桃',
    title: 'Pêche de Printemps',
    specialty: '刺绣 · 情诗 · 枕边私语',
    skill: '像春天第一场雨，温柔得让人忘记自己正在沦陷',
    quote: '"今晚不说外面的世界，只说你和我之间的事。"',
  },
]
