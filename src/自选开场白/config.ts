import type { StepDef } from './types';

/**
 * 通用开场白模板的步骤配置。
 *
 * - 第 0 步固定为"基础信息":姓名、年龄、性别、人设。需要增删字段改这里即可。
 * - 第 1..n 步完全自由,可加任何 radio/checkbox/text/textarea/number 字段。
 * - 最后一步由模板自动渲染"确认页",不需要在 STEPS 中声明。
 *
 * 修改步骤数量后无需调整组件;App.vue 会按 STEPS 长度循环渲染并自动判断最终确认页。
 */
export const FIRST_STEP_ID = 'profile';

export const STEPS: StepDef[] = [
  {
    id: FIRST_STEP_ID,
    navLabel: '身份',
    title: '你是谁?',
    desc: '这些文字将成为世界认识你的第一种方式。',
    layout: 'grid',
    fields: [
      { key: 'name', label: '玩家名称', kind: 'text', defaultValue: '', placeholder: '例如:林默', maxLength: 40, minLength: 1 },
      { key: 'age', label: '年龄', kind: 'number', defaultValue: null, placeholder: '例如:19', min: 1, max: 999 },
      { key: 'gender', label: '性别 / 自我认同', kind: 'text', defaultValue: '', placeholder: '自由填写,不限制选项', maxLength: 40, full: true },
      {
        key: 'persona',
        label: '基础人设',
        kind: 'textarea',
        defaultValue: '',
        placeholder: '写下出身、性格、执念,或任何你希望故事记住的部分……',
        maxLength: 500,
        minLength: 8,
        full: true,
        hint: '至少 8 个字。',
      },
    ],
  },
  {
    id: 'traits',
    navLabel: '天性',
    title: '选择你的天性',
    desc: '以下内容只是交互演示,可替换、增删或改成其他输入形式。',
    layout: 'cards',
    fields: [
      {
        key: 'traitIds',
        label: '天赋',
        kind: 'checkbox',
        defaultValue: [],
        maxSelect: 3,
        options: [
          { id: 'strong', label: '强壮', icon: 'fa-solid fa-dumbbell', description: '你的体魄远超常人,能够承受更严苛的旅程。', effects: ['受伤概率 -50%', '力量判定 +2'] },
          { id: 'insightful', label: '洞察', icon: 'fa-solid fa-eye', description: '你善于捕捉细节,也更容易察觉言语背后的意图。', effects: ['观察判定 +2', '更容易发现隐藏线索'] },
          { id: 'silver_tongue', label: '善辩', icon: 'fa-solid fa-comments', description: '你知道什么时候该说什么,也懂得如何让人愿意倾听。', effects: ['交涉判定 +2', '初次会面更易获得好感'] },
          { id: 'lucky', label: '幸运', icon: 'fa-solid fa-clover', description: '命运偶尔会在关键时刻悄悄偏向你。', effects: ['每日一次重投机会', '稀有事件概率小幅提升'] },
          { id: 'resolute', label: '坚韧', icon: 'fa-solid fa-shield-heart', description: '越是接近绝境,你越能守住自己的意志。', effects: ['意志判定 +2', '负面状态持续时间缩短'] },
          { id: 'nimble', label: '灵巧', icon: 'fa-solid fa-feather', description: '你的动作轻盈而准确,危险往往只差一步。', effects: ['敏捷判定 +2', '回避概率提升'] },
        ],
      },
    ],
  },
  {
    id: 'world',
    navLabel: '世界',
    title: '世界如何回应你?',
    desc: '以下模式与伙伴仅演示"互斥选择"这一交互能力。',
    layout: 'cards',
    fields: [
      {
        key: 'modeId',
        label: '旅途的重量',
        kind: 'radio',
        defaultValue: 'normal',
        options: [
          { id: 'easy', label: '故事模式', badge: '让旅途更从容', description: '冲突更温和,资源更充足,适合专注剧情与关系发展。' },
          { id: 'normal', label: '标准模式', badge: '故事与挑战并重', description: '保留合理的风险与成长节奏,适合第一次进入世界。' },
          { id: 'hard', label: '困难模式', badge: '每个选择都有代价', description: '资源稀缺,检定严苛,失误会带来更持久的后果。' },
        ],
      },
      {
        key: 'partnerId',
        label: '最初的同行者',
        kind: 'radio',
        defaultValue: 'xiaozhi',
        options: [
          { id: 'xiaozhi', label: '小智', badge: '热血的同行者', description: '乐观、直接,总能在犹豫时率先迈出一步。' },
          { id: 'xiaoxia', label: '小霞', badge: '敏锐的引路人', description: '观察细致,嘴上不饶人,却不会放任同伴陷入危险。' },
          { id: 'xiaogang', label: '小刚', badge: '可靠的守护者', description: '沉稳而周到,擅长把混乱的旅途重新安排妥当。' },
        ],
      },
    ],
  },
];