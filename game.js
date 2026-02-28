// game.js - 优化版

// --- 1. 图片预加载 (解决首次生成卡顿) ---
const preLoadImages = [
    // 建筑
    'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build4.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build3.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build17.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build18.png',
    'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build13.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build9.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build10.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build15.png',
    'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build7.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build1.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build14.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build11.png',
    'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build5.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build2.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build6.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build16.png',
    // 人物
    'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character1.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character2.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character3.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character4.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character5.png', 'https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character6.png'
];
preLoadImages.forEach(src => { new Image().src = src; });

// --- 数据定义 ---
let resources = { treasury: 50, people: 50, military: 50, culture: 50 }, incomeRates = { treasury: 5, people: 5, military: 5, culture: 5 };
const BUILD_THRESHOLDS = [80, 150, 220];
let buildingLevels = {}, occupiedPositions = { back: [], mid: [], front: [] }, spawnedBuildings = { treasury: [], people: [], military: [], culture: [] };
// 添加状态缓存变量
let lastTextState = 'none';  // 'left' | 'right' | 'none'
let lastHighlightDir = null; // 缓存当前高亮方向
let rafId = null;
const RECRUIT_COOLDOWN = 60; // 招募时间间隔

// 建筑定义 (已更新)
const buildingDefinitions = {
    treasury: [ 
        { name: "农田", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build4.png" }, 
        { name: "粮仓", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build3.png" }, 
        { name: "漕运码头", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build17.png" }, 
        { name: "市集", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build18.png" }
    ],
    people: [ 
        { name: "寺庙", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build13.png" }, 
        { name: "戏台", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build9.png" }, 
        { name: "铁匠铺", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build10.png" }, 
        { name: "水利工程", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build15.png" }
    ],
    military: [ 
        { name: "演武场", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build7.png" }, 
        { name: "烽火台", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build1.png" }, 
        { name: "长城", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build14.png" }, 
        { name: "武器店", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build11.png" }
    ],
    culture: [ 
        { name: "茶馆", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build5.png" }, 
        { name: "国子监", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build2.png" }, 
        { name: "画舫", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build6.png" }, 
        { name: "学堂", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/build16.png" }
    ]
};

// 政策树
// 政策树 (文本优化与数值平衡版)
const policyTrees = [
    // 剧本一：运河伟业
    [
        { 
            id: "c1", 
            title: "开凿大运河", 
            desc: "江南富庶，中原腹地，若有一河贯通，南粮可北运，国运或可昌隆。然此役浩大，征发民夫百万，恐生民变。工部尚书呈上两策：一为激进施工，二为缓图之。", 
            left: { text: "功在千秋，即刻开工！", effect: { treasury: -10, people: -5, culture: 5 }, nextId: "c2_start" }, 
            right: { text: "百姓方安，缓图之。", effect: { treasury: 5, people: 5 }, nextId: "c2_stop" } 
        },
        { 
            id: "c2_stop", 
            title: "休养生息", 
            desc: "旨意一下，举国欢腾。但南方漕运不通，长安米价飞涨，市井颇有怨言。户部提议开仓放粮，但这会削弱国储。", 
            left: { text: "开仓放粮，平抑米价。", effect: { treasury: -10, people: 10 }, nextId: "c3_stop_good" }, 
            right: { text: "市场之事，官府不宜干预。", effect: { treasury: 5, people: -5 }, nextId: "c3_stop_bad" } 
        },
        { 
            id: "c3_stop_good", 
            title: "盛世安宁", 
            desc: "百姓感念皇恩，虽无大工，但根基稳固，各地传来丰收喜讯。", 
            left: { text: "减税一年。", effect: { treasury: -5, people: 10 }, nextId: "c4_end_peace" }, 
            right: { text: "鼓励农桑。", effect: { treasury: 5, people: 5 }, nextId: "c4_end_peace" } 
        },
        { 
            id: "c3_stop_bad", 
            title: "民怨沸腾", 
            desc: "米价失控，饥民开始哄抢粮店，地方官员请求增兵弹压。", 
            left: { text: "出兵弹压，以儆效尤。", effect: { military: 5, people: -10 }, nextId: "c4_end_chaos" }, 
            right: { text: "下诏罪己，开仓赈济。", effect: { treasury: -10, people: 10 }, nextId: "c4_end_peace" } 
        },
        { 
            id: "c4_end_peace", 
            title: "国泰民安", 
            desc: "国家虽无大工，但百姓富足，四方来朝。", 
            left: { text: "...", effect: { culture: 10 }, nextId: "end" }, 
            right: { text: "...", effect: { culture: 10 }, nextId: "end" } 
        },
        { 
            id: "c4_end_chaos", 
            title: "动荡不安", 
            desc: "动乱虽平，元气大伤，需休养生息。", 
            left: { text: "...", effect: { military: 5 }, nextId: "end" }, 
            right: { text: "...", effect: { military: 5 }, nextId: "end" } 
        },

        // 开工路线
        { 
            id: "c2_start", 
            title: "工程浩大", 
            desc: "征发令下，中原大地满目疮痍，役夫死者相枕。河道初具雏形，然朝廷派来的督查使臣胃口极大，暗示要好处。", 
            left: { text: "坦然面对，接受督查", effect: { treasury: -5, people: 5 }, nextId: "c3_check" }, 
            right: { text: "上下打点，遮掩亏损", effect: { treasury: -10, people: -5 }, nextId: "c3_check" } 
        },
        // 【随机判定】：贪腐督查
        // 左(坦白) = 押大；右(打点) = 押小
        { 
            id: "c3_check", title: "督查危机", desc: "督查使臣在工地上横挑鼻子竖挑眼。若被他查出亏空，恐有大祸；若能瞒天过海，便是泼天富贵。", 
            left: { text: "据实相告，赌他公正", effect: {}, special: "gamble", winNext: "c3_check_win", loseNext: "c3_check_lose" }, 
            right: { text: "献上巨额贿赂", effect: {}, special: "gamble", winNext: "c3_check_win", loseNext: "c3_check_lose" } 
        },
        { id: "c3_check_win", title: "有惊无险", desc: "使臣虽然刁钻，但看你应对得体（或是钱到位了），并未深究。工程得以继续。", left: { text: "继续施工", effect: { treasury: -5 }, nextId: "c4_build_soft" }, right: { text: "继续施工", effect: { treasury: -5 }, nextId: "c4_build_soft" } },
        { id: "c3_check_lose", title: "东窗事发", desc: "使臣大怒，上奏朝廷。你被革职查办，工程被迫中断，之前的投入打了水漂。", left: { text: "无奈", effect: { treasury: -15, people: -5 }, nextId: "c4_build_force" }, right: { text: "无奈", effect: { treasury: -15, people: -5 }, nextId: "c4_build_force" } },

        { 
            id: "c4_build_soft", 
            title: "仁政工程", 
            desc: "虽耗资巨大，但民心可用，两岸百姓箪食壶浆以迎王师。", 
            left: { text: "...", effect: { people: 15, culture: 10 }, nextId: "c5_end_good" }, 
            right: { text: "...", effect: { people: 15, culture: 10 }, nextId: "c5_end_good" } 
        },
        { 
            id: "c4_build_force", 
            title: "暴政工程", 
            desc: "运河通航，粮船蔽日。然两岸百姓家家戴孝，哭声震天。", 
            left: { text: "...", effect: { treasury: 20, people: -15 }, nextId: "c5_end_bad" }, 
            right: { text: "...", effect: { treasury: 20, people: -15 }, nextId: "c5_end_bad" } 
        },
        { 
            id: "c5_end_good", 
            title: "运河清波", 
            desc: "运河两岸商贸繁荣，大唐国运如日中天。", 
            left: { text: "好", effect: { culture: 15 }, nextId: "end" }, 
            right: { text: "好", effect: { culture: 15 }, nextId: "end" } 
        },
        { 
            id: "c5_end_bad", 
            title: "血色运河", 
            desc: "功业已成，然怨气冲天，为日后埋下祸根。", 
            left: { text: "唉", effect: { people: -10 }, nextId: "end" }, 
            right: { text: "唉", effect: { people: -10 }, nextId: "end" } 
        }
    ],

    // 剧本二：边关风云
    [
        { 
            id: "b1", 
            title: "突厥南下", 
            desc: "北方突厥集结二十万铁骑，意图染指中原。边关告急文书一日三至。朝中分为两派，一派主和，一派主战。", 
            left: { text: "纳贡称臣，换取时间。", effect: { treasury: -15, people: -5, culture: -5 }, nextId: "b2_peace" }, 
            right: { text: "御驾亲征，鼓舞士气！", effect: { treasury: -10, military: 10 }, nextId: "b2_war" } 
        },
        { 
            id: "b2_peace", 
            title: "屈辱求和", 
            desc: "使者带去金帛万匹，换得突厥退兵。然对方傲慢无礼，邀你赴营中“叙旧”，恐是鸿门宴。", 
            left: { text: "带重兵护卫前往", effect: { military: 5 }, nextId: "b3_meeting" }, 
            right: { text: "单刀赴会，显大国气度", effect: { culture: 5 }, nextId: "b3_meeting" } 
        },
        // 【随机判定】：鸿门宴
        // 左(重兵) = 押大；右(单刀) = 押小
        { 
            id: "b3_meeting", title: "鸿门宴", desc: "突厥大帐内刀斧手林立。可汗目光闪烁，不知是真心和谈，还是诈降。", 
            left: { text: "严加戒备", effect: {}, special: "gamble", winNext: "b3_meeting_win", loseNext: "b3_meeting_lose" }, 
            right: { text: "推杯换盏，以诚相待", effect: {}, special: "gamble", winNext: "b3_meeting_win", loseNext: "b3_meeting_lose" } 
        },
        { id: "b3_meeting_win", title: "不辱使命", desc: "你的气度（或武力）震慑了可汗，双方歃血为盟，边境暂得安宁。", left: { text: "回师", effect: { people: 10 }, nextId: "b4_end_win" }, right: { text: "回师", effect: { people: 10 }, nextId: "b4_end_win" } },
        { id: "b3_meeting_lose", title: "身陷囹圄", desc: "突厥翻脸，将你扣押。朝廷为了赎你，不得不割让三州。", left: { text: "奇耻大辱", effect: { people: -15, culture: -10 }, nextId: "b4_end_shame" }, right: { text: "奇耻大辱", effect: { people: -15, culture: -10 }, nextId: "b4_end_shame" } },

        { id: "b4_end_shame", title: "偏安一隅", desc: "大唐虽存，已无天可汗之威，苟延残喘。", left: { text: "...", effect: { culture: -5 }, nextId: "end" }, right: { text: "...", effect: { culture: -5 }, nextId: "end" } },
        { id: "b4_end_win", title: "大捷", desc: "突厥远遁，边关十年无事。", left: { text: "...", effect: { military: 15 }, nextId: "end" }, right: { text: "...", effect: { military: 15 }, nextId: "end" } },

        // 主战路线
        { 
            id: "b2_war", 
            title: "战局胶着", 
            desc: "两军对垒，互有胜负。有将领建议趁夜火攻敌营，但这有违仁义，且风向难测。", 
            left: { text: "兵不厌诈，批准火攻！", effect: { military: 10, people: -5 }, nextId: "b3_war_fire" }, 
            right: { text: "堂堂正正，正面决战！", effect: { military: -5, treasury: -10 }, nextId: "b3_war_charge" } 
        },
        { 
            id: "b3_war_fire", 
            title: "烈火焚原", 
            desc: "一把大火，突厥大营化为灰烬，敌军溃败。但同时也烧毁了边境草场，风沙骤起。", 
            left: { text: "胜者为王，无需多虑。", effect: { military: 10, culture: -5 }, nextId: "b4_end_fire" }, 
            right: { text: "于心不忍，安抚灾民。", effect: { treasury: -5, people: 5 }, nextId: "b4_end_fire" } 
        },
        { 
            id: "b3_war_charge", 
            title: "惨烈决战", 
            desc: "正面交锋，杀敌一千自损八百，双方尸横遍野。", 
            left: { text: "厚葬将士，抚恤家属。", effect: { treasury: -10, people: 10 }, nextId: "b4_end_blood" }, 
            right: { text: "整顿军纪，再战！", effect: { military: 5 }, nextId: "b4_end_blood" } 
        },
        { 
            id: "b4_end_fire", 
            title: "焦土之战", 
            desc: "虽胜犹耻，百年不敢南下牧马。", 
            left: { text: "...", effect: { military: 10 }, nextId: "end" }, 
            right: { text: "...", effect: { military: 10 }, nextId: "end" } 
        },
        { 
            id: "b4_end_blood", 
            title: "铁血长歌", 
            desc: "用鲜血筑起了新的长城。", 
            left: { text: "...", effect: { people: 10 }, nextId: "end" }, 
            right: { text: "...", effect: { people: 10 }, nextId: "end" } 
        }
    ],

    // 剧本三：佛光普照
    [
        { 
            id: "f1", 
            title: "佛法大兴", 
            desc: "各地寺院经济膨胀，良田皆归佛门，免税特权令国库日渐枯竭，然百姓信佛者众。", 
            left: { text: "尊崇佛教，为国祈福。", effect: { treasury: -10, culture: 15 }, nextId: "f2_build" }, 
            right: { text: "下令灭佛，扩充国库！", effect: { treasury: 20, culture: -10 }, nextId: "f2_kill" } 
        },
        { 
            id: "f2_build", 
            title: "举国狂热", 
            desc: "寺院林立，钟鼓齐鸣。然农田荒芜，劳动力流失。一日，有僧人称见到佛光，乃是祥瑞。", 
            left: { text: "大肆宣扬，以此安民", effect: { culture: 10, people: 5 }, nextId: "f3_miracle" }, 
            right: { text: "严查真伪，防妖言惑众", effect: { people: -5, treasury: 5 }, nextId: "f3_miracle" } 
        },
        // 【随机判定】：佛光真伪
        // 左(宣扬) = 押大；右(严查) = 押小
        { 
            id: "f3_miracle", title: "佛光之谜", desc: "若佛光为真，则民心大振；若为假，则威信扫地。", 
            left: { text: "相信是祥瑞", effect: {}, special: "gamble", winNext: "f3_miracle_win", loseNext: "f3_miracle_lose" }, 
            right: { text: "质疑其真伪", effect: {}, special: "gamble", winNext: "f3_miracle_win", loseNext: "f3_miracle_lose" } 
        },
        { id: "f3_miracle_win", title: "天降祥瑞", desc: "万民跪拜，香火鼎盛，国库虽空，但百姓精神富足。", left: { text: "善哉", effect: { culture: 20, people: 10 }, nextId: "f4_end_holy" }, right: { text: "善哉", effect: { culture: 20, people: 10 }, nextId: "f4_end_holy" } },
        { id: "f3_miracle_lose", title: "骗局败露", desc: "所谓佛光竟是僧人点燃的磷火！民众大失所望，信仰崩塌。", left: { text: "严惩僧人", effect: { people: -10, culture: -10 }, nextId: "f4_end_poor" }, right: { text: "掩盖真相", effect: { treasury: -10 }, nextId: "f4_end_poor" } },

        { id: "f4_end_holy", title: "西方极乐", desc: "大唐成为佛国圣地，万国来朝。", left: { text: "...", effect: { culture: 10 }, nextId: "end" }, right: { text: "...", effect: { culture: 10 }, nextId: "end" } },
        { id: "f4_end_poor", title: "寺庙富甲", desc: "百姓食不果腹，僧侣却肥头大耳。", left: { text: "...", effect: { treasury: -10 }, nextId: "end" }, right: { text: "...", effect: { treasury: -10 }, nextId: "end" } },

        { 
            id: "f2_kill", 
            title: "会昌法难", 
            desc: "拆毁寺院，勒令僧尼还俗，没收寺产。举国哗然，僧侣聚集宫门抗议。", 
            left: { text: "强力驱散，严惩不贷。", effect: { people: -10, military: 5 }, nextId: "f3_kill_hard" }, 
            right: { text: "安抚劝导，发放遣散费。", effect: { treasury: -5, people: 5 }, nextId: "f3_kill_soft" } 
        },
        { 
            id: "f3_kill_hard", 
            title: "血染袈裟", 
            desc: "流血冲突在所难免，背负了骂名，但国库确实充盈了。", 
            left: { text: "为了社稷，值得。", effect: { treasury: 20, culture: -10 }, nextId: "f4_end_rich" }, 
            right: { text: "残忍。", effect: { treasury: 10 }, nextId: "f4_end_rich" } 
        },
        { 
            id: "f3_kill_soft", 
            title: "还俗为民", 
            desc: "增加了劳动力，寺院田产分给百姓，皆大欢喜。", 
            left: { text: "很好。", effect: { people: 10, treasury: 10 }, nextId: "f4_end_live" }, 
            right: { text: "不错。", effect: { people: 5 }, nextId: "f4_end_live" } 
        },
        { 
            id: "f4_end_rich", 
            title: "富国强兵", 
            desc: "国库充盈，军备精良，但精神世界一片荒芜。", 
            left: { text: "...", effect: { treasury: 10 }, nextId: "end" }, 
            right: { text: "...", effect: { treasury: 10 }, nextId: "end" } 
        },
        { 
            id: "f4_end_live", 
            title: "耕读传家", 
            desc: "佛寺变成了学堂，大唐迎来了新的生机。", 
            left: { text: "...", effect: { people: 15 }, nextId: "end" }, 
            right: { text: "...", effect: { people: 15 }, nextId: "end" } 
        }
    ]
];

// 人物剧本 (完整版：2精英 + 3底层)
const characterStories = [
    // --- 剧本一：长安·灯火阑珊处 (精英·含科举/党争检定) ---
{
    name: "长安·灯火阑珊处",
    list: [
        { id: "a1", title: "上元之夜", desc: "长安灯火如昼，你站在人群中，忽然瞥见巷口那盏孤灯下，有个背影像极了当年那个她。你心跳加速，周围喧嚣仿佛消失。", left: { text: "不顾一切追上去", effect: { common: 1 }, nextId: "a2_chase" }, right: { text: "停下脚步，凝望", effect: { literary: 1 }, nextId: "a2_stay" } },
        
        // 追忆分支
        { id: "a2_chase", title: "误入深巷", desc: "你慌不择路追进深巷，却发现那是几个泼皮无赖正在围堵一辆马车。那背影并非她，但你已无法抽身。", left: { text: "挺身而出，喝止恶行", effect: { martial: 1 }, nextId: "a3_hero" }, right: { text: "大声呼救，引来武侯", effect: { literary: 1 }, nextId: "a3_smart" } },
        { id: "a3_hero", title: "侠义之举", desc: "你虽手无寸铁，却有一腔热血。一番搏斗，你虽挂彩，却成功惊退了泼皮。马车帘子掀开，竟是当朝宰相千金。", left: { text: "淡然处之，不求回报", effect: { literary: 2 }, nextId: "a4_official" }, right: { text: "趁机结交，以此邀功", effect: { merchant: 1 }, nextId: "a4_official" } },
        { id: "a3_smart", title: "智退无赖", desc: "你的计策奏效，巡街武侯及时赶到。马车主人感激你的机智，递给你一块令牌。", left: { text: "收下令牌，深藏功名", effect: { literary: 1 }, nextId: "a4_official" }, right: { text: "询问能否赏些银两", effect: { merchant: 1 }, nextId: "a4_rich" } },

        // 驻足分支
        { id: "a2_stay", title: "灯火阑珊", desc: "你痴痴地望着那背影消失在灯火深处。转身欲走，却撞到了一位老者，他手中的书卷散落一地。", left: { text: "道歉并帮忙拾起", effect: { literary: 1 }, nextId: "a3_help" }, right: { text: "匆匆道歉离去", effect: { common: 1 }, nextId: "a3_leave" } },
        { id: "a3_help", title: "萍水相逢", desc: "老者见你举止儒雅，谈吐不凡，便邀你共饮。原来他是国子监祭酒。", left: { text: "虚心请教，秉烛夜谈", effect: { literary: 2 }, nextId: "a4_exam" }, right: { text: "只想以此换取荐书", effect: { merchant: 1 }, nextId: "a4_official" } },
        { id: "a3_leave", title: "擦肩而过", desc: "你错失了机缘，只能回到那个拥挤的赁屋，继续苦读。", left: { text: "埋头苦读", effect: { literary: 1 }, nextId: "a4_exam" }, right: { text: "这书读得真累", effect: { common: 1 }, nextId: "a4_rich" } },

        // --- 分支路线 ---
        { id: "a4_official", title: "初入仕途", desc: "在贵人的帮助下，你获得了入仕的捷径。朝堂之上，风云变幻，一步踏错，便是万丈深渊。", left: { text: "清廉正直，以此自保", effect: { literary: 1 }, nextId: "a5_court" }, right: { text: "结党营私，步步高升", effect: { merchant: 1 }, nextId: "a5_court" } },
        { id: "a4_rich", title: "商海浮沉", desc: "你凭借机灵劲儿，在商海中赚了第一桶金。", left: { text: "富甲一方", effect: { merchant: 2 }, nextId: "a5_end_rich" }, right: { text: "富甲一方", effect: { merchant: 2 }, nextId: "a5_end_rich" } },

        // 【核心检定1】：科举殿试
        // 设定：左(豪放) = 押大；右(婉约) = 押小
        { 
            id: "a4_exam", title: "御笔钦点", desc: "金殿之上，皇帝亲自出题。你凝神静气，笔走龙蛇。是做豪放语震惊四座，还是做婉约词以求稳妥？", 
            left: { text: "豪放派：不破楼兰终不还", effect: {}, special: "gamble", winNext: "a_exam_win", loseNext: "a_exam_lose" }, 
            right: { text: "婉约派：忍把浮名，换了浅斟低唱", effect: {}, special: "gamble", winNext: "a_exam_win", loseNext: "a_exam_lose" } 
        },
        { id: "a_exam_win", title: "金榜题名", desc: "皇帝龙颜大悦，钦点你为状元！文章千古事，得失寸心知。你的名字，响彻长安。", left: { text: "谢主隆恩", effect: { literary: 3 }, nextId: "a6_end_elite" }, right: { text: "谢主隆恩", effect: { literary: 3 }, nextId: "a6_end_elite" } },
        { id: "a_exam_lose", title: "名落孙山", desc: "皇帝眉头紧锁，将你的卷子扔在一旁。才华横溢却怀才不遇，你黯然离开了长安。", left: { text: "回乡教书", effect: { common: 2 }, nextId: "a5_end_teacher" }, right: { text: "回乡教书", effect: { common: 2 }, nextId: "a5_end_teacher" } },

        // 【核心检定2】：朝堂党争
        // 设定：左(改革) = 押大；右(中立) = 押小
        { 
            id: "a5_court", title: "党争漩涡", desc: "朝中两党相争，你已身处漩涡中心。一边是权倾朝野的宰相，一边是锐意改革的少壮派。", 
            left: { text: "站队改革派，富贵险中求", effect: {}, special: "gamble", winNext: "a_court_win", loseNext: "a_court_lose" }, 
            right: { text: "明哲保身，谁也不惹", effect: {}, special: "gamble", winNext: "a_court_win", loseNext: "a_court_lose" } 
        },
        { id: "a_court_win", title: "权倾朝野", desc: "你赌对了！新党得势，你一路青云直上，拜相封侯。", left: { text: "权柄在手", effect: { literary: 2 }, nextId: "a6_end_elite" }, right: { text: "权柄在手", effect: { literary: 2 }, nextId: "a6_end_elite" } },
        { id: "a_court_lose", title: "贬谪岭南", desc: "站错了队，被打入大牢，发配岭南。此去岭南八千里，何处是归程？", left: { text: "凄凉上路", effect: { common: 1 }, nextId: "a6_end_exile" }, right: { text: "凄凉上路", effect: { common: 1 }, nextId: "a6_end_exile" } },

        // --- 结局节点 ---
        { id: "a5_end_teacher", title: "乡间夫子", desc: "你开馆授徒，教书育人。虽然仕途断绝，但你培养出的学生，或许将来能实现你的梦想。", left: { text: "结局", effect: { common: 2 }, nextId: "end" }, right: { text: "结局", effect: { common: 2 }, nextId: "end" } },
        { id: "a5_end_rich", title: "长安首富", desc: "你利用人脉经商，富甲一方。每当夜深人静，你总会想起那个上元节的夜晚，后悔没有追上去。", left: { text: "结局", effect: { merchant: 3 }, nextId: "end" }, right: { text: "结局", effect: { merchant: 3 }, nextId: "end" } },

        { id: "a6_end_elite", title: "国之栋梁", desc: "你站在大明宫的最高处，俯瞰着这万家灯火。当年那个在寒风中苦读的少年，终于走到了权力的巅峰。只是，那个身影，再也找不回了。", left: { text: "结局", effect: { literary: 3 }, nextId: "end" }, right: { text: "结局", effect: { literary: 3 }, nextId: "end" } },
        { id: "a6_end_exile", title: "天涯孤客", desc: "岭南瘴气弥漫，你病骨支离。回望长安，那是回不去的梦。你提笔写下一首绝句，泪洒蛮荒。", left: { text: "结局", effect: { literary: 1 }, nextId: "end" }, right: { text: "结局", effect: { literary: 1 }, nextId: "end" } }
    ]
},

// --- 剧本二：凉州·大漠孤烟直 (精英·含随机检定) ---
{
    name: "凉州·大漠孤烟直",
    list: [
        { id: "b1", title: "征兵令", desc: "边关告急，官差的马蹄声踏破了小村的宁静。你的名字，赫然在列。你是家中独子，老母卧病在床，拉着你的衣角哭泣。", left: { text: "替父从军，保家卫国", effect: { martial: 1 }, nextId: "b2_army" }, right: { text: "贿赂官差，试图逃脱", effect: { merchant: 1 }, nextId: "b2_escape" } },
        
        // --- 从军路线 ---
        { id: "b2_army", title: "边关冷月", desc: "军旅生涯苦寒。一次夜间巡逻，身边的战友被冷箭射倒，生死未卜，敌军的弯刀在月光下闪着寒光。", left: { text: "冒死背回战友", effect: { common: 1 }, nextId: "b3_save" }, right: { text: "含泪冲锋，杀敌报仇", effect: { martial: 1 }, nextId: "b3_charge" } },
        { id: "b3_save", title: "生死兄弟", desc: "战友活了下来，他感激涕零，原来他是将军的亲兵。战后，你们面临新的选择。", left: { text: "退伍回乡，侍奉老母", effect: { common: 2 }, nextId: "b4_farmer" }, right: { text: "留在军营，建功立业", effect: { martial: 2 }, nextId: "b4_soldier" } },
        { id: "b3_charge", title: "杀敌立功", desc: "你的一腔怒火化为战力，斩首三级，被将军赏识提拔。", left: { text: "继续奋斗，争取封侯", effect: { martial: 2 }, nextId: "b4_soldier" }, right: { text: "见好就收，申请调防", effect: { common: 1 }, nextId: "b4_farmer" } },
        
        // --- 逃跑路线 ---
        { id: "b2_escape", title: "流民之路", desc: "你散尽家财，却在途中遭遇流匪。钱财被劫，你也身无分文，流落荒野。", left: { text: "落草为寇，求生要紧", effect: { martial: 1 }, nextId: "b3_bandit" }, right: { text: "进城乞讨，等待时机", effect: { common: 1 }, nextId: "b3_beg" } },
        { id: "b3_bandit", title: "山寨入伙", desc: "你凭着一股狠劲成了二当家，打家劫舍，大口吃肉。但官军的围剿越来越紧。", left: { text: "接受招安，洗白身份", effect: { military: 1 }, nextId: "b4_soldier" }, right: { text: "继续落草，逍遥法外", effect: { martial: 1 }, nextId: "b4_bandit" } },
        { id: "b3_beg", title: "遇见恩人", desc: "一位路过的行商见你骨骼惊奇，不像乞儿，收留了你。", left: { text: "报恩，做他的护院", effect: { common: 2 }, nextId: "b4_farmer" }, right: { text: "偷学经商之道", effect: { merchant: 2 }, nextId: "b5_end_merchant" } },

        // --- 分支节点 ---
        { id: "b4_farmer", title: "归园田居", desc: "战火平息，你回到了故乡。老母已过世，坟头长满了荒草。你跪在坟前，痛哭流涕。", left: { text: "继承老屋，耕种为生", effect: { common: 2 }, nextId: "b5_end_farmer" }, right: { text: "守墓三年，了此残生", effect: { common: 1 }, nextId: "b5_end_farmer" } },

        // 士兵线检定：决战时刻
        // 设定：左(死战) = 押大；右(迂回) = 押小
        { 
            id: "b4_soldier", title: "决战时刻", desc: "烽火连天，你也成了百夫长。今夜突厥大举进攻，你必须做出抉择。生死由命，富贵在天。", 
            left: { text: "身先士卒，死战不退！", effect: {}, special: "gamble", winNext: "b_soldier_win", loseNext: "b_soldier_lose" }, 
            right: { text: "迂回包抄，险中求胜", effect: {}, special: "gamble", winNext: "b_soldier_win", loseNext: "b_soldier_lose" } 
        },
        { id: "b_soldier_win", title: "大捷", desc: "你的决断扭转了战局！敌军溃败，你浑身浴血，如战神降临。史书工笔，将留下你的名字。", left: { text: "封狼居胥", effect: { martial: 3 }, nextId: "b6_end_general" }, right: { text: "封狼居胥", effect: { martial: 3 }, nextId: "b6_end_general" } },
        { id: "b_soldier_lose", title: "马革裹尸", desc: "乱箭穿心。你倒在血泊中，望着故乡的方向，意识逐渐模糊。这辈子，回不去了。", left: { text: "...", effect: { common: 1 }, nextId: "b6_end_martyr" }, right: { text: "...", effect: { common: 1 }, nextId: "b6_end_martyr" } },

        // 土匪线检定：官军围剿
        // 设定：左(突围) = 押大；右(投降) = 押小
        { 
            id: "b4_bandit", title: "四面楚歌", desc: "官军烧毁了山寨，烟雾呛鼻。大哥已死，你被逼到了悬崖边。前有追兵，后无退路。", 
            left: { text: "杀出一条血路！", effect: {}, special: "gamble", winNext: "b_bandit_win", loseNext: "b_bandit_lose" }, 
            right: { text: "下马受降，祈求宽恕", effect: {}, special: "gamble", winNext: "b_bandit_win", loseNext: "b_bandit_lose" } 
        },
        { id: "b_bandit_win", title: "逍遥法外", desc: "你滚下了悬崖，虽断了腿，但保住了命。从此江湖上多了一个独腿游侠的传说。", left: { text: "浪迹天涯", effect: { martial: 2 }, nextId: "b6_end_bandit" }, right: { text: "浪迹天涯", effect: { martial: 2 }, nextId: "b6_end_bandit" } },
        { id: "b_bandit_lose", title: "悬赏令", desc: "你被生擒，游街示众。百姓向你扔着烂菜叶。刑场上，你仰天长啸，引颈受戮。", left: { text: "二十年后...", effect: { common: -1 }, nextId: "b6_end_dead" }, right: { text: "二十年后...", effect: { common: -1 }, nextId: "b6_end_dead" } },

        // --- 结局节点 ---
        { id: "b5_end_farmer", title: "田园将芜", desc: "你在老屋旁种下了一棵柳树。春天来了，柳絮纷飞。你想着，这日子虽苦，但终究是太平了。", left: { text: "结局", effect: { common: 3 }, nextId: "end" }, right: { text: "结局", effect: { common: 3 }, nextId: "end" } },
        { id: "b5_end_merchant", title: "商贾之路", desc: "你凭着机灵劲儿，成了行商的大掌柜。虽然再没摸过刀，但商路上的尔虞我诈，比战场更凶险。", left: { text: "结局", effect: { merchant: 3 }, nextId: "end" }, right: { text: "结局", effect: { merchant: 3 }, nextId: "end" } },
        
        { id: "b6_end_general", title: "一代名将", desc: "你卸下战甲，满身伤疤。朝廷赐下的牌坊立在村口，但你只想回到那个上元节的夜晚，吃一碗母亲做的炊饼。", left: { text: "结局", effect: { martial: 3 }, nextId: "end" }, right: { text: "结局", effect: { martial: 3 }, nextId: "end" } },
        { id: "b6_end_martyr", title: "边疆枯骨", desc: "没人知道你的名字。只有那漫天的黄沙，掩埋了你的忠魂。大唐的盛世，是由无数像你这样的枯骨堆成的。", left: { text: "结局", effect: { martial: 1 }, nextId: "end" }, right: { text: "结局", effect: { martial: 1 }, nextId: "end" } },
        { id: "b6_end_bandit", title: "江湖浪子", desc: "你独腿坐在酒馆角落，听人说书人讲那凉州大战的故事。你笑了笑，喝干了碗里的劣酒。", left: { text: "结局", effect: { martial: 2 }, nextId: "end" }, right: { text: "结局", effect: { martial: 2 }, nextId: "end" } },
        { id: "b6_end_dead", title: "悬首示众", desc: "你的人头挂在城门上，风吹日晒。路过的诗人写了一首绝句，感叹乱世浮萍。", left: { text: "结局", effect: { common: 1 }, nextId: "end" }, right: { text: "结局", effect: { common: 1 }, nextId: "end" } }
    ]
},

// --- 剧本三：市井·贩夫走卒 (底层) ---
{
    name: "市井·贩夫走卒",
    list: [
        { id: "c1", title: "继承摊位", desc: "父亲去世，留下了一个卖炊饼的小摊位。天还没亮，你就得起来揉面，手被冻得通红。", left: { text: "勤劳经营，用心做饼", effect: { merchant: 1 }, nextId: "c2_work" }, right: { text: "想做大生意，这摊位太小", effect: { merchant: 1 }, nextId: "c2_risk" } },
        { id: "c2_work", title: "街坊邻居", desc: "你的炊饼皮薄馅大，渐渐在西市有了名气。有个酒楼的掌柜想让你供货。", left: { text: "薄利多销，稳扎稳打", effect: { common: 1 }, nextId: "c3_stable" }, right: { text: "趁机涨价，赚一笔再说", effect: { merchant: 2 }, nextId: "c3_rich" } },
        { id: "c2_risk", title: "借贷进货", desc: "你借高利贷进了一批丝绸倒卖，结果路上遇匪，丝绸被劫。债主上门逼债。", left: { text: "去码头做苦力还债", effect: { common: 1 }, nextId: "c3_fail" }, right: { text: "去赌坊搏一把", effect: { merchant: -1 }, nextId: "c3_gamble" } },
        
        { id: "c3_stable", title: "小本生意", desc: "日子过得紧巴巴，但也安稳。到了适婚年龄，媒婆给你说了门亲事。", left: { text: "娶个贤惠媳妇，搭伙过日子", effect: { common: 1 }, nextId: "c4_family" }, right: { text: "攒钱不娶，想再拼一把", effect: { merchant: 1 }, nextId: "c4_save" } },
        { id: "c3_rich", title: "西市老板", desc: "你赚了第一桶金，盘下了一家店面。生意火爆，却也招来了同行嫉妒。", left: { text: "低调做人，和气生财", effect: { merchant: 1 }, nextId: "c4_big_boss" }, right: { text: "花钱打点官府，找靠山", effect: { merchant: 1 }, nextId: "c4_big_boss" } },
        { id: "c3_fail", title: "卖身还债", desc: "你到大户人家做家丁，受尽了白眼。但这家的少爷似乎很欣赏你的机灵。", left: { text: "努力干活，争取提拔", effect: { common: 1 }, nextId: "c4_servant" }, right: { text: "偷懒耍滑，得过且过", effect: { merchant: 1 }, nextId: "c4_servant" } },
        
        // 特殊赌博节点
        { 
            id: "c3_gamble", title: "孤注一掷", desc: "你押上了全部身家，颤抖的手将仅剩的银两推向赌桌。赌客们屏住呼吸，盯着庄家的手。", 
            left: { text: "押大！", effect: {}, special: "gamble", winNext: "c3_gamble_win", loseNext: "c3_gamble_lose" }, 
            right: { text: "押小！", effect: {}, special: "gamble", winNext: "c3_gamble_win", loseNext: "c3_gamble_lose" } 
        },
        { id: "c3_gamble_win", title: "时来运转", desc: "周围爆发出一阵惊呼。你紧紧攥着赢来的银两，不敢相信这是真的。", left: { text: "见好就收，回家还债", effect: { merchant: 2 }, nextId: "c4_save" }, right: { text: "再赌一把，想赢更多", effect: { merchant: 2 }, nextId: "c3_rich" } },
        { id: "c3_gamble_lose", title: "一无所有", desc: "天旋地转，你瘫软在椅子上。一切都完了。", left: { text: "被赌坊打手扔出门", effect: { common: 1 }, nextId: "c4_servant" }, right: { text: "想寻短见", effect: { common: 1 }, nextId: "c4_servant" } },

        { id: "c4_family", title: "娶妻生子", desc: "媳妇给你生了个大胖小子。家里开销大了，但也有了盼头。", left: { text: "教导读书，改换门庭", effect: { literary: 1 }, nextId: "c5_kid_study" }, right: { text: "传授做饼手艺，子承父业", effect: { merchant: 1 }, nextId: "c5_kid_work" } },
        { id: "c4_save", title: "攒钱不娶", desc: "你攒了一笔钱，晚年虽无子嗣，但也无忧。", left: { text: "回乡买几亩地养老", effect: { common: 2 }, nextId: "c5_end_normal" }, right: { text: "继续摆摊，直到干不动", effect: { merchant: 2 }, nextId: "c5_end_normal" } },
        { id: "c4_big_boss", title: "富甲一方", desc: "你成了西市有名的富商，还捐了个散官。", left: { text: "结交权贵，洗白身份", effect: { merchant: 1 }, nextId: "c5_end_rich" }, right: { text: "低调做人，闷声发财", effect: { common: 1 }, nextId: "c5_end_rich" } },
        { id: "c4_servant", title: "家丁生涯", desc: "你在府里干了十年。少爷要进京赶考，想带个书童随行。", left: { text: "争取名额，随行伺候", effect: { common: 1 }, nextId: "c5_servant_good" }, right: { text: "留在府里，看家护院", effect: { common: 1 }, nextId: "c5_servant_bad" } },
        
        { id: "c5_kid_study", title: "金榜题名", desc: "儿子争气，考中了进士。你成了老太爷，从此不用再看人脸色。", left: { text: "光宗耀祖", effect: { literary: 2 }, nextId: "c6_end_pride" }, right: { text: "光宗耀祖", effect: { literary: 2 }, nextId: "c6_end_pride" } },
        { id: "c5_kid_work", title: "子承父业", desc: "生意更红火，开了三家分号。你老了，干不动了，把摊子交给了儿子。", left: { text: "含饴弄孙", effect: { common: 2 }, nextId: "c5_end_normal" }, right: { text: "含饴弄孙", effect: { common: 2 }, nextId: "c5_end_normal" } },
        { id: "c5_servant_good", title: "京城见闻", desc: "少爷高中，你也跟着沾光。赏了你一笔钱，放你回家了。", left: { text: "回乡开个小店", effect: { merchant: 2 }, nextId: "c6_end_small_shop" }, right: { text: "告老还乡", effect: { common: 2 }, nextId: "c5_end_normal" } },
        { id: "c5_servant_bad", title: "流落街头", desc: "主家败落，你被赶出门，无家可归。", left: { text: "乞讨为生", effect: { common: 1 }, nextId: "c6_end_beggar" }, right: { text: "乞讨为生", effect: { common: 1 }, nextId: "c6_end_beggar" } },
        
        { id: "c6_end_pride", title: "光宗耀祖", desc: "你穿着诰命服，站在朱红大门前。回首往事，那个在寒风中揉面的少年，终于走出了命运的泥潭。", left: { text: "...", effect: { literary: 3 }, nextId: "end" }, right: { text: "...", effect: { literary: 3 }, nextId: "end" } },
        { id: "c6_end_small_shop", title: "小店主", desc: "你守着自己的小店，看着街上来来往往的人群，心中满是踏实。", left: { text: "...", effect: { merchant: 2 }, nextId: "end" }, right: { text: "...", effect: { merchant: 2 }, nextId: "end" } },
        { id: "c6_end_beggar", title: "乞丐", desc: "你蜷缩在街角，手里捧着半个馊馒头。大雪落下，盖住了你冰冷的身体，再也无人问津。", left: { text: "...", effect: { common: 1 }, nextId: "end" }, right: { text: "...", effect: { common: 1 }, nextId: "end" } },
        { id: "c5_end_normal", title: "市井小民", desc: "这一生平淡如水，有苦有甜。临终前，儿孙绕膝，你也算死而无憾。", left: { text: "...", effect: { common: 2 }, nextId: "end" }, right: { text: "...", effect: { common: 2 }, nextId: "end" } },
        { id: "c5_end_rich", title: "富甲一方", desc: "你成了长安城里有头有脸的人物，金山银山，却买不回逝去的青春。", left: { text: "...", effect: { merchant: 3 }, nextId: "end" }, right: { text: "...", effect: { merchant: 3 }, nextId: "end" } }
    ]
},

{
    name: "工匠·匠心独运",
    list: [
        { id: "d1", title: "学徒生涯", desc: "师父不仅打铁，还会修锁。你看着炉火，心想是要做个铁匠，还是学些精巧手艺？", left: { text: "专心学打铁", effect: { tech: 1 }, nextId: "d2_iron" }, right: { text: "偷学修锁", effect: { tech: 1 }, nextId: "d2_lock" } },
        { id: "d2_iron", title: "改良农具", desc: "你打的锄头结实耐用，乡亲们都夸。工部侍郎路过，看中了你。", left: { text: "随侍郎入京，求个出身", effect: { tech: 2 }, nextId: "d3_official" }, right: { text: "留在乡里，造福乡亲", effect: { common: 2 }, nextId: "d3_local" } },
        { id: "d2_lock", title: "奇思妙想", desc: "你发明了连环锁，名声传开了。有人重金求购图纸。", left: { text: "卖给富商，赚取暴利", effect: { merchant: 2 }, nextId: "d3_rich" }, right: { text: "献给官府，以此邀功", effect: { tech: 2 }, nextId: "d3_official" } },
        { id: "d3_official", title: "入匠籍", desc: "你成了官匠，虽不自由，但衣食无忧。", left: { text: "兢兢业业，听命行事", effect: { tech: 1 }, nextId: "d4_off_work" }, right: { text: "钻研图纸，试图革新", effect: { tech: 2 }, nextId: "d4_off_study" } },
        { id: "d3_local", title: "乡间名匠", desc: "你收了几个徒弟，虽然清贫，但受人尊敬。", left: { text: "传授技艺，桃李满天下", effect: { common: 1 }, nextId: "d4_local_teach" }, right: { text: "保守秘密，传男不传女", effect: { merchant: 1 }, nextId: "d4_local_secret" } },
        { id: "d3_rich", title: "富家翁", desc: "你赚了大钱，但也招来了是非。同行嫉妒你的才华，地痞觊觎你的钱财。", left: { text: "继续发明，哪怕倾家荡产", effect: { merchant: -1 }, nextId: "d4_rich_invent" }, right: { text: "享受生活，但这世道不太平", effect: { merchant: 1 }, nextId: "d4_rich_invent" } },
        
        { id: "d4_off_work", title: "官匠生涯", desc: "你参与了皇陵修建，虽无大功，但也无过。", left: { text: "因资历升迁", effect: { tech: 1 }, nextId: "d5_elite" }, right: { text: "退休还乡", effect: { common: 2 }, nextId: "d5_end_normal" } },
        { id: "d4_off_study", title: "神机妙算", desc: "你改良了连弩，威力惊人。", left: { text: "参军效力，沙场立功", effect: { martial: 2 }, nextId: "d5_elite" }, right: { text: "留守工部，专司制造", effect: { tech: 1 }, nextId: "d5_elite" } },
        { id: "d4_local_teach", title: "桃李满天下", desc: "徒弟们都很孝顺，为你养老送终。", left: { text: "安享晚年", effect: { common: 2 }, nextId: "d5_end_normal" }, right: { text: "继续打铁", effect: { tech: 1 }, nextId: "d5_end_normal" } },
        { id: "d4_local_secret", title: "独门绝技", desc: "你守着祖传手艺，却引来了同行嫉妒。", left: { text: "被打压，生意惨淡", effect: { common: 1 }, nextId: "d5_end_normal" }, right: { text: "和解，分享利益", effect: { merchant: 1 }, nextId: "d5_end_normal" } },

        // --- 植入随机检定节点 ---
        // 设定：左(发明) = 押小；右(享受) = 押大
        { 
            id: "d4_rich_invent", title: "命运的分叉", desc: "你站在人生的十字路口。继续钻研可能流芳百世，也可能一无所有；安享富贵可能太平无事，也可能坐吃山空。命运女神在向你微笑。", 
            left: { text: "孤注一掷，继续发明", effect: {}, special: "gamble", winNext: "d_invent_gamble_win", loseNext: "d_invent_gamble_lose" }, 
            right: { text: "见好就收，享受生活", effect: {}, special: "gamble", winNext: "d_enjoy_gamble_win", loseNext: "d_enjoy_gamble_lose" } 
        },
        // 发明路线：押小赢
        { id: "d_invent_gamble_win", title: "神工天巧", desc: "你的发明惊动了圣人！不仅未受刁难，反而获赐金牌，成了天下闻名的“神匠”。", left: { text: "谢恩", effect: { tech: 3 }, nextId: "d6_end_elite" }, right: { text: "谢恩", effect: { tech: 3 }, nextId: "d6_end_elite" } },
        // 发明路线：押小输
        { id: "d_invent_gamble_lose", title: "怀璧其罪", desc: "贪官污吏眼红你的技艺和财富，构陷你私藏甲胄。家产被抄，你被打入大牢，郁郁而终。", left: { text: "绝望", effect: { common: -1 }, nextId: "d6_end_jail" }, right: { text: "绝望", effect: { common: -1 }, nextId: "d6_end_jail" } },
        // 享受路线：押大赢
        { id: "d_enjoy_gamble_win", title: "富贵闲人", desc: "虽然没做出什么惊天动地的大事，但你散尽家财结交权贵，落得个逍遥自在，安享晚年。", left: { text: "知足了", effect: { merchant: 2 }, nextId: "d5_end_normal" }, right: { text: "知足了", effect: { merchant: 2 }, nextId: "d5_end_normal" } },
        // 享受路线：押大输
        { id: "d_enjoy_gamble_lose", title: "坐吃山空", desc: "纸醉金迷的生活掏空了家底。昔日的富商如今流落街头，手中只剩下一把生锈的铁锤。", left: { text: "悔恨", effect: { common: 1 }, nextId: "d6_end_beggar" }, right: { text: "悔恨", effect: { common: 1 }, nextId: "d6_end_beggar" } },

        { id: "d5_elite", title: "大国工匠", desc: "你的名字被载入史册，成为一代宗师。", left: { text: "...", effect: { tech: 3 }, nextId: "d6_end_elite" }, right: { text: "...", effect: { tech: 3 }, nextId: "d6_end_elite" } },
        { id: "d5_end_normal", title: "手艺人", desc: "你靠着这双手，养活了一家老小，临终时，手里还攥着那把铁锤。", left: { text: "...", effect: { common: 2 }, nextId: "end" }, right: { text: "...", effect: { common: 2 }, nextId: "end" } },
        
        { id: "d6_end_elite", title: "一代宗师", desc: "你的技艺登峰造极，世人皆称你为“鲁班在世”。", left: { text: "结局", effect: { tech: 3 }, nextId: "end" }, right: { text: "结局", effect: { tech: 3 }, nextId: "end" } },
        { id: "d6_end_jail", title: "狱中枯骨", desc: "无人收尸，草席裹身，抛于乱葬岗。", left: { text: "结局", effect: { common: 1 }, nextId: "end" }, right: { text: "结局", effect: { common: 1 }, nextId: "end" } },
        { id: "d6_end_beggar", title: "落魄匠人", desc: "你饿死在曾经辉煌过的作坊门口。", left: { text: "结局", effect: { common: 1 }, nextId: "end" }, right: { text: "结局", effect: { common: 1 }, nextId: "end" } }
    ]
},

// --- 剧本五：农桑·在此山中 (底层·含双重随机检定) ---
{
    name: "农桑·在此山中",
    list: [
        // 起点
        { id: "e1", title: "春耕大忙", desc: "布谷鸟叫了，该下种了。你看着那几亩薄田，心里盘算着今年的收成。", left: { text: "精耕细作，听天由命", effect: { common: 1 }, nextId: "e2_work" }, right: { text: "进城找活路，不甘心土里刨食", effect: { common: 1 }, nextId: "e2_city" } },
        
        // --- 务农线 ---
        { id: "e2_work", title: "风调雨顺", desc: "老天爷赏饭吃，庄稼长势喜人。官府的差役来了，要收租。", left: { text: "足额交租，求得安稳", effect: { treasury: 1 }, nextId: "e3_good" }, right: { text: "藏起一部分，想给家里留点口粮", effect: { treasury: -1, people: 1 }, nextId: "e3_hide" } },
        
        { id: "e3_good", title: "安居乐业", desc: "交完租，剩下的粮够吃半年。冬天快到了，得准备冬衣。", left: { text: "纺纱织布，自给自足", effect: { common: 1 }, nextId: "e4_winter" }, right: { text: "闲着过年，哪怕冻着", effect: { culture: 1 }, nextId: "e4_winter" } },
        
        // 【检定点1】：藏粮后的命运
        // 设定：左(哭诉) = 押小；右(行贿) = 押大
        { 
            id: "e3_hide", title: "差役上门", desc: "差役踢开了你的米缸，目光阴冷。你心跳如鼓，必须立刻做出决定。", 
            left: { text: "下跪磕头，哭诉家贫", effect: {}, special: "gamble", winNext: "e_hide_win", loseNext: "e_hide_lose" }, 
            right: { text: "塞银子，赌他是个贪官", effect: {}, special: "gamble", winNext: "e_hide_win", loseNext: "e_hide_lose" } 
        },
        { id: "e_hide_win", title: "侥幸过关", desc: "差役掂了掂银子（或是看你实在可怜），哼了一声，转身走了。你瘫坐在地上，冷汗湿透了后背。", left: { text: "躲过一劫", effect: { treasury: -5, people: 5 }, nextId: "e4_winter" }, right: { text: "躲过一劫", effect: { treasury: -5, people: 5 }, nextId: "e4_winter" } },
        { id: "e_hide_lose", title: "人财两空", desc: "差役一脚将你踹翻，夺走了银子和粮食，还把你抓去做了壮丁。", left: { text: "绝望", effect: { common: -1 }, nextId: "e4_lose" }, right: { text: "绝望", effect: { common: -1 }, nextId: "e4_lose" } },

        // --- 进城线 ---
        { id: "e2_city", title: "码头扛包", desc: "你到了城里，发现城里人也不好过。码头工头看着你，眼神像看牲口。", left: { text: "忍气吞声，攒钱买地", effect: { common: 2 }, nextId: "e3_land" }, right: { text: "听说赌坊能一夜暴富，去看看", effect: { merchant: -1 }, nextId: "e3_gamble" } },
        
        { id: "e3_land", title: "置办家业", desc: "十年血汗，你终于买下了那几亩地。地契在手，你热泪盈眶。", left: { text: "娶妻生子，扎根土地", effect: { common: 2 }, nextId: "e4_family" }, right: { text: "独自生活，守着地", effect: { common: 1 }, nextId: "e4_alone" } },
        
        // 【检定点2】：赌博翻本
        // 设定：左(押大) = 押大；右(押小) = 押小
        { 
            id: "e3_gamble", title: "孤注一掷", desc: "你站在赌桌前，手里攥着最后的本钱。周围人声鼎沸，你感到一阵眩晕。", 
            left: { text: "押大！", effect: {}, special: "gamble", winNext: "e_gamble_win", loseNext: "e_gamble_lose" }, 
            right: { text: "押小！", effect: {}, special: "gamble", winNext: "e_gamble_win", loseNext: "e_gamble_lose" } 
        },
        { id: "e_gamble_win", title: "时来运转", desc: "骰子落定...开了！你赢了！银子哗啦啦地流进你的口袋。你紧紧抱着钱袋，生怕这只是个梦。", left: { text: "见好就收，回乡买地", effect: { merchant: 2 }, nextId: "e3_land" }, right: { text: "再赌一把！", effect: { merchant: 2 }, nextId: "e_gamble_win" } },
        { id: "e_gamble_lose", title: "一无所有", desc: "骰子落定...完了。全完了。你瘫倒在地上，被赌坊打手扔到了大街上。", left: { text: "流落街头", effect: { common: 1 }, nextId: "e4_lose" }, right: { text: "想寻短见", effect: { common: 1 }, nextId: "e4_lose" } },

        // --- 结局分支 ---
        { id: "e4_winter", title: "寒冬腊月", desc: "大雪封门，一家人围着火炉。孩子饿得直哭，你心如刀绞。", left: { text: "给孩子讲故事，画饼充饥", effect: { culture: 1 }, nextId: "e5_spring" }, right: { text: "规划明年，咬牙坚持", effect: { common: 1 }, nextId: "e5_spring" } },
        { id: "e4_lose", title: "艰难求生", desc: "日子苦得像黄连，但你不能死，死了家就散了。", left: { text: "乞讨为生", effect: { common: 1 }, nextId: "e5_end_normal" }, right: { text: "乞讨为生", effect: { common: 1 }, nextId: "e5_end_normal" } },
        { id: "e4_family", title: "儿孙满堂", desc: "你的孩子们长大了，有的种地，有的读书。你老了，腰也直不起来了。", left: { text: "教导他们种地，守住家业", effect: { common: 2 }, nextId: "e5_end_good" }, right: { text: "送他们去读书，改换门庭", effect: { literary: 1 }, nextId: "e5_end_good" } },
        { id: "e4_alone", title: "独自一人", desc: "你守着那几亩地，守了一辈子。", left: { text: "孤独终老", effect: { common: 1 }, nextId: "e5_end_normal" }, right: { text: "孤独终老", effect: { common: 1 }, nextId: "e5_end_normal" } },
        
        { id: "e5_spring", title: "春暖花开", desc: "熬过了冬天，官府又要征税了。听说外面的世道乱了。", left: { text: "继续种地，管他天塌下来", effect: { common: 2 }, nextId: "e6_end_farmer" }, right: { text: "去城里看看，哪怕是死也要死个明白", effect: { merchant: 1 }, nextId: "e6_end_merchant" } },
        
        // 结局
        { id: "e6_end_farmer", title: "富农", desc: "你躺在摇椅上，看着金黄的麦浪。这一生虽然劳碌，但也踏实。你闭上了眼，梦到了小时候在田埂上奔跑。", left: { text: "...", effect: { common: 3 }, nextId: "end" }, right: { text: "...", effect: { common: 3 }, nextId: "end" } },
        { id: "e6_end_merchant", title: "小商贩", desc: "你做起了小买卖，虽没发大财，但也饿不死。", left: { text: "...", effect: { merchant: 2 }, nextId: "end" }, right: { text: "...", effect: { merchant: 2 }, nextId: "end" } },
        { id: "e5_end_good", title: "富农", desc: "家境殷实，儿孙孝顺。你是十里八乡有名的善人。", left: { text: "...", effect: { common: 3 }, nextId: "end" }, right: { text: "...", effect: { common: 3 }, nextId: "end" } },
        { id: "e5_end_normal", title: "贫农", desc: "你佝偻着背，在寒风中捡拾麦穗。你不知道这苦日子什么时候是个头，只知道，活一天，算一天。", left: { text: "...", effect: { common: 1 }, nextId: "end" }, right: { text: "...", effect: { common: 1 }, nextId: "end" } }
    ]
}
];

// 突发灾害剧本 (优化版+随机判定)
const specialEvents = [
    {
        name: "江淮水患",
        questions: [
            { 
                id: "flood_q1", // 增加 ID
                title: "洪水爆发", 
                desc: "连日暴雨，江淮堤坝决口。洪水如猛兽般吞噬良田村庄，流民遍地。户部尚书请示急调国库银两赈灾，但这会掏空家底。", 
                left: { text: "拨款赈灾，开仓放粮", effect: { treasury: -15, people: 15 } }, 
                right: { text: "令地方官员自行安抚", effect: { treasury: 0, people: -10 } } 
            },
            { 
                id: "flood_q2", // 增加 ID
                title: "抗洪抢险", 
                desc: "决口处水流湍急，沙袋扔下去瞬间被冲走。方法有二：要么投入巨资打造木笼填石（耗钱），要么驱赶百姓跳入水中以人墙堵口（伤民）。", 
                left: { text: "投入金银，以工代赈", effect: { treasury: -10 }, special: "gamble", winNext: "flood_win", loseNext: "flood_lose" }, 
                right: { text: "驱民堵口，强令执行", effect: { people: -10 }, special: "gamble", winNext: "flood_win", loseNext: "flood_lose" }
            },
            { id: "flood_win", title: "堤坝合龙", desc: "洪水退去，由于处置得当，并未造成更大伤亡。", left: { text: "善后", effect: { people: 5 }, nextId: "end" }, right: { text: "善后", effect: { people: 5 }, nextId: "end" } },
            { id: "flood_lose", title: "决堤加剧", desc: "方法似乎不对，或是天意难违。洪水冲毁了更多村庄，损失惨重。", left: { text: "无奈", effect: { people: -15, treasury: -10 }, nextId: "end" }, right: { text: "无奈", effect: { people: -15, treasury: -10 }, nextId: "end" } }
        ]
    },
    {
        name: "关中大旱",
        questions: [
            { 
                id: "drought_q1", // 增加 ID
                title: "赤地千里", 
                desc: "关中大旱，颗粒无收。饥民开始啃食树皮，甚至易子而食。长安城内人心惶惶，米价飞涨。", 
                left: { text: "开仓放粮，平抑米价", effect: { treasury: -15, people: 15 } }, 
                right: { text: "设坛祈雨，下罪己诏", effect: { culture: 10, people: 5 } } 
            },
            { 
                id: "drought_q2", // 增加 ID
                title: "祈雨之辩", 
                desc: "法师设坛求雨七日，天空依旧烈日当空。此时有人提议烧死巫师以谢天，或继续等待。", 
                left: { text: "再等三日！", effect: { culture: 5 }, special: "gamble", winNext: "rain_win", loseNext: "rain_lose" }, 
                right: { text: "处死法师，平民愤", effect: { culture: -10, people: 5 }, special: "gamble", winNext: "rain_win", loseNext: "rain_lose" }
            },
            { id: "rain_win", title: "天降甘霖", desc: "乌云蔽日，大雨倾盆。百姓欢呼雀跃，跪地高呼万岁。", left: { text: "苍天有眼", effect: { people: 20, culture: 10 }, nextId: "end" }, right: { text: "苍天有眼", effect: { people: 20, culture: 10 }, nextId: "end" } },
            { id: "rain_lose", title: "滴雨未下", desc: "烈日依旧。绝望的饥民开始冲击官府。", left: { text: "调兵镇压", effect: { military: 5, people: -15 }, nextId: "end" }, right: { text: "开仓放粮", effect: { treasury: -20, people: 10 }, nextId: "end" } }
        ]
    }
];

const crisisTree = [
    { 
        id: "crisis_1", 
        title: "安禄山造反", 
        desc: "范阳节度使安禄山以“清君侧”为名，起兵二十万南下。河北州县望风而降，战报如雪片般飞入长安，朝野震惊。", 
        left: { text: "立即派兵镇压，御敌于国门", effect: { military: -10, treasury: -5 }, nextId: "crisis_2_war" }, 
        right: { text: "坚守潼关，等待各地勤王", effect: { people: -5, military: 5 }, nextId: "crisis_2_def" } 
    },
    { 
        id: "crisis_2_war", 
        title: "野战失利", 
        desc: "唐军在平原仓促迎战，因指挥不力大败。安禄山叛军逼近洛阳，前锋直指潼关。", 
        left: { text: "处决败将，整肃军纪", effect: { military: 5, people: -5 }, nextId: "crisis_3_judge" }, 
        right: { text: "退守潼关，保存实力", effect: { people: 5, military: -5 }, nextId: "crisis_3_judge" } 
    },
    { 
        id: "crisis_2_def", 
        title: "坚守不出", 
        desc: "潼关守军虽坚如磐石，但粮草将尽。后方传来消息，有人弹劾你畏战不前。", 
        left: { text: "出关迎战，以证清白", effect: { military: -15, people: 5 }, nextId: "crisis_3_bad" }, 
        right: { text: "死守待援，不被动摇", effect: { people: -10, military: 10 }, nextId: "crisis_3_judge" } 
    },
    { 
        id: "crisis_3_bad", 
        title: "潼关失守", 
        desc: "出关迎敌，中了埋伏。潼关失守，长安危在旦夕，百官惊慌失措。", 
        left: { text: "...", effect: { people: -20 }, nextId: "crisis_3_judge" }, 
        right: { text: "...", effect: { people: -20 }, nextId: "crisis_3_judge" } 
    },
    { 
        id: "crisis_3_judge", 
        title: "危急存亡", 
        desc: "叛军兵临城下，此时只有两个选择：要么拼死一搏，要么避其锋芒。", 
        left: { text: "御驾亲征，与国运共生死", effect: {}, nextId: "end_battle" }, 
        right: { text: "弃城逃往蜀地，徐图后计", effect: {}, nextId: "end_flee" } 
    }
];

const characterTypes = { general: { name: "镇国大将", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character2.png", bonus: { military: 2 }, rarity: 'elite' }, merchant: { name: "一代富商", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character1.png", bonus: { treasury: 2 }, rarity: 'elite' }, craftsman: { name: "能工巧匠", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character5.png", bonus: { treasury: 1, people: 1 }, rarity: 'elite' }, scholar: { name: "翰林学士", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character3.png", bonus: { culture: 2 }, rarity: 'elite' }, soldier: { name: "精锐士卒", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character2.png", bonus: { military: 1 }, rarity: 'common' }, peddler: { name: "市井商贩", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character4.png", bonus: { treasury: 0.5 }, rarity: 'common' }, farmer: { name: "农夫", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character6.png", bonus: { people: 1 }, rarity: 'common' }, teacher: { name: "教书先生", icon: "https://cdn.jsdelivr.net/gh/LuoshuiCat/demo@main/assets/character3.png", bonus: { culture: 0.5 }, rarity: 'common' } };

// 游戏状态
let currentPhase = "POLICY", currentCardIndex = 0, currentDeck = [], cardMap = {}, nextCardId = null, charScores = {}, gameTime = 0, finalCountdown = 300, incomeTimer = 0, recruitSlots = 0, recruitTimer = RECRUIT_COOLDOWN, specialEventTriggered = false, pendingDisaster = false, characters = [], gameLoopInterval, lastTime = 0, lastStoryIndex = -1;

// UI 缓存
const ui = {
    eventTitle: document.getElementById('event-title'), eventDesc: document.getElementById('event-desc'), 
    txtLeft: document.getElementById('txt-left'), txtRight: document.getElementById('txt-right'),
    swipeCard: document.getElementById('swipe-card'), buildingsContainer: document.getElementById('buildings-container'), overlay: document.getElementById('overlay'), resultTitle: document.getElementById('result-title'), resultDesc: document.getElementById('result-desc'),
    idlePanel: document.getElementById('idle-panel'), finalTimer: document.getElementById('final-timer'), incomeStats: document.getElementById('income-stats'), sideUI: document.getElementById('side-ui'),
    recruitBtn: document.getElementById('recruit-btn'), recruitStatus: document.getElementById('recruit-status'), progressRing: document.querySelector('#progress-ring circle'), disasterBtn: document.getElementById('disaster-btn'),
    barLeft: document.getElementById('bar-left'), barRight: document.getElementById('bar-right'),
    resValues: {}, resItems: {},
    sceneMask: document.getElementById('scene-mask')
};

function cacheUIElements() {
    ['treasury', 'people', 'military', 'culture'].forEach(k => {
        let item = document.getElementById(`res-item-${k}`); ui.resItems[k] = item; if(item) ui.resValues[k] = item.querySelector('.res-value');
    });
}

function showMask() { ui.sceneMask.classList.add('active'); }
function hideMask() { ui.sceneMask.classList.remove('active'); }

function initGame() {
    resources = { treasury: 50, people: 50, military: 50, culture: 50 }; incomeRates = { treasury: 5, people: 5, military: 5, culture: 5 }; 
    buildingLevels = { treasury: 0, people: 0, military: 0, culture: 0 }; 
    occupiedPositions = { back: [], mid: [], front: [] }; spawnedBuildings = { treasury: [], people: [], military: [], culture: [] }; characters = []; gameTime = 0; recruitSlots = 0; recruitTimer = RECRUIT_COOLDOWN; specialEventTriggered = false; pendingDisaster = false; currentCardIndex = 0; currentDeck = [];
    
    cacheUIElements(); 
    ui.buildingsContainer.innerHTML = ''; ui.overlay.style.display = 'none'; ui.idlePanel.style.display = 'none'; ui.sideUI.style.display = 'none'; ui.swipeCard.style.display = 'flex';
    updateUI(); updateRecruitUI();
    setupSwipeEvents();
    
    if(gameLoopInterval) clearInterval(gameLoopInterval); lastTime = Date.now(); gameLoopInterval = setInterval(gameLoop, 100);
     // 新增：游戏开始即刻启动背景渐变，持续120秒
    const bgMask = document.getElementById('bg-mask');
    if(bgMask) bgMask.style.opacity = 0;

    startSnow(); // 开启下雪
    startIntro();

}

function startIntro() {
    currentPhase = "INTRO";
    showMask(); 
    
    ui.eventTitle.innerText = "序幕";
    ui.eventDesc.innerText = "一个新的王朝拉开了序幕，现在，你需要处理的第一件事是：";
    
    ui.txtLeft.innerText = "开始"; 
    ui.txtRight.innerText = "开始"; 
    ui.txtLeft.classList.remove('active');
    ui.txtRight.classList.remove('active');
    
    ui.swipeCard.style.transition = 'none';
    ui.swipeCard.style.transform = 'translateX(0) rotate(0)';
    ui.swipeCard.style.opacity = 1;
    ui.swipeCard.offsetTop; 
    updateCardVisual(0);
}

function startPolicyPhase() {
    currentPhase = "POLICY";
    loadDeck(policyTrees[Math.floor(Math.random() * policyTrees.length)]);
    showNextCard();
}

function loadDeck(d) { currentDeck = d; cardMap = {}; currentDeck.forEach(c => cardMap[c.id] = c); nextCardId = currentDeck.length ? currentDeck[0].id : null; }
function gameLoop() { let n = Date.now(), dt = (n - lastTime) / 1000; lastTime = n; if (recruitSlots < 3) { recruitTimer -= dt; if (recruitTimer <= 0) { recruitSlots++; recruitTimer = RECRUIT_COOLDOWN; updateRecruitUI(); } } updateRecruitRing(); if (currentPhase === "IDLE") { gameTime += dt; incomeTimer += dt; if (incomeTimer >= 15) { incomeTimer = 0; applyIncome(); } let r = finalCountdown - gameTime; if (r <= 180 && !specialEventTriggered) triggerSpecialEvent(); if (r <= 0) startCrisis(); else ui.finalTimer.innerText = `安史之乱倒计时: ${Math.floor(r/60)}:${String(Math.floor(r%60)).padStart(2,'0')}`; updateCharacterPositions(dt); } }
function applyIncome() { for (let k in resources) { resources[k] += incomeRates[k]; highlightRes(k, true); checkBuildingUpgrades(k); } updateUI(); let h = checkHighStatFail(); if (h) { showResult(false, h); clearInterval(gameLoopInterval); } }
function highlightRes(k, isIncrease) { let valEl = ui.resValues[k]; if(!valEl) return; if (isIncrease) { valEl.classList.remove('guess'); valEl.classList.add('highlight'); setTimeout(() => valEl.classList.remove('highlight'), 300); } else { valEl.classList.add('guess'); } }
function clearGuessHighlight() { Object.values(ui.resValues).forEach(el => el.classList.remove('guess')); }
function checkHighStatFail() { let m = 0, mk = ''; for (let k in resources) if (resources[k] > m) { m = resources[k]; mk = k; } if (m > 250) { if (mk === 'military') return "武将权倾朝野，政局崩坏。"; if (mk === 'culture') return "思想过剩，推翻了政权。"; if (mk === 'treasury') return "官富民穷，天下大乱。"; if (mk === 'people') return "君主已成天命，天下大乱。"; } if (m > 200) if(ui.resValues[mk]) ui.resValues[mk].classList.add('warning'); return null; }
function updateUI() { ui.resValues.treasury.innerText = Math.floor(resources.treasury); ui.resValues.people.innerText = Math.floor(resources.people); ui.resValues.military.innerText = Math.floor(resources.military); ui.resValues.culture.innerText = Math.floor(resources.culture); ui.incomeStats.innerHTML = `<span>💰 +${incomeRates.treasury.toFixed(0)}/15s</span><span>👥 +${incomeRates.people.toFixed(0)}/15s</span><span>⚔️ +${incomeRates.military.toFixed(0)}/15s</span><span>📜 +${incomeRates.culture.toFixed(0)}/15s</span>`; }
function updateRecruitUI() { ui.recruitStatus.innerText = `招募(${recruitSlots})`; ui.recruitBtn.classList.toggle('active', recruitSlots > 0); }
function updateRecruitRing() { ui.progressRing.style.strokeDashoffset = recruitSlots >= 3 ? 188.5 : 188.5 * (recruitTimer / RECRUIT_COOLDOWN); }
function checkBuildingUpgrades(t) { let v = resources[t]; let l = buildingLevels[t] || 0; for (let i = l; i < BUILD_THRESHOLDS.length; i++) { if (v >= BUILD_THRESHOLDS[i]) { spawnBuilding(t); buildingLevels[t] = i + 1; } } }
function spawnBuilding(t) { const d = buildingDefinitions[t]; if(!d) return; let a = d.filter(x => !spawnedBuildings[t].includes(x.name)); if(!a.length) { spawnedBuildings[t] = []; a = d; } const b = a[Math.floor(Math.random() * a.length)]; spawnedBuildings[t].push(b.name); const div = document.createElement('div'); div.className = 'building'; let iconHtml = b.icon.startsWith('http') ? `<div class="building-icon"><img src="${b.icon}"></div>` : `<div class="building-icon">${b.icon}</div>`; div.innerHTML = `${iconHtml}<span>${b.name}</span>`; const rows = [{ n:'back', b:55, s:0.75, z:1 }, { n:'mid', b:35, s:0.95, z:2 }, { n:'front', b:15, s:1.15, z:3 }]; const row = rows[Math.floor(Math.random() * rows.length)]; let p = -1; for(let i=0; i<20; i++) { let tp = Math.random()*80+10; if(!occupiedPositions[row.n].some(e => Math.abs(e-tp)<30)) { p = tp; break; } } if(p===-1) p = Math.random()*80+10; occupiedPositions[row.n].push(p); div.style.cssText = `left:${p}%;bottom:${row.b}%;transform:scale(${row.s});z-index:${row.z}`; ui.buildingsContainer.appendChild(div); }
function triggerSpecialEvent() { specialEventTriggered = true; pendingDisaster = true; ui.disasterBtn.classList.add('show'); }
function handleDisaster() { 
    if(!pendingDisaster) return; 
    pendingDisaster = false; 
    ui.disasterBtn.classList.remove('show'); 
    currentPhase = "SPECIAL_EVENT"; 
    const e = specialEvents[Math.floor(Math.random() * specialEvents.length)]; 
    
    // 关键修复：必须调用 loadDeck 来注册卡片ID，否则后续的随机结果卡片会找不到
    loadDeck(e.questions); 
    
    // loadDeck 已经设置了 nextCardId，这里不需要手动设置
    ui.idlePanel.style.display = 'none'; 
    ui.swipeCard.style.display = 'flex'; 
    ui.eventTitle.style.opacity = 1; 
    ui.eventDesc.style.opacity = 1; 
    ui.eventTitle.innerText = "突发事件"; 
    ui.eventDesc.innerText = `【${e.name}】爆发！`; 
    setTimeout(showNextCard, 800); 
}
function checkGameFail() { if (resources.treasury <= 0) return "国库空虚，王朝溃散"; if (resources.people <= 0) return "民心涣散，王朝覆灭"; if (resources.military <= 0) return "军力薄弱，王朝覆灭"; if (resources.culture <= 0) return "礼乐崩坏"; return null; }

function showNextCard() {
    if (nextCardId === "end_battle" || nextCardId === "end_flee") { calculateEnding(); return; }
    if (nextCardId === "end") {
        if (currentPhase === "POLICY") { startEvolution(); return; }
        if (currentPhase === "CHAR_CREATION") { finishCharacterCreation(); return; }
        if (currentPhase === "SPECIAL_EVENT") { finishSpecialEvent(); return; }
        return;
    }
    let c = nextCardId ? cardMap[nextCardId] : currentDeck[currentCardIndex];
    if (!c) { console.error("Card missing", nextCardId); if(currentPhase==="POLICY") startEvolution(); else finishCharacterCreation(); return; }

    showMask();
    ui.eventTitle.innerText = c.title;
    
    // --- 修改：识别通用的随机结果后缀 ---
    // 如果 ID 以 _gamble_win 或 _gamble_lose 结尾，说明是随机结果
    if (c.id.endsWith("_gamble_win") || c.id.endsWith("_gamble_lose")) {
        // lastGambleData.text 包含了骰子点数信息，这里我们将它稍微润色一下
        // 去掉原本的“大/小”字眼，只保留点数，显得更像命运的审判
        let diceInfo = lastGambleData.text.split('，')[0]; 
        ui.eventDesc.innerText = `命运判词：${diceInfo}。\n\n` + c.desc;
    } else {
        ui.eventDesc.innerText = c.desc;
    }

    ui.txtLeft.innerText = c.left ? c.left.text : "...";
    ui.txtRight.innerText = c.right ? c.right.text : "...";

    ui.swipeCard.style.transition = 'none';
    ui.swipeCard.style.transform = 'translateX(0) rotate(0)';
    ui.swipeCard.offsetTop;
    ui.swipeCard.style.opacity = 1;
    updateCardVisual(0);
}

// 全局变量：存储上次赌博的结果
let lastGambleData = { win: false, value: 0, text: "" };

function handleChoice(d) {
    // --- 1. 优先处理 Intro 阶段 ---
    if (currentPhase === "INTRO") {
        startPolicyPhase();
        return true;
    }

    let c = nextCardId ? cardMap[nextCardId] : currentDeck[currentCardIndex];
    if (!c) return false;
    let ch = d === 'left' ? c.left : c.right;
    if (!ch) return false;

    // --- 2. 新增：处理赌博逻辑 ---
    if (ch.special === "gamble") {
        // 生成随机点数 (两个骰子 1-6)
        let dice1 = Math.floor(Math.random() * 6) + 1;
        let dice2 = Math.floor(Math.random() * 6) + 1;
        let total = dice1 + dice2;
        let isBig = total > 7; // 大于7为大，否则为小
        
        // 判断输赢：玩家选左是押大，选右是押小
        let playerBetBig = (d === 'left');
        let win = (playerBetBig === isBig);

        // 记录结果数据，供下一张卡片显示
        lastGambleData = {
            win: win,
            value: total,
            text: `骰子落定：${dice1} + ${dice2} = ${total}，【${isBig ? '大' : '小'}】！你${win ? '赢了' : '输了'}...`
        };

        // 根据输赢决定下一个节点
        // 如果赢了，去赢钱节点；输了，去输钱节点
        nextCardId = win ? ch.winNext : ch.loseNext;
        
        // 不需要处理 effect，因为输赢节点的 effect 已经写好了
        return true; 
    }

    // --- 3. 正常处理政策/人物逻辑 ---
    if (currentPhase === "POLICY" || currentPhase === "SPECIAL_EVENT" || currentPhase === "CRISIS") {
        for (let k in ch.effect) if (resources[k] !== undefined) {
            resources[k] += ch.effect[k];
            if (resources[k] < 0) resources[k] = 0;
            if (currentPhase === "POLICY") checkBuildingUpgrades(k);
        }
        updateUI();
        let f = checkGameFail();
        if (f) { setTimeout(() => showResult(false, f), 300); clearInterval(gameLoopInterval); return true; }
        let h = checkHighStatFail();
        if (h) { setTimeout(() => showResult(false, h), 300); clearInterval(gameLoopInterval); return true; }
    } else if (currentPhase === "CHAR_CREATION") {
        for (let k in ch.effect) charScores[k] = (charScores[k] || 0) + ch.effect[k];
    }
    nextCardId = ch.nextId || null;
    if (!ch.nextId) currentCardIndex++;
    return true;
}

function finishSpecialEvent() { ui.eventTitle.innerText = "事态平息"; ui.eventDesc.innerText = ""; 
    // 优化：灾害结束 2000ms -> 500ms
    setTimeout(() => { currentPhase = "IDLE"; ui.swipeCard.style.display = 'none'; ui.eventTitle.style.opacity = 0; ui.eventDesc.style.opacity = 0; ui.idlePanel.style.display = 'block'; hideMask(); }, 500); 
}

// --- 滑动逻辑 ---
let isDragging = false, startX = 0, currentX = 0; 
const THRESHOLD = 100;

function setupSwipeEvents() { 
    let c = ui.swipeCard; 
    const options = { passive: false };
    c.addEventListener('touchstart', e => { if(currentPhase!=="IDLE") dragStart(e); }, options);
    c.addEventListener('touchmove', e => { if(currentPhase!=="IDLE") drag(e); }, options);
    c.addEventListener('touchend', e => { if(currentPhase!=="IDLE") dragEnd(e); }, options);
    c.addEventListener('mousedown', e => { if(currentPhase!=="IDLE") dragStart(e); });
    document.addEventListener('mousemove', e => { if(currentPhase!=="IDLE") drag(e); });
    document.addEventListener('mouseup', e => { if(currentPhase!=="IDLE") dragEnd(e); });
}

function dragStart(e) { isDragging = true; startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX; ui.swipeCard.style.transition = 'none'; }
function drag(e) { if (!isDragging) return; e.preventDefault(); currentX = (e.type.includes('mouse') ? e.clientX : e.touches[0].clientX) - startX; ui.swipeCard.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`; updateCardVisual(currentX); }

function dragEnd(e) { 
    if (!isDragging) return; isDragging = false; 
    clearGuessHighlight(); 
    
    if (Math.abs(currentX) > THRESHOLD) { 
        let d = currentX > 0 ? 'right' : 'left'; 
        let flyX = (d === 'right' ? 500 : -500);
        ui.swipeCard.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in'; 
        ui.swipeCard.style.transform = `translateX(${flyX}px) rotate(${d === 'right' ? 20 : -20}deg)`; 
        ui.txtLeft.classList.remove('active');
        ui.txtRight.classList.remove('active');
        
        // 优化：卡片切换延迟 300ms -> 200ms
        setTimeout(() => { ui.swipeCard.style.opacity = 0; }, 150);
        setTimeout(() => { 
            let needNextCard = handleChoice(d); 
            if (needNextCard && currentPhase !== "INTRO") { 
                showNextCard(); 
            } else {
                ui.txtLeft.classList.remove('active');
                ui.txtRight.classList.remove('active');
            }
        }, 200); 
    } else { 
        ui.swipeCard.style.transition = 'transform 0.3s ease-out'; 
        ui.swipeCard.style.transform = 'translateX(0) rotate(0)'; 
        updateCardVisual(0); 
    } 
    currentX = 0; 
}

// --- 核心视觉更新函数 ---
function updateCardVisual(x) { 
    let progress = Math.min(Math.abs(x) / THRESHOLD, 1);
    if (x < -10) { ui.txtLeft.classList.add('active'); ui.txtRight.classList.remove('active'); } else if (x > 10) { ui.txtLeft.classList.remove('active'); ui.txtRight.classList.add('active'); } else { ui.txtLeft.classList.remove('active'); ui.txtRight.classList.remove('active'); }
    let widthPercent = progress * 100; 
    if (x < 0) { ui.barLeft.style.width = widthPercent + '%'; ui.barRight.style.width = '0%'; } else if (x > 0) { ui.barLeft.style.width = '0%'; ui.barRight.style.width = widthPercent + '%'; } else { ui.barLeft.style.width = '0%'; ui.barRight.style.width = '0%'; }
    if (Math.abs(x) > 30 && currentPhase !== "INTRO") { let c = nextCardId ? cardMap[nextCardId] : currentDeck[currentCardIndex]; if(!c) return; if (currentPhase === "POLICY" || currentPhase === "SPECIAL_EVENT" || currentPhase === "CRISIS") { let eff = (x < 0) ? c.left.effect : c.right.effect; clearGuessHighlight(); if(eff) for (let k in eff) highlightRes(k, false); } } else { clearGuessHighlight(); } 
}

function startEvolution() {
    currentPhase = "IDLE"; 
    ui.eventTitle.style.opacity = 0; 
    ui.eventDesc.style.opacity = 0; 
    ui.swipeCard.style.display = 'none'; 

    ui.idlePanel.style.display = 'block'; 
    ui.sideUI.style.display = 'flex'; 
    for(let k in resources) checkBuildingUpgrades(k); 
    recruitSlots = 2; recruitTimer = RECRUIT_COOLDOWN; updateRecruitUI(); 
    hideMask(); 
     }
function tryStartRecruit() { if (recruitSlots <= 0 || currentPhase !== "IDLE") return; recruitSlots--; updateRecruitUI(); currentPhase = "CHAR_CREATION"; let av = characterStories.filter((s, i) => i !== lastStoryIndex); if (!av.length) av = characterStories; const s = av[Math.floor(Math.random() * av.length)]; lastStoryIndex = characterStories.indexOf(s); loadDeck(s.list); nextCardId = s.list[0].id; charScores = {}; ui.swipeCard.style.display = 'flex'; ui.eventTitle.style.opacity = 1; ui.eventDesc.style.opacity = 1; ui.idlePanel.style.display = 'none'; ui.eventTitle.innerText = "命运的齿轮"; ui.eventDesc.innerText = `【${s.name}】\n一段新的人生...`; 
    // 优化：招募开始 2000ms -> 500ms
    setTimeout(showNextCard, 500); 
}

function finishCharacterCreation() { 
    // 1. 统计分数
    let m = 'common', mv = 0; 
    for(let k in charScores) if(charScores[k] > mv) { mv = charScores[k]; m = k; } 
    
    // 2. 判定职业
    let tk = 'farmer', isE = false; 
    if (m === 'literary') tk = mv >= 5 ? 'scholar' : 'teacher'; 
    else if (m === 'martial') tk = mv >= 5 ? 'general' : 'soldier'; 
    else if (m === 'merchant') tk = mv >= 5 ? 'merchant' : 'peddler'; 
    else if (m === 'tech') tk = mv >= 5 ? 'craftsman' : 'farmer'; 
    // --- 新增：修正 common 属性判定 ---
    else if (m === 'common') tk = mv >= 5 ? 'farmer' : 'peddler'; 
    // ------------------------------
    else tk = mv >= 5 ? 'craftsman' : 'farmer'; 

    // 3. 判定是否精英
    if (tk === 'scholar' || tk === 'general' || tk === 'merchant') isE = true; 
    if (tk === 'craftsman' && mv >= 6) isE = true; 
    // 新增：农夫如果分数极高，也可以视为精英（富农/大户）
    if (tk === 'farmer' && mv >= 8) isE = true; 

    // 4. 应用属性
    const td = characterTypes[tk]; 
    let bm = isE ? 1 : 0.5; 
    for(let k in td.bonus) incomeRates[k] += td.bonus[k] * bm; 
    let bb = { culture: 10, people: 10, military: 10, treasury: 10 }; 
    for(let k in bb) resources[k] += bb[k] * (td.bonus[k] ? 2 : 1) * bm; 
    updateUI(); 
    for(let k in resources) checkBuildingUpgrades(k); 
    spawnCharacterEntity(td.icon, isE); 
    
    ui.eventTitle.innerText = "大幕落下"; 
    ui.eventDesc.innerText = `一段关于${td.name} 的故事，出现在了这片土地上。`; 
    
    setTimeout(() => { 
        currentPhase = "IDLE"; 
        ui.swipeCard.style.display = 'none'; 
        ui.eventTitle.style.opacity = 0; 
        ui.eventDesc.style.opacity = 0; 
        ui.txtLeft.classList.remove('active'); 
        ui.txtRight.classList.remove('active'); 
        ui.idlePanel.style.display = 'block'; 
        updateRecruitUI(); hideMask(); 
    }, 800); 
}

function calculateEnding() { let w = false, t = ""; if (nextCardId === "end_battle") { if (resources.military >= 50 && resources.people >= 40) { w = true; t = "御驾亲征，大破叛军！\n大唐国祚得以延续百年。"; } else { w = false; t = "军心涣散，溃败。"; } } else if (nextCardId === "end_flee") { if (resources.treasury >= 50 || resources.people >= 60) { w = true; t = "忍辱负重，退守蜀地。"; } else { w = false; t = "逃亡路上，禁军哗变。"; } } else { if (resources.military >= 60) { w = true; t = "凭借强大的军力，艰难平叛。"; } else { w = false; t = "无力回天。"; } } showResult(w, t); }

function spawnCharacterEntity(icon, isE) { const ct = document.getElementById('buildings-container'), rc = ct.getBoundingClientRect(); const el = document.createElement('div'); el.className = 'character-entity'; if (isE) el.classList.add('character-elite'); if (typeof icon === 'string' && icon.startsWith('http')) { const img = document.createElement('img'); img.src = icon; img.style.cssText = 'width:100%;height:100%;object-fit:cover'; el.appendChild(img); } else el.innerText = icon; const x = Math.random() * (rc.width - 30), y = Math.random() * (rc.height * 0.4) + (rc.height * 0.35); el.style.left = x + 'px'; el.style.top = y + 'px'; ct.appendChild(el); characters.push({ el, x, y, tx: x, ty: y, sp: 10 + Math.random() * 10, b: { w: rc.width, h: rc.height } }); }
function updateCharacterPositions(dt) { characters.forEach(c => { let dx = c.tx - c.x, dy = c.ty - c.y, ds = Math.sqrt(dx*dx + dy*dy); if (ds < 5) { c.tx = Math.random() * (c.b.w - 30); c.ty = Math.random() * (c.b.h * 0.4) + (c.b.h * 0.35); } else { c.x += (dx / ds) * c.sp * dt; c.y += (dy / ds) * c.sp * dt; c.el.style.left = c.x + 'px'; c.el.style.top = c.y + 'px'; } }); }
function showResult(w, t) { ui.overlay.style.display = 'flex'; ui.resultTitle.innerText = w ? "恭喜您！即将步入下一阶段的文明（等待开发）" : "很遗憾，这次的文明之旅到此结束"; ui.resultDesc.innerText = t; ui.resultDesc.style.color = w ? "#5cb85c" : "#d9534f"; }

function createSnowflake() {
    const flake = document.createElement('div');
    flake.classList.add('snowflake');
    
    // 1. 随机大小 (10px - 18px)
    const size = Math.random() * 8 + 10 + 'px';
    flake.style.fontSize = size;
    
    // 2. 随机位置 (left: 0% - 100%)
    // 确保是从屏幕水平方向随机位置开始
    flake.style.left = Math.random() * 100 + '%'; 
    
    // 3. 随机下落时间 (10秒 - 20秒)，数值越小下落越快
    const duration = Math.random() * 10 + 10;
    flake.style.animationDuration = duration + 's';
    
    // 4. 随机透明度
    flake.style.opacity = Math.random() * 0.4 + 0.4;

    // 5. 随机雪花符号
    const snowSymbols = ['❄', '❅', '❆', '✻', '✼']; 
    flake.innerText = snowSymbols[Math.floor(Math.random() * snowSymbols.length)];

    // 添加到游戏容器
    const container = document.getElementById('game-container');
    container.appendChild(flake);

    // 动画结束后移除
    setTimeout(() => {
        flake.remove();
    }, duration * 1000);
}

// 开启下雪
function startSnow() {
   
    // 循环生成
    setInterval(() => {
        createSnowflake();
    }, 800); // 每800毫秒生成一片
}

initGame();