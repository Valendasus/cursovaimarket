"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    const freelancersData = [
        {
            email: 'ivan@cursovai.ru',
            name: 'Иван Петров',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ivan',
            profile: {
                bio: 'Кандидат экономических наук. 7 лет пишу курсовые по экономике и менеджменту. Гарантирую уникальность и антиплагиат от 85%. Всегда на связи, выполняю в срок.',
                rating: 4.9,
                reviewsCount: 143,
                completedOrders: 189,
                specializations: ['economics', 'management'],
                isVerified: true,
                responseTime: '~1 час',
                location: 'Москва',
            },
        },
        {
            email: 'maria@cursovai.ru',
            name: 'Мария Котова',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
            profile: {
                bio: 'Программист с опытом в академическом письме. Специализируюсь на информатике, алгоритмах и ИИ. Чистый код и понятные объяснения.',
                rating: 4.8,
                reviewsCount: 97,
                completedOrders: 124,
                specializations: ['informatics'],
                isVerified: true,
                responseTime: '~2 часа',
                location: 'Санкт-Петербург',
            },
        },
        {
            email: 'alex@cursovai.ru',
            name: 'Александр Новиков',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
            profile: {
                bio: 'Юрист-практик. Пишу курсовые по всем отраслям права. Строгое соответствие актуальному законодательству.',
                rating: 4.7,
                reviewsCount: 68,
                completedOrders: 82,
                specializations: ['law'],
                isVerified: true,
                responseTime: '~3 часа',
                location: 'Екатеринбург',
            },
        },
        {
            email: 'elena@cursovai.ru',
            name: 'Елена Смирнова',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena',
            profile: {
                bio: 'Математик, преподаватель вуза. Высшая математика, теория вероятностей, математическая статистика. Идеальное оформление по ГОСТ.',
                rating: 5.0,
                reviewsCount: 54,
                completedOrders: 61,
                specializations: ['mathematics', 'physics'],
                isVerified: true,
                responseTime: '~1 час',
                location: 'Новосибирск',
            },
        },
    ];
    const hashedPass = await bcrypt.hash('Password123!', 10);
    const freelancers = [];
    for (const fd of freelancersData) {
        const user = await prisma.user.upsert({
            where: { email: fd.email },
            update: {},
            create: {
                email: fd.email,
                password: hashedPass,
                name: fd.name,
                avatar: fd.avatar,
                role: 'FREELANCER',
                profile: { create: fd.profile },
            },
        });
        freelancers.push({ id: user.id, name: user.name });
        console.log(`  ✓ Freelancer: ${user.name} (${user.id})`);
    }
    const servicesData = [
        {
            freelancerIdx: 0,
            title: 'Напишу курсовую по экономике и финансам',
            description: 'Профессиональное написание курсовых работ по экономике, финансам и менеджменту. Уникальность от 85%, список литературы, правильное оформление по ГОСТ. Опыт более 7 лет, выполнено 189+ заказов.',
            category: client_1.ServiceCategory.ECONOMICS,
            level: client_1.ServiceLevel.BACHELOR,
            tags: ['экономика', 'финансы', 'ГОСТ', 'антиплагиат'],
            thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop',
            rating: 4.9,
            reviewsCount: 87,
            ordersCount: 134,
            isFeatured: true,
            packages: [
                {
                    name: 'Базовый',
                    price: 350000,
                    deliveryDays: 14,
                    revisions: 1,
                    features: ['До 30 страниц', 'Уникальность 80%+', '1 правка'],
                },
                {
                    name: 'Стандарт',
                    price: 550000,
                    deliveryDays: 10,
                    revisions: 3,
                    features: [
                        'До 50 страниц',
                        'Уникальность 85%+',
                        '3 правки',
                        'Презентация',
                    ],
                },
                {
                    name: 'Премиум',
                    price: 850000,
                    deliveryDays: 7,
                    revisions: -1,
                    features: [
                        'До 70 страниц',
                        'Уникальность 90%+',
                        'Безлимит правок',
                        'Презентация',
                        'Доклад',
                    ],
                },
            ],
        },
        {
            freelancerIdx: 0,
            title: 'Курсовая по менеджменту и управлению',
            description: 'Пишу курсовые работы по менеджменту, стратегическому управлению, HR и теории организаций. Академический стиль, актуальные источники, оформление по ГОСТ.',
            category: client_1.ServiceCategory.MANAGEMENT,
            level: client_1.ServiceLevel.MASTER,
            tags: ['менеджмент', 'управление', 'стратегия'],
            thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=500&fit=crop',
            rating: 4.8,
            reviewsCount: 42,
            ordersCount: 55,
            isFeatured: false,
            packages: [
                {
                    name: 'Базовый',
                    price: 400000,
                    deliveryDays: 12,
                    revisions: 1,
                    features: ['До 35 страниц', 'Уникальность 80%+', '1 правка'],
                },
                {
                    name: 'Стандарт',
                    price: 650000,
                    deliveryDays: 9,
                    revisions: 3,
                    features: ['До 55 страниц', 'Уникальность 85%+', '3 правки'],
                },
                {
                    name: 'Премиум',
                    price: 950000,
                    deliveryDays: 6,
                    revisions: -1,
                    features: [
                        'До 80 страниц',
                        'Уникальность 90%+',
                        'Безлимит правок',
                        'Презентация',
                    ],
                },
            ],
        },
        {
            freelancerIdx: 1,
            title: 'Курсовая по информатике, алгоритмам и программированию',
            description: 'Пишу курсовые по информатике, алгоритмам, базам данных, web-разработке и ИИ. Работающий код + пояснительная записка. Уникальность 90%+.',
            category: client_1.ServiceCategory.INFORMATICS,
            level: client_1.ServiceLevel.BACHELOR,
            tags: ['информатика', 'программирование', 'алгоритмы', 'ИИ'],
            thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=500&fit=crop',
            rating: 4.8,
            reviewsCount: 61,
            ordersCount: 89,
            isFeatured: true,
            packages: [
                {
                    name: 'Базовый',
                    price: 500000,
                    deliveryDays: 10,
                    revisions: 1,
                    features: ['До 30 страниц', 'Код + пояснения', '1 правка'],
                },
                {
                    name: 'Стандарт',
                    price: 800000,
                    deliveryDays: 7,
                    revisions: 3,
                    features: ['До 50 страниц', 'Рабочий код', '3 правки', 'Тесты'],
                },
                {
                    name: 'Премиум',
                    price: 1200000,
                    deliveryDays: 5,
                    revisions: -1,
                    features: [
                        'До 70 страниц',
                        'Полная документация',
                        'Безлимит правок',
                        'Презентация',
                    ],
                },
            ],
        },
        {
            freelancerIdx: 2,
            title: 'Курсовая по праву — гражданское, уголовное, конституционное',
            description: 'Курсовые работы по всем отраслям права. Актуальное законодательство, судебная практика, ссылки на первоисточники. Уникальность от 85%, оформление по ГОСТ.',
            category: client_1.ServiceCategory.LAW,
            level: client_1.ServiceLevel.BACHELOR,
            tags: ['право', 'юриспруденция', 'законодательство'],
            thumbnail: 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800&h=500&fit=crop',
            rating: 4.7,
            reviewsCount: 35,
            ordersCount: 47,
            isFeatured: true,
            packages: [
                {
                    name: 'Базовый',
                    price: 450000,
                    deliveryDays: 12,
                    revisions: 1,
                    features: ['До 30 страниц', 'Уникальность 80%+', '1 правка'],
                },
                {
                    name: 'Стандарт',
                    price: 700000,
                    deliveryDays: 9,
                    revisions: 3,
                    features: ['До 50 страниц', 'Судебная практика', '3 правки'],
                },
                {
                    name: 'Премиум',
                    price: 1000000,
                    deliveryDays: 6,
                    revisions: -1,
                    features: [
                        'До 70 страниц',
                        'Анализ практики',
                        'Безлимит правок',
                        'Презентация',
                    ],
                },
            ],
        },
        {
            freelancerIdx: 3,
            title: 'Курсовая по высшей математике и статистике',
            description: 'Высшая математика, теория вероятностей, математическая статистика, дискретная математика. Строгие доказательства, правильное оформление формул по ГОСТ.',
            category: client_1.ServiceCategory.MATHEMATICS,
            level: client_1.ServiceLevel.BACHELOR,
            tags: ['математика', 'статистика', 'теорвер', 'ГОСТ'],
            thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=500&fit=crop',
            rating: 5.0,
            reviewsCount: 29,
            ordersCount: 38,
            isFeatured: true,
            packages: [
                {
                    name: 'Базовый',
                    price: 400000,
                    deliveryDays: 10,
                    revisions: 1,
                    features: ['До 25 страниц', 'Все выкладки', '1 правка'],
                },
                {
                    name: 'Стандарт',
                    price: 650000,
                    deliveryDays: 7,
                    revisions: 3,
                    features: ['До 45 страниц', 'Подробные доказательства', '3 правки'],
                },
                {
                    name: 'Премиум',
                    price: 950000,
                    deliveryDays: 5,
                    revisions: -1,
                    features: [
                        'До 65 страниц',
                        'Чертежи и графики',
                        'Безлимит правок',
                        'Презентация',
                    ],
                },
            ],
        },
        {
            freelancerIdx: 3,
            title: 'Курсовая по физике — механика, электродинамика, термодинамика',
            description: 'Курсовые по общей физике: механика, термодинамика, электродинамика, оптика, квантовая физика. Правильные формулы, расчёты, оформление.',
            category: client_1.ServiceCategory.PHYSICS,
            level: client_1.ServiceLevel.SPECIALIST,
            tags: ['физика', 'механика', 'электродинамика'],
            thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&h=500&fit=crop',
            rating: 4.9,
            reviewsCount: 18,
            ordersCount: 23,
            isFeatured: false,
            packages: [
                {
                    name: 'Базовый',
                    price: 420000,
                    deliveryDays: 10,
                    revisions: 1,
                    features: ['До 25 страниц', 'Расчёты + вывод', '1 правка'],
                },
                {
                    name: 'Стандарт',
                    price: 680000,
                    deliveryDays: 7,
                    revisions: 3,
                    features: ['До 40 страниц', 'Графики', '3 правки'],
                },
                {
                    name: 'Премиум',
                    price: 1000000,
                    deliveryDays: 5,
                    revisions: -1,
                    features: [
                        'До 60 страниц',
                        'Полный анализ',
                        'Безлимит правок',
                        'Презентация',
                    ],
                },
            ],
        },
    ];
    const freelancerIds = freelancers.map(f => f.id);
    const oldPackages = await prisma.servicePackage.findMany({
        where: { service: { freelancerId: { in: freelancerIds } } },
        select: { id: true },
    });
    const oldPackageIds = oldPackages.map(p => p.id);
    if (oldPackageIds.length) {
        const oldOrders = await prisma.order.findMany({
            where: { packageId: { in: oldPackageIds } },
            select: { id: true },
        });
        const oldOrderIds = oldOrders.map(o => o.id);
        if (oldOrderIds.length) {
            await prisma.review.deleteMany({
                where: { orderId: { in: oldOrderIds } },
            });
            await prisma.order.deleteMany({ where: { id: { in: oldOrderIds } } });
        }
    }
    await prisma.service.deleteMany({
        where: { freelancerId: { in: freelancerIds } },
    });
    for (const sd of servicesData) {
        const freelancer = freelancers[sd.freelancerIdx];
        const { freelancerIdx, packages, ...serviceFields } = sd;
        const service = await prisma.service.create({
            data: {
                ...serviceFields,
                freelancerId: freelancer.id,
                packages: { create: packages },
            },
        });
        console.log(`  ✓ Service: "${service.title.slice(0, 40)}..."`);
    }
    await prisma.user.upsert({
        where: { email: 'student@cursovai.ru' },
        update: {},
        create: {
            email: 'student@cursovai.ru',
            password: hashedPass,
            name: 'Тестовый Студент',
            role: 'STUDENT',
        },
    });
    console.log('  ✓ Demo student: student@cursovai.ru');
    console.log('\n✅ Seed completed!');
    console.log('   Login credentials (all): Password123!');
    console.log('   Freelancers: ivan@cursovai.ru, maria@cursovai.ru, alex@cursovai.ru, elena@cursovai.ru');
    console.log('   Student: student@cursovai.ru');
}
main()
    .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map