import { getPopularServicesByCategory } from "@/api/services";
import StatePanel from "@/components/common/StatePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FreelancerCard from "@/features/freelancers/FreelancerCard";
import ServiceCard from "@/features/services/ServiceCard";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion, MotionConfig } from "framer-motion";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Atom,
  Award,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle,
  Clock,
  Code2,
  CreditCard,
  FileCheck,
  FlaskConical,
  GraduationCap,
  Landmark,
  Leaf,
  MessageSquare,
  RotateCcw,
  Scale,
  Search,
  Settings2,
  Shield,
  Star,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import "./home.css";

const textReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Section({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotionPreference();
  const [entered, setEntered] = useState(false);
  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? "visible" : undefined}
      whileInView="visible"
      variants={{
        hidden: { opacity: 0, y: 28 },
        visible: { opacity: 1, y: 0 },
      }}
      viewport={{ once: true, amount: 0.08, margin: "0px 0px -32px 0px" }}
      onViewportEnter={() => setEntered(true)}
      data-revealed={entered || reducedMotion ? "true" : undefined}
      transition={{
        duration: reducedMotion ? 0 : 0.65,
        delay: reducedMotion ? 0 : delay,
        staggerChildren: reducedMotion ? 0 : 0.09,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const categoryIcons = {
  mathematics: Calculator,
  economics: TrendingUp,
  informatics: Code2,
  law: Scale,
  history: Landmark,
  psychology: Brain,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  engineering: Settings2,
  management: Users,
  other: BookOpen,
};

const categoryDescriptions: Record<ServiceCategory, string> = {
  mathematics: "От анализа до статистики",
  economics: "Расчёты и исследования",
  informatics: "Код и цифровые проекты",
  law: "Право и разбор практики",
  history: "Источники и исследования",
  psychology: "Теория и поведение",
  physics: "Задачи и эксперименты",
  chemistry: "Формулы и лабораторные",
  biology: "От клетки до экосистемы",
  engineering: "Чертежи и расчёты",
  management: "Процессы и стратегии",
  other: "Другие учебные задачи",
};

// A concise overview of existing platform capabilities.
const highlights = [
  { icon: Users, value: "Профили", label: "опыт, портфолио и услуги" },
  { icon: BookOpen, value: "Каталог", label: "направления, цены и сроки" },
  { icon: Star, value: "Отзывы", label: "после завершённых заказов" },
  { icon: MessageSquare, value: "Чат", label: "для обсуждения деталей" },
];

// ─── How it works data ─────────────────────────────────────────────────────────
const studentSteps = [
  {
    icon: Search,
    num: "01",
    title: "Найдите услугу",
    description:
      "Выберите направление и сравните предложения по цене, срокам и отзывам.",
    badge: "Бесплатно",
  },
  {
    icon: MessageSquare,
    num: "02",
    title: "Обсудите детали",
    description:
      "Напишите автору. Согласуйте тему, требования и подходящий пакет услуг.",
    badge: "Профили и отзывы",
  },
  {
    icon: CreditCard,
    num: "03",
    title: "Подтвердите заказ",
    description:
      "Дождитесь ответа автора в течение 24 часов, затем оплатите согласованный заказ.",
    badge: "После ответа автора",
  },
  {
    icon: FileCheck,
    num: "04",
    title: "Получите результат",
    description:
      "Проверьте работу, запросите включённые в пакет правки и завершите заказ.",
    badge: "Проверка результата",
  },
];

const freelancerSteps = [
  {
    icon: Upload,
    num: "01",
    title: "Создайте профиль",
    description:
      "Расскажите о специализации и добавьте примеры работ, чтобы заказчики узнали вас.",
    badge: "Профиль и портфолио",
  },
  {
    icon: BookOpen,
    num: "02",
    title: "Опубликуйте услугу",
    description:
      "Опишите, с чем помогаете. Укажите стоимость, сроки и состав каждого пакета.",
    badge: "Полный контроль цен",
  },
  {
    icon: Clock,
    num: "03",
    title: "Выполните заказ",
    description:
      "Обсудите детали в чате, примите заказ и передайте готовую работу через платформу.",
    badge: "Встроенный чат",
  },
  {
    icon: Award,
    num: "04",
    title: "Развивайте репутацию",
    description:
      "Следите за расчётами в кабинете. Отзывы о завершённых заказах формируют ваш рейтинг.",
    badge: "Статус в кабинете",
  },
];

const platformFeatures = [
  {
    icon: Shield,
    title: "Понятные условия",
    desc: "Стоимость, состав пакета и статус оплаты — в карточке заказа.",
  },
  {
    icon: RotateCcw,
    title: "Место для доработок",
    desc: "Количество включённых правок известно до начала работы.",
  },
  {
    icon: Star,
    title: "Отзывы по делу",
    desc: "Оценки от заказчиков после завершения работы.",
  },
  {
    icon: CheckCircle,
    title: "Автор, который подходит",
    desc: "Специализация, портфолио и услуги помогают сделать выбор.",
  },
  {
    icon: Clock,
    title: "Сроки перед глазами",
    desc: "Дедлайн и его изменения сохраняются в заказе.",
  },
  {
    icon: MessageSquare,
    title: "Есть к кому обратиться",
    desc: "Отправьте вопрос через раздел поддержки или на почту.",
  },
];

export default function HomePage() {
  const reducedMotion = useReducedMotionPreference();
  const {
    data: popularGroups,
    isLoading: popularLoading,
    isError: popularError,
    isFetching: popularFetching,
    refetch: refetchPopular,
  } = useQuery({
    queryKey: ["popular-services", 3],
    queryFn: () => getPopularServicesByCategory(3),
  });
  const popularByCategory = popularGroups ?? [];
  const topFreelancers = Array.from(
    new Map(
      popularByCategory
        .flatMap((group) => group.services)
        .filter((service) => service.freelancer)
        .map((service) => [service.freelancer.id, service.freelancer] as const),
    ).values(),
  ).slice(0, 4);

  return (
    <MotionConfig
      reducedMotion={reducedMotion ? "always" : "never"}
      transition={{
        duration: reducedMotion ? 0 : 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="home-page">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="container-custom home-hero-grid">
            <Section className="home-hero-copy">
              <span className="home-eyebrow">
                <GraduationCap size={18} /> Учебные задачи. Живые эксперты.
              </span>
              <motion.h1 variants={textReveal} id="home-title">
                Ваша задача.
                <br />
                <span>Сильный автор.</span>
              </motion.h1>
              <motion.p variants={textReveal} className="home-lead">
                От первой задачи до диплома. Найдите человека, который
                разбирается в вашей теме, и договоритесь о работе напрямую.
              </motion.p>
              <div className="home-actions">
                <Link
                  to="/services"
                  className="home-button home-button-primary"
                >
                  Найти исполнителя <ArrowUpRight size={19} />
                </Link>
                <Link
                  to="/register"
                  className="home-button home-button-secondary"
                >
                  Стать исполнителем
                </Link>
              </div>
              <div className="home-trust">
                <span>
                  <MessageSquare size={16} /> Прямой диалог с автором
                </span>
                <span>
                  <Star size={16} /> Отзывы и рейтинги
                </span>
              </div>
            </Section>
            <motion.aside
              className="home-visual"
              aria-label="Быстрый переход"
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.7,
                delay: reducedMotion ? 0 : 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="home-visual-scene">
                <img
                  className="home-visual-image"
                  src="/images/study-editorial.png"
                  alt="Ноутбук и открытая тетрадь с математическими записями на рабочем столе"
                  width={1254}
                  height={1254}
                  fetchPriority="high"
                />
                <span className="home-visual-label">МЕСТО ДЛЯ ВАШИХ ИДЕЙ</span>
                <a href="#how-it-works" className="home-visual-note">
                  <span className="home-note-icon">
                    <FileCheck size={23} />
                  </span>
                  <span>
                    <strong>Всё начинается с одного шага</strong>
                    <small>Как устроена работа на платформе</small>
                  </span>
                  <ArrowUpRight size={20} />
                </a>
              </div>
              <div className="home-visual-footer">
                <span>Ваша тема. Ваш темп.</span>
                <span>Ваш автор.</span>
              </div>
            </motion.aside>
          </div>
          <div className="container-custom">
            <div className="home-highlights">
              {highlights.map(({ icon: Icon, value, label }, index) => (
                <Section
                  key={value}
                  className="home-highlight"
                  delay={index * 0.06}
                >
                  <span className="home-highlight-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <motion.h3 variants={textReveal}>{value}</motion.h3>
                    <motion.p variants={textReveal}>{label}</motion.p>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </section>

        <section
          className="container-custom home-section"
          aria-labelledby="categories-title"
        >
          <Section>
            <div className="home-section-heading">
              <div>
                <motion.span variants={textReveal} className="home-kicker">
                  НАЙДИТЕ СВОЁ НАПРАВЛЕНИЕ
                </motion.span>
                <motion.h2 variants={textReveal} id="categories-title">
                  Какая у вас задача?
                </motion.h2>
                <motion.p variants={textReveal}>
                  От точных наук до творческих дисциплин.
                </motion.p>
              </div>
              <Link to="/services" className="home-text-link">
                Все услуги <ArrowRight size={17} />
              </Link>
            </div>
            <div className="home-categories">
              {(
                Object.entries(SERVICE_CATEGORIES) as [
                  ServiceCategory,
                  string,
                ][]
              )
                .slice(0, 10)
                .map(([value, label], index) => {
                  const Icon = categoryIcons[value];
                  return (
                    <Section
                      key={value}
                      className="home-category-wrap"
                      delay={Math.min(index * 0.035, 0.2)}
                    >
                      <Link
                        to="/services"
                        search={{ category: value }}
                        className="home-category"
                      >
                        <span
                          className={
                            "home-category-icon home-category-" + value
                          }
                        >
                          <Icon size={24} strokeWidth={1.7} />
                        </span>
                        <span className="home-category-copy">
                          <strong>{label}</strong>
                          <small>{categoryDescriptions[value]}</small>
                        </span>
                        <ArrowUpRight
                          size={16}
                          className="home-category-arrow"
                        />
                      </Link>
                    </Section>
                  );
                })}
            </div>
          </Section>
        </section>

        <section
          className="home-section home-surface"
          aria-labelledby="popular-title"
        >
          <div className="container-custom">
            <Section className="home-section-heading">
              <div>
                <motion.span variants={textReveal} className="home-kicker">
                  ПРЕДЛОЖЕНИЯ ПО НАПРАВЛЕНИЯМ
                </motion.span>
                <motion.h2 variants={textReveal} id="popular-title">
                  Популярные услуги
                </motion.h2>
                <motion.p variants={textReveal}>
                  Подборка услуг из разных разделов каталога.
                </motion.p>
              </div>
              <Link to="/services" className="home-text-link">
                Весь каталог <ArrowRight size={17} />
              </Link>
            </Section>
            {popularLoading ? (
              <div
                className="home-services-grid"
                role="status"
                aria-label="Загружаем популярные услуги"
              >
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="home-skeleton" />
                ))}
              </div>
            ) : popularError ? (
              <StatePanel
                title="Не удалось загрузить популярные услуги"
                description="Остальные разделы доступны. Можно повторить запрос или открыть общий каталог."
                onRetry={() => void refetchPopular()}
                retrying={popularFetching}
                link={{ label: "Открыть каталог", to: "/services" }}
              />
            ) : popularByCategory.length > 0 ? (
              <div className="home-service-groups">
                {popularByCategory.map((group) => {
                  const Icon = categoryIcons[group.category] ?? BookOpen;
                  return (
                    <Section
                      key={group.category}
                      className="home-service-group"
                    >
                      <div className="home-group-heading">
                        <Icon size={20} />
                        <motion.h3 variants={textReveal}>
                          {SERVICE_CATEGORIES[group.category]}
                        </motion.h3>
                        <span>Популярное в разделе</span>
                      </div>
                      <div className="home-services-grid">
                        {group.services.map((service, i) => (
                          <ServiceCard
                            key={service.id}
                            service={service}
                            index={i}
                            showTopBadge={i === 0}
                            interactive
                          />
                        ))}
                      </div>
                    </Section>
                  );
                })}
              </div>
            ) : (
              <StatePanel
                variant="empty"
                title="Популярные услуги скоро появятся"
                description="Пока можно посмотреть все предложения в каталоге."
                link={{ label: "Открыть каталог", to: "/services" }}
              />
            )}
          </div>
        </section>

        <section
          id="how-it-works"
          className="container-custom home-section"
          aria-labelledby="how-title"
        >
          <Tabs defaultValue="student" className="home-process">
            <Section className="home-section-heading home-how-heading">
              <div>
                <motion.span variants={textReveal} className="home-kicker">
                  ВСЁ ПРОЩЕ, ЧЕМ КАЖЕТСЯ
                </motion.span>
                <motion.h2 variants={textReveal} id="how-title">
                  Как это работает
                </motion.h2>
                <motion.p variants={textReveal}>
                  От первого «Здравствуйте» до готовой работы. Всё
                  последовательно и в одном месте.
                </motion.p>
              </div>
              <TabsList
                className="home-tabs"
                aria-label="Как пользоваться платформой"
              >
                <TabsTrigger value="student">Я заказчик</TabsTrigger>
                <TabsTrigger value="freelancer">Я исполнитель</TabsTrigger>
              </TabsList>
            </Section>
            {(["student", "freelancer"] as const).map((tab) => (
              <TabsContent value={tab} key={tab}>
                <div className="home-steps">
                  <motion.span
                    className="home-steps-line"
                    aria-hidden="true"
                    initial={reducedMotion ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.9,
                      ease: "easeOut",
                    }}
                  />
                  {(tab === "student" ? studentSteps : freelancerSteps).map(
                    (step, index) => (
                      <Section
                        key={step.num}
                        className={`home-step${index === 0 ? " home-step-first" : ""}`}
                        delay={index * 0.065}
                      >
                        <div className="home-step-top">
                          <span className="home-step-icon">
                            <step.icon size={23} />
                          </span>
                          <span className="home-step-number" aria-hidden="true">
                            {step.num}
                          </span>
                        </div>
                        <span className="home-step-label">ШАГ {step.num}</span>
                        <motion.h3 variants={textReveal}>
                          {step.title}
                        </motion.h3>
                        <motion.p variants={textReveal}>
                          {step.description}
                        </motion.p>
                        <span className="home-step-badge">
                          <CheckCircle size={13} />
                          {step.badge}
                        </span>
                      </Section>
                    ),
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <div className="home-benefits">
            <Section className="home-benefits-intro">
              <motion.span variants={textReveal} className="home-kicker">
                ПРОДУМАНО ДЛЯ ВАС
              </motion.span>
              <motion.h2 variants={textReveal}>
                Всё важное.
                <br />
                <span>В одном месте.</span>
              </motion.h2>
              <motion.p variants={textReveal}>
                Всё для удобной совместной работы — от выбора автора до
                последних правок.
              </motion.p>
              <Link to="/register" className="home-text-link">
                Начать бесплатно <ArrowUpRight size={18} />
              </Link>
            </Section>
            <div className="home-features">
              {platformFeatures.map((feat, index) => (
                <Section
                  key={feat.title}
                  className="home-feature"
                  delay={(index % 2) * 0.07}
                >
                  <span className="home-feature-icon">
                    <feat.icon size={21} />
                  </span>
                  <div>
                    <motion.h3 variants={textReveal}>{feat.title}</motion.h3>
                    <motion.p variants={textReveal}>{feat.desc}</motion.p>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </section>

        <section
          className="home-section home-surface"
          aria-labelledby="freelancers-title"
        >
          <div className="container-custom">
            <Section className="home-section-heading">
              <div>
                <motion.span variants={textReveal} className="home-kicker">
                  ЗА КАЖДОЙ РАБОТОЙ — ЧЕЛОВЕК
                </motion.span>
                <motion.h2 variants={textReveal} id="freelancers-title">
                  Исполнители на платформе
                </motion.h2>
                <motion.p variants={textReveal}>
                  Сравнивайте профили, услуги и отзывы.
                </motion.p>
              </div>
              <Link to="/freelancers" className="home-text-link">
                Все исполнители <ArrowRight size={17} />
              </Link>
            </Section>
            {popularError ? (
              <StatePanel
                compact
                title="Не удалось загрузить подборку исполнителей"
                onRetry={() => void refetchPopular()}
                retrying={popularFetching}
                link={{ label: "Все исполнители", to: "/freelancers" }}
              />
            ) : topFreelancers.length > 0 ? (
              <div className="home-freelancers-grid">
                {topFreelancers.map((fl, i) => (
                  <Section
                    key={fl.id}
                    className="home-freelancer-wrap"
                    delay={i * 0.06}
                  >
                    <FreelancerCard freelancer={fl} index={i} />
                  </Section>
                ))}
              </div>
            ) : popularLoading ? (
              <div
                className="home-freelancers-grid"
                role="status"
                aria-label="Загружаем исполнителей"
              >
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="home-skeleton" />
                ))}
              </div>
            ) : (
              <StatePanel
                variant="empty"
                compact
                title="Подборка исполнителей формируется"
                description="Исполнители появятся здесь после первых выполненных заказов."
              />
            )}
          </div>
        </section>

        <section className="container-custom home-section">
          <Section className="home-cta">
            <div>
              <motion.span variants={textReveal} className="home-kicker">
                СЛЕДУЮЩИЙ ШАГ — ВАШ
              </motion.span>
              <motion.h2 variants={textReveal}>
                Есть задача?
                <br />
                Давайте начнём.
              </motion.h2>
              <motion.p variants={textReveal}>
                Выберите исполнителя или предложите свои услуги.
                <br className="hidden sm:block" /> Регистрация на платформе
                бесплатная.
              </motion.p>
            </div>
            <div className="home-cta-actions">
              <Link to="/register" className="home-button home-button-primary">
                Зарегистрироваться <ArrowUpRight size={19} />
              </Link>
              <Link to="/services" className="home-cta-link">
                Сначала посмотреть услуги <ArrowRight size={17} />
              </Link>
            </div>
          </Section>
        </section>
      </div>
    </MotionConfig>
  );
}
