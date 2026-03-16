/**
 * 八字口诀题库
 * 基于盲派口诀、《子平真诠》、《滴天髓》、《三命通会》等古籍
 * 每题关联一条八字口诀，按七大维度分组
 */

const DIMENSIONS = {
  education: { name: '学历学业', icon: '📚', color: '#6bb3f0' },
  career:    { name: '事业职业', icon: '💼', color: '#d4af37' },
  family:    { name: '六亲关系', icon: '👨‍👩‍👧‍👦', color: '#2ecc71' },
  wealth:    { name: '钱财财运', icon: '💰', color: '#f39c12' },
  marriage:  { name: '婚姻感情', icon: '💕', color: '#e74c3c' },
  health:    { name: '健康体质', icon: '🏥', color: '#1abc9c' },
  personality: { name: '性格相貌', icon: '🎭', color: '#9b59b6' }
};

const LIKERT_OPTIONS = [
  { value: 1, label: '非常不符合' },
  { value: 2, label: '不太符合' },
  { value: 3, label: '一般 / 不确定 / 不适用' },
  { value: 4, label: '比较符合' },
  { value: 5, label: '非常符合' }
];

const QUESTIONS = [
  // ========= 学历学业 (education) =========
  {
    id: 'edu_01',
    text: '您的最高学历为本科及以上',
    dimension: 'education',
    formula: '印星有力，学业有成',
    baziTag: { tenGod: '正印', condition: 'present_and_strong' }
  },
  {
    id: 'edu_02',
    text: '您在学生时代学习成绩较好',
    dimension: 'education',
    formula: '正印为用旺逢生，主聪明好学',
    baziTag: { tenGod: '正印', condition: 'useful_and_strong' }
  },
  {
    id: 'edu_03',
    text: '相较于逻辑推演，您是否更擅长记忆、表达或人文类学科（若未分科请选一般）',
    dimension: 'education',
    formula: '正印属正科，偏印属偏科',
    baziTag: { tenGod: '正印', condition: 'stronger_than_pianyin' }
  },
  {
    id: 'edu_04',
    text: '您学过的东西是否常难以直接落到当前工作上，或专业与现实路径存在偏差',
    dimension: 'education',
    formula: '印星受制，学无所用',
    baziTag: { tenGod: '正印', condition: 'restricted' }
  },
  {
    id: 'edu_05',
    text: '您对音乐、美术、设计等艺术类内容是否更容易上手或更感兴趣',
    dimension: 'education',
    formula: '偏印属偏科，如美术音乐',
    baziTag: { tenGod: '偏印', condition: 'present_and_strong' }
  },
  {
    id: 'edu_06',
    text: '您的求学路是否曾因经济、家庭因素而中断、延迟或格外艰难',
    dimension: 'education',
    formula: '财星破印，学业受阻',
    baziTag: { tenGod: '财星', condition: 'breaks_yin' }
  },
  {
    id: 'edu_07',
    text: '您读书时是否常感到学业压力较大，或学起来费劲、发挥不太稳定',
    dimension: 'education',
    formula: '枭神夺食，多学少成无人帮',
    baziTag: { tenGod: '偏印', condition: 'clashes_shishen' }
  },
  {
    id: 'edu_08',
    text: '您在学习上是否较容易举一反三，或对文字、表达类内容比较有感觉',
    dimension: 'education',
    formula: '月上正印有文才，多才多艺必高强',
    baziTag: { tenGod: '正印', condition: 'in_month' }
  },
  {
    id: 'edu_09',
    text: '您在校期间是否曾在写作、表达或文科类科目上有过比较突出的表现',
    dimension: 'education',
    formula: '金水伤官得令，五经魁首文章，主人聪明',
    baziTag: { tenGod: '水金', condition: 'shangguan_strong' }
  },
  {
    id: 'edu_10',
    text: '您是否普遍对阅读和学习有兴趣，即使不走学历路线也常靠自学提升自己',
    dimension: 'education',
    formula: '无印星读书反而聪明，无印的人喜欢读书',
    baziTag: { tenGod: '印星', condition: 'absent' }
  },
  {
    id: 'edu_11',
    text: '您曾有到外地或国外求学、游学的经历',
    dimension: 'education',
    formula: '学堂逢驿马，山斗文章才学四海行',
    baziTag: { tenGod: '驿马', condition: 'with_xuetang' }
  },
  {
    id: 'edu_12',
    text: '您是否常给人思路较深、考虑长远、做事有预案的感觉',
    dimension: 'education',
    formula: '水多生人最聪明，胸有成竹韬略广',
    baziTag: { tenGod: '水', condition: 'strong' }
  },
  {
    id: 'edu_13',
    text: '您在学习上是否偶尔会因为自信较强，而忽略基础或细节',
    dimension: 'education',
    formula: '伤官过重而无印星抑制，聪明傲物，自视不凡',
    baziTag: { tenGod: '伤官', condition: 'too_strong_no_yin' }
  },

  // ========= 事业职业 (career) =========
  {
    id: 'car_01',
    text: '您目前从事管理、行政或公职类工作',
    dimension: 'career',
    formula: '月带正官为贵人，正气官星最为真',
    baziTag: { tenGod: '正官', condition: 'in_month' }
  },
  {
    id: 'car_02',
    text: '您的职业路径是否较多波动，或曾有过“不得不换赛道”的被动经历',
    dimension: 'career',
    formula: '七杀无制号偏官，神轻杀重怕伤残',
    baziTag: { tenGod: '七杀', condition: 'uncontrolled' }
  },
  {
    id: 'car_03',
    text: '在工作选择上，您是否更倾向自己做主、独立接单或经营项目',
    dimension: 'career',
    formula: '伤官、比劫为用神，不从技艺便为生意人',
    baziTag: { tenGod: '伤官', condition: 'useful' }
  },
  {
    id: 'car_04',
    text: '您是否更容易凭专业技能、解决问题能力或一技之长立足',
    dimension: 'career',
    formula: '食伤泄秀，技艺精湛',
    baziTag: { tenGod: '食神', condition: 'present' }
  },
  {
    id: 'car_05',
    text: '您在职场中是否常感到有人掣肘、误解，或推进事情时阻力偏多',
    dimension: 'career',
    formula: '月带偏官犯小人，小人引得灾祸临',
    baziTag: { tenGod: '七杀', condition: 'in_month' }
  },
  {
    id: 'car_06',
    text: '您的事业是否更像后劲型，越到后期越稳定、越能发力',
    dimension: 'career',
    formula: '时带正官禄又藏，老而无忧呈吉祥',
    baziTag: { tenGod: '正官', condition: 'in_hour' }
  },
  {
    id: 'car_07',
    text: '您是否常需面对合同、规章的约束，或处理与人争执、扯皮的事务',
    dimension: 'career',
    formula: '正官见杀及伤官，刑冲破害多官司',
    baziTag: { tenGod: '正官', condition: 'clashed_by_shangguan' }
  },
  {
    id: 'car_08',
    text: '您在工作中是否较容易积累口碑，被认可、被信任',
    dimension: 'career',
    formula: '正印更喜官来生，官印相生富贵真',
    baziTag: { tenGod: '官印', condition: 'mutual_generation' }
  },
  {
    id: 'car_09',
    text: '您曾从事军警、安保、执法、风控或现场处置相关工作',
    dimension: 'career',
    formula: '庚辛见火为枪，火见戌为库，不是军人必武职',
    baziTag: { tenGod: '七杀', condition: 'with_yangren' }
  },
  {
    id: 'car_10',
    text: '您的工作或生意具有较强流动性，如物流、贸易、运输、销售或经常外跑',
    dimension: 'career',
    formula: '申子辰合水局，问生意主流动性经营',
    baziTag: { tenGod: '水局', condition: 'present' }
  },
  {
    id: 'car_11',
    text: '您的事业是否曾卡在明显瓶颈期，常有施展不开或不被充分看见的感觉',
    dimension: 'career',
    formula: '马瘦官破，困守穷土，大器晚成',
    baziTag: { tenGod: '官星', condition: 'broken' }
  },
  {
    id: 'car_12',
    text: '您的职业或项目是否常和餐饮、娱乐、酒水、社交应酬或氛围经营相关',
    dimension: 'career',
    formula: '柱中有辛丁乙，地支有酉亥未，利酒业生意',
    baziTag: { tenGod: '桃花', condition: 'with_shishen' }
  },
  {
    id: 'car_13',
    text: '您虽不在体制内，但是否常承担管理、协调、定规则的角色，而且做起来比较顺手',
    dimension: 'career',
    formula: '四柱无官星，可以从政掌权',
    baziTag: { tenGod: '官星', condition: 'absent_but_strong' }
  },

  // ========= 六亲关系 (family) =========
  {
    id: 'fam_01',
    text: '您与父亲的关系是否较亲近，或更容易从父亲、父系长辈处得到帮助',
    dimension: 'family',
    formula: '年上正财祖业传，富贵荣华守田园',
    baziTag: { tenGod: '正财', condition: 'in_year' }
  },
  {
    id: 'fam_02',
    text: '您与母亲的关系是否较亲近，或更容易从母亲、母系长辈处得到照顾',
    dimension: 'family',
    formula: '年上正印有祖荫，父母与其恩爱深',
    baziTag: { tenGod: '正印', condition: 'in_year' }
  },
  {
    id: 'fam_03',
    text: '在同辈、手足或发小圈子里，您是否容易形成像家人一样的紧密关系',
    dimension: 'family',
    formula: '年上比劫兄妹多，多与父亲闹不合',
    baziTag: { tenGod: '比肩', condition: 'in_year' }
  },
  {
    id: 'fam_04',
    text: '您父亲的人生起伏是否较大，或您曾较早为家庭现实问题操心',
    dimension: 'family',
    formula: '月有偏财先克父，年地逢冲克爹娘',
    baziTag: { tenGod: '偏财', condition: 'clashed' }
  },
  {
    id: 'fam_05',
    text: '您在家中排行老大（若是独生子女请选非常符合）',
    dimension: 'family',
    formula: '阳干阳生必为大，日坐冲生定无兄',
    baziTag: { tenGod: '长生', condition: 'yang_stem' }
  },
  {
    id: 'fam_06',
    text: '您的兄弟姐妹中是否有人生起伏较多，或需要家人操心扶持',
    dimension: 'family',
    formula: '月上比劫性更恶，主着兄妹多不合，比劫空亡有夭折',
    baziTag: { tenGod: '劫财', condition: 'in_month_empty' }
  },
  {
    id: 'fam_07',
    text: '您父母相处是否总体较和气，家庭氛围偏稳定',
    dimension: 'family',
    formula: '印财关系利于日干，父母感情好',
    baziTag: { tenGod: '财印', condition: 'harmonious' }
  },
  {
    id: 'fam_08',
    text: '您是否较容易得到长辈照顾、偏爱，或在长辈面前比较讨喜',
    dimension: 'family',
    formula: '年上食神正当时，财旺福大有权势',
    baziTag: { tenGod: '食神', condition: 'in_year' }
  },
  {
    id: 'fam_09',
    text: '您在幼年或青年阶段，是否常为父亲的身体、工作或与父亲的关系而操心',
    dimension: 'family',
    formula: '偏财被劫先克父，食旺财旺母早亡',
    baziTag: { tenGod: '偏财', condition: 'clashed_by_jie' }
  },
  {
    id: 'fam_10',
    text: '您与兄弟姐妹的缘分是否较浅，或关系中有明显距离感、聚少离多',
    dimension: 'family',
    formula: '羊刃重克财，临年月克父、克兄弟',
    baziTag: { tenGod: '羊刃', condition: 'in_month_year' }
  },
  {
    id: 'fam_11',
    text: '您与兄弟姐妹的缘分是否偏浅，或彼此人生轨迹分散、聚少离多',
    dimension: 'family',
    formula: '四柱比肩太过，月上刑冲损雁行',
    baziTag: { tenGod: '比肩', condition: 'clashed_in_month' }
  },
  {
    id: 'fam_12',
    text: '您是否曾为子女的健康、安全或成长问题操过比较多的心',
    dimension: 'family',
    formula: '时干支自冲，子有疾或残',
    baziTag: { tenGod: '时支', condition: 'clashed' }
  },

  // ========= 钱财财运 (wealth) =========
  {
    id: 'wea_01',
    text: '您是否较容易积累稳定收入，或维持相对有安全感的财务状态',
    dimension: 'wealth',
    formula: '正财喜旺日主强，紫袍玉带伴君王',
    baziTag: { tenGod: '正财', condition: 'strong_with_strong_self' }
  },
  {
    id: 'wea_02',
    text: '您的主要收入来源是固定工资或稳定薪资',
    dimension: 'wealth',
    formula: '日带正财自己财，初年初要把学堂入',
    baziTag: { tenGod: '正财', condition: 'on_day' }
  },
  {
    id: 'wea_03',
    text: '您是否有过奖金、投资、兼职或意外进账比较明显的经历',
    dimension: 'wealth',
    formula: '月上偏财众人抬，不学手艺做买卖',
    baziTag: { tenGod: '偏财', condition: 'in_month' }
  },
  {
    id: 'wea_04',
    text: '您在财务上是否常有花出去后后悔，或曾因轻信他人、判断失误而造成损失',
    dimension: 'wealth',
    formula: '刃头财为巨财横财，然一旦劫财羊刃再见必破',
    baziTag: { tenGod: '劫财', condition: 'clashes_wealth' }
  },
  {
    id: 'wea_05',
    text: '您在理财和储蓄上是否相对克制，钱比较不容易漏掉',
    dimension: 'wealth',
    formula: '时上正财命最强，不受刑冲有福享，财帛丰厚多富贵',
    baziTag: { tenGod: '正财', condition: 'in_hour' }
  },
  {
    id: 'wea_06',
    text: '您在花钱上是否容易顾眼前、重人情或重体验，因此存钱不算轻松',
    dimension: 'wealth',
    formula: '财空亡或劫重见财，财星带耗弃子离妻',
    baziTag: { tenGod: '比劫', condition: 'too_much' }
  },
  {
    id: 'wea_07',
    text: '您是否倾向把钱和资源往后期留，越到人生后段越重视财务安全感',
    dimension: 'wealth',
    formula: '时带食神胜财官，财福两旺寿元高',
    baziTag: { tenGod: '食神', condition: 'in_hour' }
  },
  {
    id: 'wea_08',
    text: '在钱财和资源上，您是否比较舍得为朋友、人情或关系投入',
    dimension: 'wealth',
    formula: '用神为财旺而逢生，仗义疏财',
    baziTag: { tenGod: '偏财', condition: 'useful' }
  },
  {
    id: 'wea_09',
    text: '您是否更适合做重稳定客源、固定阵地、长期经营的事，而不是四处跑动',
    dimension: 'wealth',
    formula: '四柱正财强于偏财者，开门市坐店生意最好',
    baziTag: { tenGod: '正财', condition: 'stronger_than_piancai' }
  },
  {
    id: 'wea_10',
    text: '您赚钱时是否常需要靠跑动、操劳和折腾，但回报感并不总是稳定',
    dimension: 'wealth',
    formula: '财轻兄助生灾祸，一生无财苦奔忙',
    baziTag: { tenGod: '财弱比劫强', condition: 'present' }
  },
  {
    id: 'wea_11',
    text: '您是否偶尔会遇到超出预期的意外进账、贵人带财或运气型收益',
    dimension: 'wealth',
    formula: '偏财将星天乙贵，生来就是名门或大偏财',
    baziTag: { tenGod: '偏财', condition: 'with_gui' }
  },

  // ========= 婚姻感情 (marriage) =========
  {
    id: 'mar_01',
    text: '在亲密关系中，您是否更容易遇到相处顺、彼此照顾型的关系',
    dimension: 'marriage',
    formula: '日带正财得妻财，美貌贤妻能带来，夫唱妻随多恩爱',
    baziTag: { tenGod: '正财', condition: 'on_day' }
  },
  {
    id: 'mar_02',
    text: '您在感情中是否经历过明显的分合、冷战、疏离或关系中断',
    dimension: 'marriage',
    formula: '日带劫财主婚姻有厄灾，夫妻不能同长久',
    baziTag: { tenGod: '劫财', condition: 'on_day' }
  },
  {
    id: 'mar_03',
    text: '在亲密关系里，您是否更容易形成互补分工、彼此配合的相处模式',
    dimension: 'marriage',
    formula: '身弱官印相生，夫唱妇随',
    baziTag: { tenGod: '官印', condition: 'harmonious' }
  },
  {
    id: 'mar_04',
    text: '在亲密关系里，您是否较容易为对方或关系本身投入较多金钱',
    dimension: 'marriage',
    formula: '支为偏财支出大，色情之灾需要防',
    baziTag: { tenGod: '偏财', condition: 'in_branch' }
  },
  {
    id: 'mar_05',
    text: '您属于晚婚（30岁以后结婚；若未到年龄请选一般）',
    dimension: 'marriage',
    formula: '财星破印的八字，恋爱不容易成功，典型晚婚',
    baziTag: { tenGod: '财印', condition: 'conflict' }
  },
  {
    id: 'mar_06',
    text: '伴侣或关系对象是否常在现实事务、事业推进或资源层面给您助力',
    dimension: 'marriage',
    formula: '日坐官星名利驰，男女皆得配偶助',
    baziTag: { tenGod: '正官', condition: 'on_day' }
  },
  {
    id: 'mar_07',
    text: '在恋爱关系里，您是否常更主动投入时间、情绪或照顾',
    dimension: 'marriage',
    formula: '女命伤官身弱有印，身旺有财',
    baziTag: { tenGod: '伤官', condition: 'dominant' }
  },
  {
    id: 'mar_08',
    text: '您在年轻阶段是否异性缘较活跃，感情经历相对丰富',
    dimension: 'marriage',
    formula: '金水伤官，虽然人聪明美丽，但也多情',
    baziTag: { tenGod: '桃花', condition: 'with_shangguan' }
  },
  {
    id: 'mar_09',
    text: '您的感情关系是否常伴随重大考验，或经历过刻骨铭心的失去',
    dimension: 'marriage',
    formula: '四柱有财星，羊刃逢时定克刑，岁运经行妻眷绝',
    baziTag: { tenGod: '羊刃', condition: 'clashes_wife' }
  },
  {
    id: 'mar_10',
    text: '您的伴侣是否较有个人魅力，或在外形气质上比较吸引人',
    dimension: 'marriage',
    formula: '子午卯酉夫妻比较漂亮',
    baziTag: { tenGod: '日支', condition: 'peach_blossom' }
  },
  {
    id: 'mar_11',
    text: '在感情里，您是否更看重稳定、边界感和长期承诺',
    dimension: 'marriage',
    formula: '女命伤官身弱有印...必聪明美貌而贞洁也',
    baziTag: { tenGod: '正印', condition: 'controls_shangguan' }
  },
  {
    id: 'mar_12',
    text: '在现实生活里，您的伴侣是否偏会算账、重效率，处理事务比较利落',
    dimension: 'marriage',
    formula: '日主为寅申巳亥，夫妻比较精明、能干',
    baziTag: { tenGod: '日支', condition: 'yinshen_sihai' }
  },

  // ========= 健康体质 (health) =========
  {
    id: 'hea_01',
    text: '您的整体恢复力是否还不错，通常不太容易被小毛病拖垮',
    dimension: 'health',
    formula: '五行流通，康泰生于合和',
    baziTag: { tenGod: '五行', condition: 'balanced' }
  },
  {
    id: 'hea_02',
    text: '您是否常有脾胃敏感、食欲不稳、腹胀或消化不太舒服的时候',
    dimension: 'health',
    formula: '戊己土被木克，偏印多，肠胃不好',
    baziTag: { tenGod: '土', condition: 'wood_clashes' }
  },
  {
    id: 'hea_03',
    text: '您是否常有鼻咽敏感、呼吸不畅、过敏或喉咙反复不舒服的情况',
    dimension: 'health',
    formula: '金被火克，呼吸系统有事',
    baziTag: { tenGod: '金', condition: 'fire_clashes' }
  },
  {
    id: 'hea_04',
    text: '您是否属于“易招小伤”体质，身上常有不明淤青、旧伤或磕碰痕迹',
    dimension: 'health',
    formula: '金木相战，羊刃逢冲，防意外血伤',
    baziTag: { tenGod: '羊刃', condition: 'clashed' }
  },
  {
    id: 'hea_05',
    text: '您是否容易出现眼疲劳、视物吃力、上火干涩或熬夜后眼部不适',
    dimension: 'health',
    formula: '火遭水克，眼目昏暗；火土焦干癸水',
    baziTag: { tenGod: '火', condition: 'water_clashes' }
  },
  {
    id: 'hea_06',
    text: '您是否容易精神紧绷、睡眠偏浅，或伴随偏头痛、颈肩发紧这类不适',
    dimension: 'health',
    formula: '甲木遇火多，多犯神经之疾；木受金火逼压，筋脉易紧',
    baziTag: { tenGod: '木', condition: 'wood_metal_nerve' }
  },
  {
    id: 'hea_07',
    text: '您是否偶尔被提醒关注心脏、血压、循环或上火心烦这类问题',
    dimension: 'health',
    formula: '丁火弱土气强，定有贫血或心脏隐患',
    baziTag: { tenGod: '干丁', condition: 'weak' }
  },
  {
    id: 'hea_08',
    text: '您是否常有胸腹部位的不适感，或曾被建议注意脾胃、消化系统',
    dimension: 'health',
    formula: '枭木食土，特别是戊土，开刀血光之灾，胸腹部位',
    baziTag: { tenGod: '枭神', condition: 'clashes_earth' }
  },
  {
    id: 'hea_09',
    text: '相较于同龄人，您是否更容易出现烫伤、跌伤或骨骼方面的小意外',
    dimension: 'health',
    formula: '枭火食金：烫伤、骨折',
    baziTag: { tenGod: '枭神', condition: 'clashes_metal' }
  },
  {
    id: 'hea_10',
    text: '您是否比一般人更容易留下割伤、磕碰、见血或明显疤痕',
    dimension: 'health',
    formula: '庚辛向申酉之方，人亡兵劫。柱有庚辛申酉四字，有血光之灾',
    baziTag: { tenGod: '金', condition: 'too_strong_clashed' }
  },
  {
    id: 'hea_11',
    text: '您是否感觉自己容易卷入是非纠纷，或常需用规则、法律来保护自己',
    dimension: 'health',
    formula: '金见水沉为牢狱...忌神为水，牢狱标志',
    baziTag: { tenGod: '金水', condition: 'water_prison' }
  },
  {
    id: 'hea_12',
    text: '遇到压力较大的阶段或特定年份时，您是否更容易出现出行惊险、交通磕碰或需要格外注意安全的情况',
    dimension: 'health',
    formula: '三刑带杀灾祸明，岁刑年月倍小心，行车爬跳莫冒险',
    baziTag: { tenGod: '三刑', condition: 'present' }
  },

  // ========= 性格相貌 (personality) =========
  {
    id: 'per_01',
    text: '您是否整体偏安静、内敛，不太喜欢过度热闹的环境',
    dimension: 'personality',
    formula: '印多之人，善良，母性特别强，性格温和内敛',
    baziTag: { tenGod: '正印', condition: 'dominant' }
  },
  {
    id: 'per_02',
    text: '您表达时是否偏直接、讲重点，不太喜欢绕来绕去',
    dimension: 'personality',
    formula: '甲木多来清又闲，任在直中取二百',
    baziTag: { tenGod: '甲木', condition: 'strong' }
  },
  {
    id: 'per_03',
    text: '您是否思维反应较快，聊天接话和临场应变通常不慢',
    dimension: 'personality',
    formula: '金水伤官，为人最聪明美丽',
    baziTag: { tenGod: '水金', condition: 'water_wood_shangguan' }
  },
  {
    id: 'per_04',
    text: '您做事是否较果断，遇事能拍板，也比较看重义气和原则',
    dimension: 'personality',
    formula: '五行金占多，能说会道有智谋，心是天平一杆秤',
    baziTag: { tenGod: '金', condition: 'strong' }
  },
  {
    id: 'per_05',
    text: '您情绪上来得较快、反应直接，但通常过后散得也快',
    dimension: 'personality',
    formula: '火旺之人性急燥，丙火猛烈欺霜侮雪',
    baziTag: { tenGod: '火', condition: 'too_strong' }
  },
  {
    id: 'per_06',
    text: '您的体质是否偏容易囤肉、长肉，饮食稍不注意就会体态变化明显',
    dimension: 'personality',
    formula: '食神有力，正印有力，日干带合——使人胖的因素',
    baziTag: { tenGod: '食神', condition: 'strong_with_yin' }
  },
  {
    id: 'per_07',
    text: '您是否比较在意个人仪表、穿着和外在形象给人的感觉',
    dimension: 'personality',
    formula: '木火通明，秀丽可爱',
    baziTag: { tenGod: '木火', condition: 'bright' }
  },
  {
    id: 'per_08',
    text: '您是否自我要求较高，也比较在意自己是否被尊重、被认真对待',
    dimension: 'personality',
    formula: '火土伤官，操守佳，带有傲气',
    baziTag: { tenGod: '伤官', condition: 'fire_earth' }
  },
  {
    id: 'per_09',
    text: '您的身形是否偏瘦长，或给人“修长、清秀”的视觉印象',
    dimension: 'personality',
    formula: '木形长脸，瘦高个，丰姿秀丽，骨格修长',
    baziTag: { tenGod: '木', condition: 'dominant_appearance' }
  },
  {
    id: 'per_10',
    text: '您的长相是否偏精致小巧，或声音、言谈给人“清脆、利落”的感觉',
    dimension: 'personality',
    formula: '火形瓜子脸，声音清亮',
    baziTag: { tenGod: '火', condition: 'dominant_appearance' }
  },
  {
    id: 'per_11',
    text: '您的骨架是否偏大，或整体给人“稳重、厚实”的感觉（即便不胖）',
    dimension: 'personality',
    formula: '土形个子矮，胖、结实、肌肉发达，鼻大口方',
    baziTag: { tenGod: '土', condition: 'dominant_appearance' }
  },
  {
    id: 'per_12',
    text: '您的肤色是否偏深或比较容易晒黑，而且整体不太容易长肉',
    dimension: 'personality',
    formula: '庚辛酉为用弱，其所代表的六亲瘦又黑',
    baziTag: { tenGod: '金', condition: 'weak_use' }
  },
  {
    id: 'per_13',
    text: '在消费上，您是否非常务实，明显厌恶无意义的面子消费或铺张浪费',
    dimension: 'personality',
    formula: '比劫羊刃，主吝啬，铁公鸡一毛不拔',
    baziTag: { tenGod: '比肩', condition: 'too_strong' }
  },
  {
    id: 'per_14',
    text: '面对不合理的规矩或权威时，您是否骨子里更想按自己的判断来',
    dimension: 'personality',
    formula: '伤官主人聪明，藐视法令，自视不凡，稍带虚荣',
    baziTag: { tenGod: '伤官', condition: 'rebellious' }
  }
];

QUESTIONS.push(
  {
    id: 'edu_14',
    text: '您在求学阶段是否更能吃苦，也愿意为考试或学历长期投入精力',
    dimension: 'education',
    formula: '月上正官父母宫，应有官职份，受尽寒窗苦，一举天下得成名',
    source: '盲派技法总集·十神宫位上的看法',
    baziTag: { tenGod: '正官', condition: 'in_month' }
  },
  {
    id: 'car_14',
    text: '在高压、纪律、对抗或危机处理中，您是否往往更能顶上去、把事情压住',
    dimension: 'career',
    formula: '煞刃两全威风凛，煞印相生功名深',
    source: '盲派技法总集·偏官',
    baziTag: { tenGod: '七杀', condition: 'with_yangren' }
  },
  {
    id: 'fam_13',
    text: '您父母之间的关系是否总体还算协调，较少长期冷战或严重失和',
    dimension: 'family',
    formula: '印财关系利于日干，也为父母感情好',
    source: '民间江湖盲派·父母兄弟篇',
    baziTag: { tenGod: '财印', condition: 'harmonious' }
  },
  {
    id: 'wea_12',
    text: '您更适合通过经营、生意、项目运作或资源整合来赚钱，而非只靠固定工资',
    dimension: 'wealth',
    formula: '月上偏财众人抬，不学手艺做买卖',
    source: '盲派技法总集·偏财',
    baziTag: { tenGod: '偏财', condition: 'in_month' }
  },
  {
    id: 'mar_13',
    text: '在关系冲突里，双方是否都比较容易硬顶着来，不太愿意先低头',
    dimension: 'marriage',
    formula: '日坐羊刃克恋重，夫妻同室把命争',
    source: '盲派技法总集·羊刃',
    baziTag: { tenGod: '羊刃', condition: 'present' }
  },
  {
    id: 'hea_13',
    text: '您是否属于较容易因冲突、运动或意外留下旧伤、疤痕的人',
    dimension: 'health',
    formula: '七杀无制怕伤残，杀刃逢冲多血伤',
    source: '盲派技法总集·偏官 / 官讼牢狱',
    baziTag: { tenGod: '七杀', condition: 'uncontrolled' }
  },
  {
    id: 'per_15',
    text: '您是否做事勤快、待人热络，在资源和花钱上也相对舍得',
    dimension: 'personality',
    formula: '用神为财旺而逢生，主人勤快能干，仗义疏财',
    source: '盲派技法总集·性格的看法',
    baziTag: { tenGod: '财星', condition: 'present_and_strong' }
  },
  {
    id: 'per_16',
    text: '您是否主意比较定，一旦认准方向就不太容易轻易改口或回头',
    dimension: 'personality',
    formula: '阴木多来不为强，直打直逞一杆枪',
    source: '盲派技法总集·江湖金口诀看性格',
    baziTag: { tenGod: '木', condition: 'strong' }
  },
  {
    id: 'car_15',
    text: '您在较年轻时就离开家乡，到外地求学或发展',
    dimension: 'career',
    formula: '年冲月令，商祖成家；驿马交驰，别土离乡',
    source: '民间江湖盲派命理秘诀·离乡取象',
    baziTag: { tenGod: '综合', condition: 'leave_hometown' }
  },
  {
    id: 'car_16',
    text: '在工作或生活中，您是否更容易遇到合同、规则、流程或与上级之间的强硬冲突',
    dimension: 'career',
    formula: '伤官见官，为祸百端；辰戌冲，多主斗讼争执',
    source: '民间江湖盲派命理秘诀·官非取象',
    baziTag: { tenGod: '综合', condition: 'lawsuit_prone' }
  },
  {
    id: 'fam_14',
    text: '在您的童年或青年阶段，家里是否经历过比较明显的变故或长期让人操心的现实压力',
    dimension: 'family',
    formula: '年上七杀命不佳；年月相冲，早年家庭多波动',
    source: '民间江湖盲派命理秘诀·早年家运取象',
    baziTag: { tenGod: '年月', condition: 'early_hardship' }
  },
  {
    id: 'wea_13',
    text: '在日常生活中，您是否很重视储蓄和安全感，不太愿意把钱花在表面排场上',
    dimension: 'wealth',
    formula: '财星入墓主聚财，悭吝不使一文钱',
    source: '民间江湖盲派命理秘诀·财库取象',
    baziTag: { tenGod: '财库', condition: 'wealth_in_tomb' }
  },
  {
    id: 'wea_14',
    text: '您是否常觉得钱大多要靠自己辛苦去挣，很少能碰上真正轻松的偏财或顺手之利',
    dimension: 'wealth',
    formula: '比劫重重，多靠自力求财',
    source: '民间江湖盲派命理秘诀·比劫取财',
    baziTag: { tenGod: '劫财', condition: 'hard_money' }
  },
  {
    id: 'mar_14',
    text: '您偏容易被踏实、朴素、能过日子型的伴侣吸引，而不是太花哨、太会说甜话的人',
    dimension: 'marriage',
    formula: '辰戌丑未夫妻多朴素',
    source: '民间江湖盲派命理秘诀·配偶取象',
    baziTag: { tenGod: '日支', condition: 'chen_xu_chou_wei_day' }
  },
  {
    id: 'mar_15',
    text: '在亲密关系里，您和伴侣是否容易都比较要强，吵起来时像硬碰硬，谁也不太愿先退一步',
    dimension: 'marriage',
    formula: '干支同气，脾气相顶；日坐羊刃，夫妻争强',
    source: '民间江湖盲派命理秘诀·夫妻争衡取象',
    baziTag: { tenGod: '日支', condition: 'day_gan_zhi_same' }
  },
  {
    id: 'mar_16',
    text: '您是否天生比较招异性注意，感情经历相对丰富，有时也会因异性缘而带来烦恼',
    dimension: 'marriage',
    formula: '金水相涵，多情而招桃花',
    source: '民间江湖盲派命理秘诀·金水多情',
    baziTag: { tenGod: '综合', condition: 'water_metal_romantic' }
  },
  {
    id: 'hea_14',
    text: '您的头部或面部，是否曾因磕碰、摔伤或小手术留下过比较明显的疤痕或印记',
    dimension: 'health',
    formula: '甲乙居前见庚辛，头面多留伤印',
    source: '民间江湖盲派命理秘诀·头面取象',
    baziTag: { tenGod: '综合', condition: 'head_scar' }
  },
  {
    id: 'hea_15',
    text: '您的牙齿、骨骼或筋关节，是否天生就比一般人更需要注意保养',
    dimension: 'health',
    formula: '金弱受伤，骨齿多见不足',
    source: '民间江湖盲派命理秘诀·骨齿取象',
    baziTag: { tenGod: '综合', condition: 'bad_teeth' }
  },
  {
    id: 'per_17',
    text: '在人群里，您是否常有一点抽离感，相比热闹社交，更喜欢独处或研究玄学、心理、宗教这类事物',
    dimension: 'personality',
    formula: '华盖主孤高，偏印近玄思',
    source: '民间江湖盲派命理秘诀·华盖偏印取象',
    baziTag: { tenGod: '综合', condition: 'lonely_mystic' }
  },
  {
    id: 'per_18',
    text: '您的外貌气质，是否较容易给人清秀、干净、偏白净或轮廓分明的印象',
    dimension: 'personality',
    formula: '金白水清，聪明特达',
    source: '民间江湖盲派命理秘诀·金水相貌取象',
    baziTag: { tenGod: '综合', condition: 'metal_water_clear' }
  },
  {
    id: 'hea_16',
    text: '您是否常感到腰酸背痛，或腿脚、膝盖等关节部位比较容易不适',
    dimension: 'health',
    formula: '辰卯相逢，必有腰脚之痛疾',
    source: '病源生死诀',
    baziTag: { tenGod: '综合', condition: 'chen_mao_joint' }
  },
  {
    id: 'hea_17',
    text: '您的四肢，尤其手臂、肩膀、膝踝等部位，是否曾受过较重外伤或常有关节发炎不适',
    dimension: 'health',
    formula: '申巳双加遇刑，则臂肢有患',
    source: '病源生死诀',
    baziTag: { tenGod: '综合', condition: 'shen_si_limb' }
  },
  {
    id: 'wea_15',
    text: '在理财或投资上，您是否偶尔敢于冒险博取高收益，但也经历过财富起落较大的阶段',
    dimension: 'wealth',
    formula: '刃头财为巨财、横财，岁运逢之亦易破耗',
    source: '财运贫富诀',
    baziTag: { tenGod: '财星', condition: 'ren_tou_cai' }
  },
  {
    id: 'wea_16',
    text: '您是否曾因帮助亲友、替人担保，或借钱给熟人，而造成自己明显的财务损失',
    dimension: 'wealth',
    formula: '偏财劫财两无功，常因亲朋破财凶',
    source: '盲派十神专论',
    baziTag: { tenGod: '偏财', condition: 'clashed_by_jie' }
  },
  {
    id: 'mar_17',
    text: '您的感情或婚姻关系，是否经历过很突然的异地、分开，或断裂后又重新连接',
    dimension: 'marriage',
    formula: '日被提冲，弦断再续',
    source: '年月日时诀',
    baziTag: { tenGod: '日支', condition: 'month_clash_day' }
  },
  {
    id: 'mar_18',
    text: '您是否人缘较好、善于交际，但也因此更容易卷入复杂暧昧或多线情感关系',
    dimension: 'marriage',
    formula: '合多交际广，情缘也易复杂',
    source: '神煞与十神诀',
    baziTag: { tenGod: '综合', condition: 'too_many_he' }
  },
  {
    id: 'per_19',
    text: '面对利益时，您是否很厌恶钻营算计，宁可直来直去少赚一点，也不愿为了钱去迎合奉承',
    dimension: 'personality',
    formula: '阳木多来清又闲，任在直中取二百，不在弯中取八千',
    source: '五行性格细分金',
    baziTag: { tenGod: '甲木', condition: 'strong' }
  },
  {
    id: 'per_20',
    text: '您是否常给人一种“外面看着不错、场面也撑得住”，但自己偶尔觉得内里发空或疲惫的感觉',
    dimension: 'personality',
    formula: '水多生人最聪明，外面光华里面空',
    source: '五行性格细分金',
    baziTag: { tenGod: '水', condition: 'strong_but_empty' }
  }
);

/**
 * QuestionEngine — 按八字特征动态筛题
 * 说明：
 * 1. 现阶段按十神、宫位、五行强弱、刑冲等信息做启发式筛题
 * 2. 复杂盲派口诀先做“相关性匹配”，后续可继续细化
 * 3. 核心目标是避免“命局无财却大量问财、无印却大量问印”
 */
const QuestionEngine = {
  POSITION_ORDER: ['year', 'month', 'day', 'hour'],
  TEN_GOD_ALIAS: {
    印星: ['正印', '偏印'],
    官星: ['正官', '七杀'],
    财星: ['正财', '偏财'],
    比劫: ['比肩', '劫财'],
    枭神: ['偏印']
  },

  getQuestionsByIds(questionIds) {
    if (!Array.isArray(questionIds) || questionIds.length === 0) return [];
    const idSet = new Set(questionIds);
    return QUESTIONS.filter(q => idSet.has(q.id));
  },

  getApplicableQuestions(baziResult, options = {}) {
    if (!baziResult) return QUESTIONS.slice();

    const maxPerDimension = options.maxPerDimension || 6;
    const context = this.buildContext(baziResult);
    const selected = [];

    Object.keys(DIMENSIONS).forEach(dimension => {
      const ranked = QUESTIONS
        .filter(q => q.dimension === dimension)
        .map(q => ({
          question: q,
          score: this.scoreQuestion(q, context)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id, 'zh-CN'));

      ranked.slice(0, maxPerDimension).forEach(item => {
        selected.push(item.question);
      });
    });

    return selected;
  },

  buildContext(baziResult) {
    const pillars = baziResult.pillars || {};
    const shiShenDetails = {};
    const badZhiPositions = new Set();
    const badGanPositions = new Set();
    const allShenSha = [];
    const stems = [];
    const branches = [];
    const elementCounts = Object.assign({ 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }, baziResult.wuXingStats || {});

    const addShiShen = (name, position, scope) => {
      if (!name || name === '日主') return;
      if (!shiShenDetails[name]) {
        shiShenDetails[name] = {
          count: 0,
          positions: new Set(),
          ganPositions: new Set(),
          zhiPositions: new Set()
        };
      }

      shiShenDetails[name].count += 1;
      shiShenDetails[name].positions.add(position);
      if (scope === 'gan') {
        shiShenDetails[name].ganPositions.add(position);
      } else if (scope === 'zhi') {
        shiShenDetails[name].zhiPositions.add(position);
      }
    };

    this.POSITION_ORDER.forEach(position => {
      const pillar = pillars[position] || {};
      if (pillar.gan) stems.push({ position, value: pillar.gan, wuXing: pillar.wuXing?.[0] || '' });
      if (pillar.zhi) branches.push({ position, value: pillar.zhi, wuXing: pillar.wuXing?.[1] || '' });
      (pillar.shenSha || []).forEach(item => allShenSha.push(String(item)));

      addShiShen(pillar.shiShenGan, position, 'gan');
      (pillar.shiShenZhi || []).forEach(name => addShiShen(name, position, 'zhi'));
    });

    Object.entries(baziResult.zhiRelations || {}).forEach(([type, relations]) => {
      (relations || []).forEach(rel => {
        const relText = `${type}${rel.type || ''}${rel.name || ''}`;
        if (/[冲刑害]/.test(relText)) {
          (rel.indices || []).forEach(index => {
            const position = this.POSITION_ORDER[index];
            if (position) badZhiPositions.add(position);
          });
        }
      });
    });

    Object.entries(baziResult.ganRelations || {}).forEach(([type, relations]) => {
      (relations || []).forEach(rel => {
        const relText = `${type}${rel.type || ''}${rel.name || ''}`;
        if (/冲/.test(relText)) {
          (rel.indices || []).forEach(index => {
            const position = this.POSITION_ORDER[index];
            if (position) badGanPositions.add(position);
          });
        }
      });
    });

    const nonZeroElements = Object.values(elementCounts).filter(count => count > 0);
    const maxElementCount = Math.max(...Object.values(elementCounts));
    const minElementCount = nonZeroElements.length > 0 ? Math.min(...nonZeroElements) : 0;
    const dayBranch = pillars.day?.zhi || '';
    const hourBranch = pillars.hour?.zhi || '';

    return {
      baziResult,
      pillars,
      shiShenDetails,
      badZhiPositions,
      badGanPositions,
      shenSha: allShenSha,
      stems,
      branches,
      elementCounts,
      maxElementCount,
      minElementCount,
      monthMainShiShen: pillars.month?.shiShenZhi?.[0] || '',
      dayMaster: baziResult.dayMaster || '',
      dayMasterWuXing: pillars.day?.wuXing?.[0] || baziResult.dayMasterWuXing || '',
      dayBranch,
      dayBranchWuXing: pillars.day?.wuXing?.[1] || '',
      hourBranch,
      strengthLevel: baziResult.strength?.level || '',
      pattern: baziResult.pattern || ''
    };
  },

  getFeatureCount(context, feature) {
    if (!feature) return 0;

    if (this.TEN_GOD_ALIAS[feature]) {
      return this.TEN_GOD_ALIAS[feature].reduce((sum, name) => sum + this.getFeatureCount(context, name), 0);
    }

    if (context.shiShenDetails[feature]) {
      return context.shiShenDetails[feature].count;
    }

    if (context.elementCounts[feature] !== undefined) {
      return context.elementCounts[feature];
    }

    switch (feature) {
      case '官印':
        return this.hasFeature(context, '官星') && this.hasFeature(context, '印星') ? 1 : 0;
      case '财印':
        return this.hasFeature(context, '财星') && this.hasFeature(context, '印星') ? 1 : 0;
      case '水金':
      case '金水':
        return Math.min(this.getFeatureCount(context, '水'), this.getFeatureCount(context, '金'));
      case '木火':
        return Math.min(this.getFeatureCount(context, '木'), this.getFeatureCount(context, '火'));
      case '水局':
        return this.hasWaterBranchCombo(context) ? 1 : 0;
      case '桃花':
        return context.branches.filter(item => ['子', '午', '卯', '酉'].includes(item.value)).length;
      case '驿马':
        return context.branches.filter(item => ['寅', '申', '巳', '亥'].includes(item.value)).length;
      case '长生':
        return this.POSITION_ORDER.filter(position => context.pillars[position]?.diShi === '长生').length;
      case '三刑':
        return (context.baziResult.zhiRelations?.三刑 || []).length > 0 ? 1 : 0;
      case '羊刃':
        return this.hasYangRen(context) ? 1 : 0;
      case '甲木':
        return context.stems.filter(item => item.value === '甲').length;
      case '干丁':
        return context.stems.filter(item => item.value === '丁').length;
      case '五行':
        return Object.values(context.elementCounts).filter(count => count > 0).length;
      case '财弱比劫强':
        return this.hasFeature(context, '财星') && this.getFeatureCount(context, '比劫') > this.getFeatureCount(context, '财星') ? 1 : 0;
      case '日支':
        return context.dayBranch ? 1 : 0;
      case '时支':
        return context.hourBranch ? 1 : 0;
      default:
        return 0;
    }
  },

  hasFeature(context, feature) {
    return this.getFeatureCount(context, feature) > 0;
  },

  getFeaturePositions(context, feature, scope = 'any') {
    const orderMap = { year: 1, month: 2, day: 3, hour: 4 };
    const pushBySet = (target, setObj) => {
      Array.from(setObj || []).forEach(pos => target.add(pos));
    };

    if (this.TEN_GOD_ALIAS[feature]) {
      const posSet = new Set();
      this.TEN_GOD_ALIAS[feature].forEach(name => {
        this.getFeaturePositions(context, name, scope).forEach(pos => posSet.add(pos));
      });
      return Array.from(posSet).sort((a, b) => orderMap[a] - orderMap[b]);
    }

    if (context.shiShenDetails[feature]) {
      const detail = context.shiShenDetails[feature];
      const positions = scope === 'gan'
        ? detail.ganPositions
        : scope === 'zhi'
          ? detail.zhiPositions
          : detail.positions;
      return Array.from(positions).sort((a, b) => orderMap[a] - orderMap[b]);
    }

    if (context.elementCounts[feature] !== undefined) {
      return this.POSITION_ORDER.filter(position => {
        const pillar = context.pillars[position];
        return pillar?.wuXing?.includes(feature);
      });
    }

    if (feature === '甲木') {
      return context.stems.filter(item => item.value === '甲').map(item => item.position);
    }

    if (feature === '干丁') {
      return context.stems.filter(item => item.value === '丁').map(item => item.position);
    }

    if (feature === '日支') return context.dayBranch ? ['day'] : [];
    if (feature === '时支') return context.hourBranch ? ['hour'] : [];
    if (feature === '桃花') {
      return context.branches.filter(item => ['子', '午', '卯', '酉'].includes(item.value)).map(item => item.position);
    }

    return [];
  },

  hasWaterBranchCombo(context) {
    return (context.baziResult.zhiRelations?.三合 || []).some(rel => /水局/.test(rel.name || ''));
  },

  hasYangRen(context) {
    if (this.getFeatureCount(context, '劫财') >= 2) return true;
    return this.POSITION_ORDER.some(position => {
      const pillar = context.pillars[position];
      const zhiShiShen = pillar?.shiShenZhi || [];
      return pillar?.diShi === '帝旺' && (zhiShiShen.includes('比肩') || zhiShiShen.includes('劫财'));
    });
  },

  hasStem(context, stemList) {
    return context.stems.some(item => stemList.includes(item.value));
  },

  hasBranch(context, branchList) {
    return context.branches.some(item => branchList.includes(item.value));
  },

  getBranchByPosition(context, position) {
    return context.pillars[position]?.zhi || '';
  },

  hasEarlyDisturbance(context) {
    const earlyBadCount = ['year', 'month'].filter(position => {
      return context.badGanPositions.has(position) || context.badZhiPositions.has(position);
    }).length;
    return earlyBadCount >= 1;
  },

  hasDirectChenXu(context) {
    return this.hasBranch(context, ['辰']) && this.hasBranch(context, ['戌']);
  },

  isWealthInTomb(context) {
    const wealthZhiPositions = this.getFeaturePositions(context, '财星', 'zhi');
    const wealthOnTombBranch = wealthZhiPositions.some(position => {
      return ['辰', '戌', '丑', '未'].includes(this.getBranchByPosition(context, position));
    });
    const hasTombBranch = this.hasBranch(context, ['辰', '戌', '丑', '未']);
    return wealthOnTombBranch || (hasTombBranch && this.hasFeature(context, '财星') && this.isSelfStrong(context));
  },

  isFeatureStrong(context, feature) {
    if (!this.hasFeature(context, feature)) return false;

    if (context.elementCounts[feature] !== undefined) {
      return context.elementCounts[feature] >= 3 || context.elementCounts[feature] === context.maxElementCount;
    }

    switch (feature) {
      case '桃花':
      case '驿马':
        return this.getFeatureCount(context, feature) >= 2;
      case '官印':
      case '财印':
      case '木火':
      case '水金':
      case '金水':
      case '羊刃':
      case '水局':
      case '财弱比劫强':
        return true;
      case '五行':
        return this.isBalanced(context);
      default:
        return this.getFeatureCount(context, feature) >= 2;
    }
  },

  isFeatureDominant(context, feature) {
    if (context.elementCounts[feature] !== undefined) {
      return context.elementCounts[feature] > 0 && context.elementCounts[feature] === context.maxElementCount;
    }
    return this.getFeatureCount(context, feature) >= 3;
  },

  isBalanced(context) {
    const values = Object.values(context.elementCounts);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total === 0) return false;
    return context.maxElementCount - context.minElementCount <= 1 && values.filter(v => v > 0).length >= 4;
  },

  isImbalanced(context) {
    const values = Object.values(context.elementCounts);
    return Math.max(...values) - Math.min(...values) >= 3;
  },

  isSelfStrong(context) {
    return ['身强', '偏强'].includes(context.strengthLevel);
  },

  isSelfWeak(context) {
    return ['身弱', '偏弱'].includes(context.strengthLevel);
  },

  featureHasBadRelation(context, feature) {
    return this.getFeaturePositions(context, feature).some(position => {
      return context.badGanPositions.has(position) || context.badZhiPositions.has(position);
    });
  },

  scoreQuestion(question, context) {
    if (!question.baziTag) return 20;

    const feature = question.baziTag.tenGod;
    const condition = question.baziTag.condition || 'present';
    const featureCount = this.getFeatureCount(context, feature);
    const hasFeature = featureCount > 0;
    const strongFeature = this.isFeatureStrong(context, feature);
    const dominantFeature = this.isFeatureDominant(context, feature);
    const monthHit = this.getFeaturePositions(context, feature).includes('month');
    const yearHit = this.getFeaturePositions(context, feature).includes('year');
    const dayHit = this.getFeaturePositions(context, feature).includes('day');
    const hourHit = this.getFeaturePositions(context, feature).includes('hour');
    const branchHit = this.getFeaturePositions(context, feature, 'zhi').length > 0;

    switch (condition) {
      case 'absent':
        return hasFeature ? 0 : 100;
      case 'absent_but_strong':
        return !hasFeature && this.isSelfStrong(context) ? 95 : 0;
      case 'present':
        return hasFeature ? 80 : 0;
      case 'present_and_strong':
      case 'useful_and_strong':
        return strongFeature ? 95 : hasFeature ? 70 : 0;
      case 'useful':
      case 'strong':
        return strongFeature ? 90 : hasFeature ? 60 : 0;
      case 'in_month':
        return monthHit ? 100 : hasFeature ? 35 : 0;
      case 'in_year':
        return yearHit ? 100 : hasFeature ? 35 : 0;
      case 'in_hour':
        return hourHit ? 100 : hasFeature ? 35 : 0;
      case 'on_day':
        return dayHit ? 100 : hasFeature ? 35 : 0;
      case 'in_branch':
        return branchHit ? 90 : hasFeature ? 35 : 0;
      case 'in_month_empty':
        return monthHit && !!context.pillars.month?.xunKong ? 100 : monthHit ? 55 : 0;
      case 'in_month_year':
        return monthHit || yearHit ? 90 : hasFeature ? 35 : 0;
      case 'dominant':
      case 'dominant_appearance':
        return dominantFeature ? 95 : strongFeature ? 70 : 0;
      case 'stronger_than_pianyin':
        return this.getFeatureCount(context, feature) > this.getFeatureCount(context, '偏印') ? 95 : hasFeature ? 30 : 0;
      case 'stronger_than_piancai':
        return this.getFeatureCount(context, feature) > this.getFeatureCount(context, '偏财') ? 95 : hasFeature ? 30 : 0;
      case 'too_much':
      case 'too_strong':
        return featureCount >= 3 ? 95 : strongFeature ? 75 : 0;
      case 'too_strong_clashed':
        return featureCount >= 3 && this.featureHasBadRelation(context, feature) ? 100 : featureCount >= 3 ? 55 : 0;
      case 'too_strong_no_yin':
        return this.getFeatureCount(context, '伤官') >= 2 && this.getFeatureCount(context, '印星') === 0 ? 100 : 0;
      case 'uncontrolled':
        return this.getFeatureCount(context, '七杀') > 0 && this.getFeatureCount(context, '印星') === 0 && this.getFeatureCount(context, '食神') === 0 ? 95 : 0;
      case 'restricted':
        return hasFeature && (this.getFeatureCount(context, '财星') > 0 || this.getFeatureCount(context, '官星') > 0) ? 75 : hasFeature ? 40 : 0;
      case 'breaks_yin':
        return this.getFeatureCount(context, '财星') > 0 && this.getFeatureCount(context, '印星') > 0 ? 95 : 0;
      case 'clashes_shishen':
        return this.getFeatureCount(context, '偏印') > 0 && this.getFeatureCount(context, '食神') > 0 ? 90 : 0;
      case 'shangguan_strong':
        return this.getFeatureCount(context, '伤官') > 0 && this.getFeatureCount(context, '水') + this.getFeatureCount(context, '金') >= 3 ? 90 : this.getFeatureCount(context, '伤官') > 0 ? 55 : 0;
      case 'with_xuetang':
        return this.hasFeature(context, '驿马') && context.shenSha.some(name => /学堂|文昌/.test(name)) ? 100 : this.hasFeature(context, '驿马') ? 45 : 0;
      case 'with_gui':
        return hasFeature && context.shenSha.some(name => /贵人|天乙/.test(name)) ? 95 : hasFeature ? 45 : 0;
      case 'with_yangren':
        return hasFeature && this.hasYangRen(context) ? 95 : hasFeature ? 35 : 0;
      case 'with_shangguan':
        return this.hasFeature(context, '桃花') && this.hasFeature(context, '伤官') ? 90 : 0;
      case 'with_shishen':
        return this.hasFeature(context, '桃花') && this.hasFeature(context, '食神') ? 90 : 0;
      case 'mutual_generation':
      case 'harmonious':
        return hasFeature ? 90 : 0;
      case 'conflict':
        return hasFeature ? 85 : 0;
      case 'broken':
      case 'clashed':
        return hasFeature && this.featureHasBadRelation(context, feature) ? 95 : hasFeature ? 45 : 0;
      case 'clashed_in_month':
        return monthHit && this.featureHasBadRelation(context, feature) ? 100 : monthHit ? 40 : 0;
      case 'clashed_by_jie':
        return this.getFeatureCount(context, '偏财') > 0 && this.getFeatureCount(context, '劫财') > 0 ? 90 : 0;
      case 'clashed_by_shangguan':
        return this.getFeatureCount(context, '正官') > 0 && this.getFeatureCount(context, '伤官') > 0 ? 90 : 0;
      case 'clashes_wealth':
        return this.getFeatureCount(context, '劫财') > 0 && this.getFeatureCount(context, '财星') > 0 ? 90 : 0;
      case 'clashes_wife':
        return this.hasYangRen(context) && this.getFeatureCount(context, '财星') > 0 ? 90 : 0;
      case 'controls_shangguan':
        return this.getFeatureCount(context, '正印') > 0 && this.getFeatureCount(context, '伤官') > 0 ? 90 : 0;
      case 'strong_with_strong_self':
        return strongFeature && this.isSelfStrong(context) ? 95 : strongFeature ? 60 : 0;
      case 'strong_with_yin':
        return this.getFeatureCount(context, '食神') > 0 && this.getFeatureCount(context, '印星') > 0 ? 90 : 0;
      case 'balanced':
        return this.isBalanced(context) ? 95 : 0;
      case 'imbalance':
        return this.isImbalanced(context) ? 85 : 0;
      case 'wood_clashes':
        return this.getFeatureCount(context, '木') > 0 && this.getFeatureCount(context, '土') > 0 ? 85 : 0;
      case 'fire_clashes':
      case 'water_clashes':
        return this.getFeatureCount(context, '火') > 0 && this.getFeatureCount(context, '水') > 0 ? 85 : 0;
      case 'clashes_earth':
        return this.getFeatureCount(context, '枭神') > 0 && this.getFeatureCount(context, '土') > 0 ? 85 : 0;
      case 'clashes_metal':
        return this.getFeatureCount(context, '枭神') > 0 && this.getFeatureCount(context, '金') > 0 ? 85 : 0;
      case 'water_prison':
        return this.getFeatureCount(context, '金') > 0 && this.getFeatureCount(context, '水') > 0 ? 80 : 0;
      case 'water_wood_shangguan':
        return this.getFeatureCount(context, '金') > 0 && this.getFeatureCount(context, '水') > 0 && this.getFeatureCount(context, '伤官') > 0 ? 90 : 0;
      case 'weak':
      case 'weak_use':
        return hasFeature && (this.isSelfWeak(context) || !strongFeature) ? 85 : hasFeature ? 35 : 0;
      case 'bright':
        return this.getFeatureCount(context, '木') > 0 && this.getFeatureCount(context, '火') > 0 ? 85 : 0;
      case 'rebellious':
        return this.getFeatureCount(context, '伤官') > 0 ? 85 : 0;
      case 'yang_stem':
        return ['甲', '丙', '戊', '庚', '壬'].includes(context.dayMaster) ? 95 : 0;
      case 'chen_mao_joint':
        return this.hasBranch(context, ['辰']) && this.hasBranch(context, ['卯']) ? 100 : 0;
      case 'shen_si_limb':
        return this.hasBranch(context, ['申']) && this.hasBranch(context, ['巳']) ? 100 : 0;
      case 'ren_tou_cai': {
        const hasWealth = this.getFeatureCount(context, '财星') > 0;
        return hasWealth && (this.hasYangRen(context) || this.getFeatureCount(context, '劫财') >= 2) ? 95 : 0;
      }
      case 'month_clash_day': {
        const monthBranch = context.pillars.month?.zhi || '';
        const clashMap = {
          子: '午', 丑: '未', 寅: '申', 卯: '酉', 辰: '戌', 巳: '亥',
          午: '子', 未: '丑', 申: '寅', 酉: '卯', 戌: '辰', 亥: '巳'
        };
        return monthBranch && context.dayBranch === clashMap[monthBranch] ? 100 : 0;
      }
      case 'too_many_he': {
        const heCount = (context.baziResult.zhiRelations?.六合 || []).length
          + (context.baziResult.zhiRelations?.三合 || []).length
          + (context.baziResult.ganRelations?.五合 || []).length;
        return heCount >= 2 ? 95 : heCount === 1 ? 60 : 0;
      }
      case 'strong_but_empty':
        return this.getFeatureCount(context, '水') >= 3 && this.getFeatureCount(context, '财星') === 0 ? 95 : 0;
      case 'leave_hometown': {
        const yimaCount = this.getFeatureCount(context, '驿马');
        const earlyDisturbance = this.hasEarlyDisturbance(context);
        if (yimaCount >= 2 && earlyDisturbance) return 100;
        if (yimaCount >= 2) return 92;
        if (yimaCount >= 1 && earlyDisturbance) return 82;
        return 0;
      }
      case 'lawsuit_prone': {
        const shangguanJianGuan = this.getFeatureCount(context, '伤官') > 0 && this.getFeatureCount(context, '正官') > 0;
        const directConflict = this.hasDirectChenXu(context);
        const officialPressure = this.getFeatureCount(context, '官星') > 0 && ['year', 'month'].some(position => context.badZhiPositions.has(position));
        return shangguanJianGuan || directConflict ? 100 : officialPressure ? 70 : 0;
      }
      case 'early_hardship': {
        const earlyDisturbance = this.hasEarlyDisturbance(context);
        const badFamilyStars = this.getFeaturePositions(context, '七杀').includes('year')
          || this.getFeaturePositions(context, '七杀').includes('month')
          || this.getFeaturePositions(context, '偏印').includes('year')
          || this.getFeaturePositions(context, '偏印').includes('month');
        return earlyDisturbance && badFamilyStars ? 100 : earlyDisturbance ? 72 : 0;
      }
      case 'wealth_in_tomb':
        return this.isWealthInTomb(context) ? 95 : this.isSelfStrong(context) && this.hasFeature(context, '财星') ? 55 : 0;
      case 'hard_money':
        return this.getFeatureCount(context, '财弱比劫强') > 0 || this.getFeatureCount(context, '比劫') >= 3 ? 95
          : this.getFeatureCount(context, '比劫') >= 2 && this.hasFeature(context, '财星') ? 70 : 0;
      case 'day_gan_zhi_same':
        return context.dayMasterWuXing && context.dayMasterWuXing === context.dayBranchWuXing ? 100
          : this.hasYangRen(context) && context.badZhiPositions.has('day') ? 80 : 0;
      case 'chen_xu_chou_wei_day':
        return ['辰', '戌', '丑', '未'].includes(context.dayBranch) ? 100 : 0;
      case 'water_metal_romantic': {
        const metalCount = this.getFeatureCount(context, '金');
        const waterCount = this.getFeatureCount(context, '水');
        const attractiveCombo = metalCount >= 1 && waterCount >= 1 && metalCount + waterCount >= 3;
        return attractiveCombo && (this.hasFeature(context, '桃花') || this.hasFeature(context, '伤官')) ? 100
          : attractiveCombo ? 86 : 0;
      }
      case 'metal_water_clear': {
        const metalCount = this.getFeatureCount(context, '金');
        const waterCount = this.getFeatureCount(context, '水');
        return metalCount >= 1 && waterCount >= 1 && metalCount + waterCount >= 3 ? 92 : 0;
      }
      case 'head_scar': {
        const hasWoodStem = this.hasStem(context, ['甲', '乙']);
        const hasMetalStem = this.hasStem(context, ['庚', '辛']);
        const metalWoodClash = this.getFeatureCount(context, '木') > 0 && this.getFeatureCount(context, '金') > 0
          && (context.badGanPositions.size > 0 || context.badZhiPositions.size > 0);
        return (hasWoodStem && hasMetalStem && context.badGanPositions.size > 0) || (this.hasYangRen(context) && context.badZhiPositions.size > 0) ? 95
          : metalWoodClash ? 72 : 0;
      }
      case 'bad_teeth': {
        const metalBroken = this.getFeatureCount(context, '金') > 0 && this.featureHasBadRelation(context, '金');
        const metalDrained = this.getFeatureCount(context, '金') > 0 && this.getFeatureCount(context, '火') >= 2;
        const noWaterSupport = this.getFeatureCount(context, '水') === 0;
        return (metalBroken && noWaterSupport) || (metalDrained && noWaterSupport) ? 90
          : metalBroken || metalDrained ? 65 : 0;
      }
      case 'wood_metal_nerve': {
        const woodPressed = this.getFeatureCount(context, '木') > 0
          && (this.getFeatureCount(context, '火') >= 2 || this.getFeatureCount(context, '金') >= 2);
        return woodPressed && this.isImbalanced(context) ? 90 : woodPressed ? 60 : 0;
      }
      case 'lonely_mystic': {
        const hasHuaGai = context.shenSha.some(name => /华盖/.test(name));
        return hasHuaGai || this.getFeatureCount(context, '偏印') >= 2 ? 100 : 0;
      }
      case 'peach_blossom':
        return ['子', '午', '卯', '酉'].includes(context.dayBranch) ? 100 : this.hasFeature(context, '桃花') ? 60 : 0;
      case 'yinshen_sihai':
        return ['寅', '申', '巳', '亥'].includes(context.dayBranch) ? 100 : 0;
      default:
        return hasFeature ? 40 : 0;
    }
  }
};
